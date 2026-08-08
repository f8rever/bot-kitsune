const fs = require('fs');
const path = require('path');
const { getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri } = require('../../utils/riotAuth.js');
const { RiotChatClient } = require('../../utils/riotXmpp.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'addfriend',
    description: 'Envia um pedido de amizade da conta Riot ativa para um Riot ID (Nome#TAG).',
    options: [
        {
            name: 'riot_id',
            description: 'Nome#TAG do amigo na Riot Games (Ex: Invocador#BR1)',
            type: 3,
            required: true
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        let accounts = {};
        if (fs.existsSync(accountsPath)) {
            try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e) {}
        }

        // Get session from memory or resolve active account
        let session = global.userStoreSessions ? global.userStoreSessions.get(interaction.user.id) : null;
        let accountName = session ? session.accountName : null;
        let acc = null;

        if (accountName && accounts[accountName]) {
            acc = accounts[accountName];
        } else {
            const availableAccounts = Object.keys(accounts);
            if (availableAccounts.length > 0) {
                accountName = availableAccounts[0];
                acc = accounts[accountName];
            }
        }

        if (!acc || !acc.accessToken) {
            return interaction.editReply({ 
                content: '❌ Nenhuma conta Riot vinculada encontrada. Use o comando `/link` para vincular sua conta Riot.' 
            });
        }

        const rawTarget = interaction.options.getString('riot_id').trim();
        let name = rawTarget;
        let tag = 'BR1';

        if (rawTarget.includes('#')) {
            const parts = rawTarget.split('#');
            name = parts[0].trim();
            tag = parts[1].trim() || 'BR1';
        }

        // Obtain Geopas chat tokens if missing
        if (!acc.geopasToken || !acc.chatUri || !acc.chatDom) {
            try {
                acc.geopasToken = await getGeopasToken(acc.accessToken);
                acc.affinity = decodeGeopasAffinity(acc.geopasToken);
                acc.chatDom = getChatDom(acc.affinity);
                acc.chatUri = getChatUri(acc.region || 'BR1', acc.affinity);
                accounts[accountName] = acc;
                fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
            } catch(e) {
                console.error('[AddFriend] Erro ao obter tokens de chat:', e.message);
            }
        }

        if (!acc.chatUri || !acc.chatDom || !acc.geopasToken) {
            return interaction.editReply({ 
                content: '⚠️ Não foi possível obter as credenciais de chat XMPP da Riot. Verifique se a sua conta vinculada ainda é válida.' 
            });
        }

        const client = new RiotChatClient(acc.chatUri, acc.chatDom);
        let ok = false;
        try { 
            ok = await client.initializeChat(acc.accessToken, acc.geopasToken); 
        } catch(e) {
            console.error('[AddFriend] Erro na conexão XMPP:', e.message);
        }

        if (!ok) {
            client.disconnect();
            return interaction.editReply({ content: '❌ Falha ao conectar ao servidor de chat XMPP da Riot Games.' });
        }

        try {
            const result = await client.sendFriendRequest(name, tag);
            client.disconnect();

            if (result === 'User not found') {
                return interaction.editReply({ content: `❌ O jogador **${name}#${tag}** não foi encontrado nos servidores da Riot.` });
            }
            if (result === "User's friend list is full") {
                return interaction.editReply({ content: `⚠️ A lista de amigos do jogador **${name}#${tag}** está lotada.` });
            }

            const embed = buildCustomEmbed('addfriend_sent', interaction.client, interaction, {
                targetRiotId: `${name}#${tag}`,
                accountName: accountName,
                name: name,
                tag: tag
            });

            return interaction.editReply({ embeds: [embed] });
        } catch(err) {
            client.disconnect();
            console.error('[AddFriend Error]', err.message);
            return interaction.editReply({ content: '❌ Ocorreu um erro inesperado ao enviar a solicitação de amizade.' });
        }
    }
};
