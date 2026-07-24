const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri } = require('../../utils/riotAuth.js');
const { RiotChatClient } = require('../../utils/riotXmpp.js');

module.exports = {
    name: 'addfriend',
    description: 'Envia um pedido de amizade da conta Riot ativa para um Riot ID (Nome#TAG).',
    options: [
        {
            name: 'riot_id',
            description: 'Nome#TAG do amigo na Riot Games',
            type: 3,
            required: true
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!global.userStoreSessions || !global.userStoreSessions.has(interaction.user.id)) {
            return interaction.editReply({ content: '❌ Nenhuma sessão ativa. Use `/login` ou `/link` primeiro.' });
        }

        const session = global.userStoreSessions.get(interaction.user.id);
        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        if (!fs.existsSync(accountsPath)) {
            return interaction.editReply({ content: '❌ Nenhuma conta salva encontrada.' });
        }

        const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
        const accountName = session.accountName;
        const acc = accounts[accountName] || session.tokens || session;

        if (!acc || acc.expired || !acc.accessToken) {
            return interaction.editReply({ content: '❌ A sessão da conta expirou. Use `/link` ou `/addaccount` para renovar.' });
        }

        const targetRiotId = interaction.options.getString('riot_id').trim();

        if (!acc.geopasToken) {
            try {
                acc.geopasToken = await getGeopasToken(acc.accessToken);
                acc.affinity = decodeGeopasAffinity(acc.geopasToken);
                acc.chatDom = getChatDom(acc.affinity);
                acc.chatUri = getChatUri(acc.region || 'BR1', acc.affinity);
                accounts[accountName] = acc;
                fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
            } catch(e) {}
        }

        if (!acc.chatUri || !acc.chatDom || !acc.geopasToken) {
            return interaction.editReply({ content: '⚠️ Não foi possível obter as credenciais de chat da Riot no momento.' });
        }

        const client = new RiotChatClient(acc.chatUri, acc.chatDom);
        let ok = false;
        try { ok = await client.initializeChat(acc.accessToken, acc.geopasToken); } catch(e) {}

        if (!ok) {
            client.disconnect();
            return interaction.editReply({ content: '❌ Falha ao conectar ao servidor de chat da Riot.' });
        }

        let name = targetRiotId;
        let tag = 'BR1';
        if (targetRiotId.includes('#')) {
            const parts = targetRiotId.split('#');
            name = parts[0].trim();
            tag = parts[1].trim();
        }

        try {
            const result = await client.sendFriendRequest(name, tag);
            client.disconnect();

            if (result === 'User not found') {
                return interaction.editReply({ content: `❌ O jogador **${targetRiotId}** não foi encontrado nos servidores da Riot.` });
            }
            if (result === "User's friend list is full") {
                return interaction.editReply({ content: `⚠️ A lista de amigos do jogador **${targetRiotId}** está cheia.` });
            }

            const embed = new EmbedBuilder()
                .setTitle('➕ Pedido de Amizade Enviado!')
                .setDescription(`Solicitação de amizade enviada com sucesso para **${name}#${tag}** através da conta **${accountName}**!`)
                .setColor('#2ECC71')
                .setFooter({ text: 'Kitsune V2 Bot • Gerenciador de Amigos' });

            return interaction.editReply({ embeds: [embed] });
        } catch(err) {
            client.disconnect();
            return interaction.editReply({ content: '❌ Ocorreu um erro ao enviar o pedido de amizade.' });
        }
    }
};
