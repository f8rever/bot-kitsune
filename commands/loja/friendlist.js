const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getFriendList, getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri } = require('../../utils/riotAuth.js');
const { RiotChatClient } = require('../../utils/riotXmpp.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

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
                { name: '📥 Ver Pedidos Pendentes (Recebidos)', value: 'ver_pedidos' },
                { name: '👥 Ver Lista de Amigos Atuais', value: 'ver_amigos' },
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

        const acao = interaction.options.getString('action');
        const targetRiotId = interaction.options.getString('riot_id');

        if (acao === 'enviar_pedido' && !targetRiotId) {
            return interaction.editReply({ 
                content: '❌ Por favor, informe o parâmetro `riot_id` (Ex: `Nome#TAG`) ao selecionar enviar pedido de amizade.' 
            });
        }

        if (acao === 'ver_amigos') {
            try {
                const friends = await getFriendList(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                const friendListStr = (friends && friends.length > 0)
                    ? friends.slice(0, 25).map((f, idx) => `${idx + 1}. **${f.gameName || f.name || 'Invocador'}#${f.tagLine || 'BR1'}**`).join('\n')
                    : '🟢 **Nenhum amigo adicionado nesta conta ainda.**';

                const embed = buildCustomEmbed('friendlist_main', interaction.client, interaction, {
                    accountName: accountName,
                    count: String(friends ? friends.length : 0),
                    showingCount: String(Math.min(friends ? friends.length : 0, 25)),
                    friendListStr: friendListStr
                });

                return interaction.editReply({ embeds: [embed] });
            } catch(e) {
                return interaction.editReply({ content: '❌ Erro ao buscar lista de amigos da Riot.' });
            }
        }

        if (!acc.geopasToken || !acc.chatUri || !acc.chatDom) {
            try {
                acc.geopasToken = await getGeopasToken(acc.accessToken);
                acc.affinity = decodeGeopasAffinity(acc.geopasToken);
                acc.chatDom = getChatDom(acc.affinity);
                acc.chatUri = getChatUri(acc.region || 'BR1', acc.affinity);
                accounts[accountName] = acc;
                fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
            } catch(e) {
                console.error('[Friendlist] Erro ao obter tokens de chat:', e.message);
            }
        }

        if (!acc.chatUri || !acc.chatDom || !acc.geopasToken) {
            return interaction.editReply({ 
                content: '⚠️ Não foi possível obter as credenciais de chat da Riot no momento. Tente novamente ou use `/link`.' 
            });
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
                    tag = parts[1].trim() || 'BR1';
                }

                const result = await client.sendFriendRequest(name, tag);
                client.disconnect();

                if (result === 'User not found') {
                    return interaction.editReply({ content: `❌ O jogador **${name}#${tag}** não foi encontrado nos servidores da Riot.` });
                }
                if (result === "User's friend list is full") {
                    return interaction.editReply({ content: `⚠️ A lista de amigos do jogador **${name}#${tag}** está cheia.` });
                }

                const embed = buildCustomEmbed('addfriend_sent', interaction.client, interaction, {
                    targetRiotId: `${name}#${tag}`,
                    accountName: accountName,
                    name: name,
                    tag: tag
                });

                return interaction.editReply({ embeds: [embed] });
            }

            const roster = await client.getFriendList();
            const pendingIn = roster ? roster.filter(r => r.status === 'pending_in') : [];

            if (acao === 'ver_pedidos') {
                client.disconnect();

                const requestsList = pendingIn.length > 0 
                    ? pendingIn.map(r => `• **${r.name || r.puuid}**`).join('\n')
                    : '🟢 **Nenhum pedido de amizade pendente no momento.**';

                const embed = buildCustomEmbed('friendlist_requests', interaction.client, interaction, {
                    accountName: accountName,
                    count: String(pendingIn.length),
                    requestsList: requestsList
                });

                const components = [];
                if (pendingIn.length > 0) {
                    components.push(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`btn_accept_all_now_${accountName}`).setLabel(`Aceitar Todos (${pendingIn.length})`).setStyle(ButtonStyle.Success).setEmoji('✅')
                        )
                    );
                }

                return interaction.editReply({ embeds: [embed], components });
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

                const successEmbed = buildCustomEmbed('friendlist_accepted', interaction.client, interaction, {
                    acceptedCount: String(acceptedCount),
                    accountName: accountName
                });

                return interaction.editReply({ embeds: [successEmbed] });
            }
        } catch(err) {
            client.disconnect();
            console.error('[Friendlist Error]', err.message);
            return interaction.editReply({ content: '❌ Ocorreu um erro ao processar a lista de amigos.' });
        }
    }
};
