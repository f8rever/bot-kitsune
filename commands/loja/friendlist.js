const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getFriendList, getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri } = require('../../utils/riotAuth.js');
const { RiotChatClient } = require('../../utils/riotXmpp.js');

module.exports = {
    name: 'friendlist',
    description: 'Gerencia, aceita e envia pedidos de amizade na conta Riot ativa.',
    options: [
        {
            name: 'action',
            description: 'Escolha a ação desejada',
            type: 3,
            required: true,
            choices: [
                { name: '📥 Ver Pedidos Pendentes', value: 'ver_pedidos' },
                { name: '✅ Aceitar Todos os Pedidos', value: 'aceitar_todos' },
                { name: '➕ Enviar Pedido de Amizade', value: 'enviar_pedido' }
            ]
        },
        {
            name: 'riot_id',
            description: 'Riot ID (Nome#TAG) - Obrigatório ao enviar pedido de amizade',
            type: 3,
            required: false
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

        const acao = interaction.options.getString('action');
        const targetRiotId = interaction.options.getString('riot_id');

        if (acao === 'enviar_pedido' && !targetRiotId) {
            return interaction.editReply({ content: '❌ Por favor, informe o parâmetro `riot_id` (Ex: `Nome#TAG`) ao enviar um pedido de amizade.' });
        }

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

        try {
            if (acao === 'enviar_pedido') {
                let name = targetRiotId.trim();
                let tag = 'BR1';
                if (targetRiotId.includes('#')) {
                    const parts = targetRiotId.split('#');
                    name = parts[0].trim();
                    tag = parts[1].trim();
                }

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
                    .setDescription(`Solicitação enviada com sucesso para **${name}#${tag}** através da conta **${accountName}**!`)
                    .setColor('#2ECC71')
                    .setFooter({ text: 'Kitsune V2 Bot • Gerenciador de Amigos' });

                return interaction.editReply({ embeds: [embed] });
            }

            const roster = await client.getFriendList();
            const pendingIn = roster ? roster.filter(r => r.status === 'pending_in') : [];

            if (acao === 'ver_pedidos') {
                client.disconnect();

                if (pendingIn.length === 0) {
                    const emptyEmbed = new EmbedBuilder()
                        .setTitle(`👥 Pedidos de Amizade • ${accountName}`)
                        .setDescription('🟢 **Nenhum pedido de amizade pendente no momento.**')
                        .setColor('#2ECC71')
                        .setFooter({ text: 'Kitsune V2 Bot • Gerenciador de Amigos' });

                    return interaction.editReply({ embeds: [emptyEmbed] });
                }

                const requestsList = pendingIn.map(r => `• **${r.name || r.puuid}**`).join('\n');
                const embed = new EmbedBuilder()
                    .setTitle(`📥 Pedidos Pendentes (${pendingIn.length}) • ${accountName}`)
                    .setDescription(`Você tem **${pendingIn.length}** pedido(s) de amizade aguardando aprovação:\n\n${requestsList}`)
                    .setColor('#F1C40F')
                    .setFooter({ text: 'Selecione "Aceitar Todos os Pedidos" para aprovar todos de uma vez.' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`btn_accept_all_now_${accountName}`).setLabel(`Aceitar Todos (${pendingIn.length})`).setStyle(ButtonStyle.Success).setEmoji('✅')
                );

                return interaction.editReply({ embeds: [embed], components: [row] });
            }

            if (acao === 'aceitar_todos') {
                if (pendingIn.length === 0) {
                    client.disconnect();
                    return interaction.editReply({ content: `🟢 **${accountName}** não possui nenhum pedido de amizade pendente.` });
                }

                let acceptedCount = 0;
                for (const req of pendingIn) {
                    if (req.puuid) {
                        try {
                            await client.acceptFriendRequest(req.puuid);
                            acceptedCount++;
                        } catch(e) {}
                    }
                }

                client.disconnect();

                try {
                    const freshFriends = await getFriendList(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                    const friendlistCacheMap = global.friendlistCacheMap || new Map();
                    if (freshFriends && freshFriends.length > 0) {
                        friendlistCacheMap.set(accountName, { timestamp: Date.now(), friends: freshFriends });
                        friendlistCacheMap.set(acc.accessToken, { timestamp: Date.now(), friends: freshFriends });
                        global.friendlistCacheMap = friendlistCacheMap;
                    }
                } catch(e) {}

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Pedidos de Amizade Aceitos!')
                    .setDescription(`Foram aceitos **${acceptedCount}** pedido(s) de amizade com sucesso na conta **${accountName}**!`)
                    .setColor('#2ECC71')
                    .setFooter({ text: 'Kitsune V2 Bot • Gerenciador de Amigos' });

                return interaction.editReply({ embeds: [successEmbed] });
            }
        } catch(err) {
            client.disconnect();
            console.error('Erro no comando friendlist:', err.message);
            return interaction.editReply({ content: '❌ Ocorreu um erro ao processar os pedidos de amizade.' });
        }
    }
};
