const fs = require('fs');
const path = require('path');
const {
    getGeopasToken,
    decodeGeopasAffinity,
    getChatDom,
    getChatUri,
    reauthWithSSID
} = require('../../utils/riotAuth.js');
const { RiotChatClient } = require('../../utils/riotXmpp.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'addfriend',
    description: 'Envia um pedido de amizade da conta Riot ativa para um Riot ID (Nome#TAG).',
    options: [
        {
            name: 'riot_id',
            description: 'Nome#TAG do jogador na Riot Games (Ex: Invocador#BR1)',
            type: 3,
            required: true
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // ── 1. Carregar contas vinculadas ──────────────────────────────────
        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        let accounts = {};
        if (fs.existsSync(accountsPath)) {
            try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch (e) {}
        }

        const availableAccounts = Object.keys(accounts);
        if (availableAccounts.length === 0) {
            return interaction.editReply({
                content: '❌ Nenhuma conta Riot vinculada encontrada. Use `/link` para vincular uma conta Riot primeiro.'
            });
        }

        // ── 2. Selecionar conta ativa ──────────────────────────────────────
        // Prioridade: sessão do usuário (definida via /login) → primeira conta da lista
        const userSession = global.userStoreSessions ? global.userStoreSessions.get(interaction.user.id) : null;
        let accountName = (userSession && userSession.accountName) ? userSession.accountName : availableAccounts[0];
        if (!accounts[accountName]) accountName = availableAccounts[0];
        let acc = accounts[accountName];

        if (!acc || !acc.accessToken) {
            return interaction.editReply({
                content: '❌ A conta ativa não possui token de acesso. Use `/login` para selecionar uma conta válida.'
            });
        }

        // ── 3. Parsear o Riot ID informado ────────────────────────────────
        const rawTarget = interaction.options.getString('riot_id').trim();
        let name = rawTarget;
        let tag = 'BR1';

        if (rawTarget.includes('#')) {
            const parts = rawTarget.split('#');
            name = parts[0].trim();
            tag = (parts[1] || 'BR1').trim();
        }

        if (!name) {
            return interaction.editReply({ content: '❌ Riot ID inválido. Use o formato `Nome#TAG` (ex: Invocador#BR1).' });
        }

        // ── 4. Renovar token via SSID se disponível ───────────────────────
        if (acc.ssid) {
            try {
                const renewed = await reauthWithSSID(acc.ssid);
                if (renewed && renewed.accessToken) {
                    acc.accessToken = renewed.accessToken;
                    if (renewed.idToken) acc.idToken = renewed.idToken;
                    // Limpar tokens de chat para forçar renovação
                    delete acc.geopasToken;
                    delete acc.chatUri;
                    delete acc.chatDom;
                    accounts[accountName] = acc;
                    try { fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2)); } catch (e) {}
                }
            } catch (e) {
                console.warn('[AddFriend] Aviso: não foi possível renovar token via SSID:', e.message);
            }
        }

        // ── 5. Obter tokens de chat XMPP (Geopas) ────────────────────────
        if (!acc.geopasToken || !acc.chatUri || !acc.chatDom) {
            try {
                const geopasToken = await getGeopasToken(acc.accessToken);
                if (!geopasToken) throw new Error('Token Geopas nulo');
                acc.geopasToken = geopasToken;
                acc.affinity = decodeGeopasAffinity(geopasToken);
                acc.chatDom = getChatDom(acc.affinity);
                acc.chatUri = getChatUri(acc.region || 'BR1', acc.affinity);
                accounts[accountName] = acc;
                try { fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2)); } catch (e) {}
            } catch (e) {
                console.error('[AddFriend] Erro ao obter Geopas token:', e.message);
                return interaction.editReply({
                    content: '⚠️ Não foi possível obter as credenciais de chat da Riot. O token da conta pode ter expirado. Use `/link` para reautenticar.'
                });
            }
        }

        if (!acc.chatUri || !acc.chatDom || !acc.geopasToken) {
            return interaction.editReply({
                content: '⚠️ Credenciais de chat XMPP incompletas. Por favor, use `/link` para reautenticar a conta Riot.'
            });
        }

        // ── 6. Conectar ao XMPP e enviar pedido ──────────────────────────
        const client = new RiotChatClient(acc.chatUri, acc.chatDom);
        let connected = false;

        try {
            connected = await client.initializeChat(acc.accessToken, acc.geopasToken);
        } catch (e) {
            console.error('[AddFriend] Erro na conexão XMPP:', e.message);
        }

        if (!connected) {
            client.disconnect();

            // Se a conta foi banida, informar especificamente
            if (client.accountStatus === 'account-disabled') {
                return interaction.editReply({
                    content: '🚫 A conta Riot ativa foi **banida ou desativada**. Vincule outra conta com `/link`.'
                });
            }

            return interaction.editReply({
                content: '❌ Falha ao conectar ao servidor de chat da Riot Games. Tente novamente em alguns segundos.'
            });
        }

        // ── 7. Enviar pedido de amizade ───────────────────────────────────
        try {
            const result = await client.sendFriendRequest(name, tag);
            client.disconnect();

            if (result === 'User not found') {
                return interaction.editReply({
                    content: `❌ O jogador **${name}#${tag}** não foi encontrado nos servidores da Riot.\n> Verifique se o nome e a tag estão corretos.`
                });
            }

            if (result === "User's friend list is full") {
                return interaction.editReply({
                    content: `⚠️ A lista de amigos do jogador **${name}#${tag}** está **cheia**. Peça ao jogador para liberar espaço.`
                });
            }

            // ── Sucesso ──
            const embed = buildCustomEmbed('addfriend_sent', interaction.client, interaction, {
                targetRiotId: `${name}#${tag}`,
                accountName: accountName,
                name: name,
                tag: tag
            });

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            client.disconnect();
            console.error('[AddFriend Error]', err.message);
            return interaction.editReply({
                content: '❌ Ocorreu um erro inesperado ao enviar o pedido de amizade. Tente novamente.'
            });
        }
    }
};
