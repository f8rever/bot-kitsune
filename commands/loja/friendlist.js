const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getFriendList, getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri, reauthWithSSID } = require('../../utils/riotAuth.js');
const { RiotChatClient } = require('../../utils/riotXmpp.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

function formatTimerDetailed(friendsSince) {
    if (!friendsSince) return '🌍 **Global (Outra Região/Chat)**';
    
    // Normalizar string de data ISO
    const cleanDateStr = friendsSince.includes('T') ? friendsSince : friendsSince.replace(' ', 'T') + 'Z';
    const sinceDate = new Date(cleanDateStr);
    
    if (isNaN(sinceDate.getTime())) return '⏳ **Amizade Recente**';
    
    const diffMs = Date.now() - sinceDate.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    
    if (diffMs >= twentyFourHoursMs) {
        const totalSecs = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        
        let timeParts = [];
        if (days > 0) timeParts.push(`${days}d`);
        if (hours > 0) timeParts.push(`${hours}h`);
        if (mins > 0 || timeParts.length === 0) timeParts.push(`${mins}m`);
        
        return `✅ **Elegível para Presentes** (Adicionado há ${timeParts.join(' ')})`;
    } else {
        const remainMs = twentyFourHoursMs - diffMs;
        const remainSecs = Math.floor(remainMs / 1000);
        const remainHours = Math.floor(remainSecs / 3600);
        const remainMins = Math.floor((remainSecs % 3600) / 60);
        const remainSeconds = remainSecs % 60;
        
        return `⏱️ **Aguardando 24h** (Faltam ${remainHours}h ${remainMins}m ${remainSeconds}s)`;
    }
}

module.exports = {
    name: 'friendlist',
    description: 'Gerencia, visualiza tempo de amizade e aceita pedidos na conta Riot ativa.',
    options: [
        {
            name: 'action',
            description: 'Escolha a ação desejada',
            type: 3,
            required: true,
            choices: [
                { name: '👥 Ver Lista de Amigos e Timers', value: 'ver_amigos' },
                { name: '📥 Ver Pedidos Pendentes (Recebidos)', value: 'ver_pedidos' },
                { name: '✅ Aceitar Todos os Pedidos', value: 'aceitar_todos' },
                { name: '➕ Enviar Pedido de Amizade', value: 'enviar_pedido' }
            ]
        },
        {
            name: 'riot_id',
            description: 'Riot ID (Nome#TAG) - Necessário caso escolha Enviar Pedido',
            type: 3,
            required: false
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        let accounts = {};
        if (fs.existsSync(accountsPath)) {
            try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch (e) {}
        }

        const availableAccounts = Object.keys(accounts);
        if (availableAccounts.length === 0) {
            return interaction.editReply({
                content: '❌ Nenhuma conta Riot vinculada encontrada. Use `/link` para cadastrar uma conta primeiro.'
            });
        }

        // Determinar conta ativa: sessão do usuário -> primeira conta
        const userSession = global.userStoreSessions ? global.userStoreSessions.get(interaction.user.id) : null;
        let accountName = (userSession && userSession.accountName) ? userSession.accountName : availableAccounts[0];
        if (!accounts[accountName]) accountName = availableAccounts[0];
        let acc = accounts[accountName];

        if (!acc || !acc.accessToken) {
            return interaction.editReply({
                content: '❌ A conta selecionada não possui token válido. Use `/login` para autenticar.'
            });
        }

        const acao = interaction.options.getString('action');
        const targetRiotId = interaction.options.getString('riot_id');

        if (acao === 'enviar_pedido' && !targetRiotId) {
            return interaction.editReply({
                content: '❌ Informe o parâmetro `riot_id` (ex: `Invocador#BR1`) para enviar a solicitação.'
            });
        }

        // Renovar token via SSID se disponível
        if (acc.ssid) {
            try {
                const refreshed = await reauthWithSSID(acc.ssid);
                if (refreshed && refreshed.accessToken) {
                    acc.accessToken = refreshed.accessToken;
                    if (refreshed.idToken) acc.idToken = refreshed.idToken;
                    accounts[accountName] = acc;
                    try { fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2)); } catch (e) {}
                }
            } catch (e) {}
        }

        // Garantir credenciais de chat XMPP
        if (!acc.geopasToken || !acc.chatUri || !acc.chatDom) {
            try {
                acc.geopasToken = await getGeopasToken(acc.accessToken);
                acc.affinity = decodeGeopasAffinity(acc.geopasToken);
                acc.chatDom = getChatDom(acc.affinity);
                acc.chatUri = getChatUri(acc.region || 'BR1', acc.affinity);
                accounts[accountName] = acc;
                try { fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2)); } catch (e) {}
            } catch (e) {
                console.error('[Friendlist] Erro ao obter tokens de chat:', e.message);
            }
        }

        // ── 1. AÇÃO: VER AMIGOS E TIMERS (Multi-Região) ──────────────────────
        if (acao === 'ver_amigos') {
            let allFriends = [];
            let storeFriendsMap = new Map();

            // Buscar amigos da Store API (contém o timestamp 'friendsSince' para cálculo exato de 24h)
            try {
                const storeFriends = await getFriendList(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                if (Array.isArray(storeFriends)) {
                    for (const sf of storeFriends) {
                        const nameKey = (sf.name || sf.nick || '').toLowerCase().trim();
                        storeFriendsMap.set(nameKey, sf);
                        if (sf.puuid) storeFriendsMap.set(sf.puuid, sf);
                    }
                }
            } catch (e) {}

            // Buscar amigos do XMPP (roster completo de todas as regiões)
            if (acc.chatUri && acc.chatDom && acc.geopasToken) {
                const xmppClient = new RiotChatClient(acc.chatUri, acc.chatDom);
                try {
                    const connected = await xmppClient.initializeChat(acc.accessToken, acc.geopasToken);
                    if (connected) {
                        const roster = await xmppClient.getFriendList();
                        const mutual = (roster || []).filter(r => r.status === 'both' || !r.status);
                        
                        allFriends = mutual.map(f => {
                            const nameKey = (f.name || '').toLowerCase().trim();
                            const storeData = storeFriendsMap.get(nameKey) || (f.puuid ? storeFriendsMap.get(f.puuid) : null);
                            return {
                                name: f.name || storeData?.name || 'Amigo',
                                puuid: f.puuid,
                                friendsSince: storeData?.friendsSince || null
                            };
                        });
                    }
                } catch (e) {
                    console.warn('[Friendlist] Falha XMPP, usando dados da loja:', e.message);
                } finally {
                    xmppClient.disconnect();
                }
            }

            // Fallback: se o XMPP não trouxe nada, usa os dados da Store API
            if (allFriends.length === 0 && storeFriendsMap.size > 0) {
                const unique = Array.from(new Set(storeFriendsMap.values()));
                allFriends = unique.map(f => ({
                    name: f.name || f.nick || 'Amigo',
                    puuid: f.puuid,
                    friendsSince: f.friendsSince
                }));
            }

            if (allFriends.length === 0) {
                const embed = buildCustomEmbed('friendlist_main', interaction.client, interaction, {
                    accountName: accountName,
                    count: '0',
                    friendListStr: '🟢 **Nenhum amigo adicionado nesta conta ainda.**'
                });
                return interaction.editReply({ embeds: [embed] });
            }

            // Paginação interativa
            let page = 1;
            const pageSize = 8;
            const totalPages = Math.ceil(allFriends.length / pageSize);

            function buildPagePayload(p) {
                const start = (p - 1) * pageSize;
                const pageItems = allFriends.slice(start, start + pageSize);

                const listStr = pageItems.map((f, idx) => {
                    const globalIdx = start + idx + 1;
                    const timer = formatTimerDetailed(f.friendsSince);
                    return `**${globalIdx}. ${f.name}**\n   └ ${timer}`;
                }).join('\n\n');

                const embed = buildCustomEmbed('friendlist_main', interaction.client, interaction, {
                    accountName: accountName,
                    count: String(allFriends.length),
                    friendListStr: listStr
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`fl_prev_${p}`)
                        .setLabel('Anterior')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(p <= 1),
                    new ButtonBuilder()
                        .setCustomId('fl_indicator')
                        .setLabel(`Página ${p}/${totalPages} (${allFriends.length} amigos)`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`fl_next_${p}`)
                        .setLabel('Próxima')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(p >= totalPages),
                    new ButtonBuilder()
                        .setCustomId(`fl_refresh_${accountName}`)
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Primary)
                );

                return { embeds: [embed], components: totalPages > 1 ? [row] : [] };
            }

            const msg = await interaction.editReply(buildPagePayload(page));

            if (totalPages > 1) {
                const collector = msg.createMessageComponentCollector({ time: 120000 });
                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({ content: '❌ Apenas você pode interagir com este menu.', ephemeral: true });
                    }
                    await i.deferUpdate();

                    if (i.customId.startsWith('fl_prev_')) {
                        page = Math.max(1, page - 1);
                    } else if (i.customId.startsWith('fl_next_')) {
                        page = Math.min(totalPages, page + 1);
                    }
                    await interaction.editReply(buildPagePayload(page));
                });

                collector.on('end', () => {
                    interaction.editReply({ components: [] }).catch(() => {});
                });
            }
            return;
        }

        // ── 2. AÇÕES COM XMPP (Enviar, Ver Pedidos, Aceitar) ─────────────────
        if (!acc.chatUri || !acc.chatDom || !acc.geopasToken) {
            return interaction.editReply({
                content: '⚠️ Credenciais de chat da Riot indisponíveis. Verifique a conta ou use `/link`.'
            });
        }

        const client = new RiotChatClient(acc.chatUri, acc.chatDom);
        let ok = false;
        try {
            ok = await client.initializeChat(acc.accessToken, acc.geopasToken);
        } catch (e) {}

        if (!ok) {
            client.disconnect();
            if (client.accountStatus === 'account-disabled') {
                return interaction.editReply({ content: '🚫 A conta ativa está banida/desativada na Riot.' });
            }
            return interaction.editReply({ content: '❌ Falha ao conectar ao chat da Riot Games.' });
        }

        try {
            // Enviar pedido
            if (acao === 'enviar_pedido') {
                let name = targetRiotId.trim();
                let tag = 'BR1';
                if (targetRiotId.includes('#')) {
                    const parts = targetRiotId.split('#');
                    name = parts[0].trim();
                    tag = (parts[1] || 'BR1').trim();
                }

                const result = await client.sendFriendRequest(name, tag);
                client.disconnect();

                if (result === 'User not found') {
                    return interaction.editReply({
                        content: `❌ O jogador **${name}#${tag}** não foi encontrado nos servidores da Riot.`
                    });
                }
                if (result === "User's friend list is full") {
                    return interaction.editReply({
                        content: `⚠️ A lista de amigos do jogador **${name}#${tag}** está lotada.`
                    });
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
            const pendingIn = (roster || []).filter(r => r.status === 'pending_in');

            // Ver pedidos recebidos
            if (acao === 'ver_pedidos') {
                client.disconnect();

                const requestsList = pendingIn.length > 0
                    ? pendingIn.map((r, i) => `**${i + 1}.** \`${r.name || r.puuid}\``).join('\n')
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
                            new ButtonBuilder()
                                .setCustomId('btn_accept_all_friends')
                                .setLabel(`Aceitar Todos (${pendingIn.length})`)
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('📥')
                        )
                    );
                }

                return interaction.editReply({ embeds: [embed], components });
            }

            // Aceitar todos os pedidos
            if (acao === 'aceitar_todos') {
                if (pendingIn.length === 0) {
                    client.disconnect();
                    return interaction.editReply({
                        content: `🟢 A conta **${accountName}** não possui nenhum pedido de amizade pendente.`
                    });
                }

                let acceptedCount = 0;
                for (const req of pendingIn) {
                    if (req.puuid) {
                        try {
                            await client.acceptFriendRequest(req.puuid);
                            acceptedCount++;
                        } catch (e) {}
                    }
                }
                client.disconnect();

                const successEmbed = buildCustomEmbed('friendlist_accepted', interaction.client, interaction, {
                    acceptedCount: String(acceptedCount),
                    accountName: accountName
                });

                return interaction.editReply({ embeds: [successEmbed] });
            }

        } catch (err) {
            client.disconnect();
            console.error('[Friendlist Error]', err.message);
            return interaction.editReply({ content: '❌ Ocorreu um erro ao processar a lista de amigos.' });
        }
    }
};
