const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getFriendList, getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri } = require('../../utils/riotAuth.js');
const { RiotChatClient } = require('../../utils/riotXmpp.js');

module.exports = {
    name: 'friendlist',
    description: 'Manages, accepts, and sends friend requests on active Riot account.',
    options: [
        {
            name: 'action',
            description: 'Select action',
            type: 3,
            required: true,
            choices: [
                { name: '📥 View Pending Requests', value: 'ver_pedidos' },
                { name: '✅ Accept All Requests', value: 'aceitar_todos' },
                { name: '➕ Send Friend Request', value: 'enviar_pedido' }
            ]
        },
        {
            name: 'riot_id',
            description: 'Riot ID to add (Name#TAG) - Required when sending request',
            type: 3,
            required: false
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!global.userStoreSessions || !global.userStoreSessions.has(interaction.user.id)) {
            return interaction.editReply({ content: '❌ No active session. Use `/login` or `/link` first.' });
        }

        const session = global.userStoreSessions.get(interaction.user.id);
        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        if (!fs.existsSync(accountsPath)) {
            return interaction.editReply({ content: '❌ No saved accounts found.' });
        }

        const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
        const accountName = session.accountName;
        const acc = accounts[accountName] || session.tokens || session;

        if (!acc || acc.expired || !acc.accessToken) {
            return interaction.editReply({ content: '❌ Active session expired. Use `/link` to refresh.' });
        }

        const acao = interaction.options.getString('action');
        const targetRiotId = interaction.options.getString('riot_id');

        if (acao === 'enviar_pedido' && !targetRiotId) {
            return interaction.editReply({ content: '❌ Please specify the `riot_id` parameter (Ex: `Name#TAG`) when sending a friend request.' });
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
            return interaction.editReply({ content: '⚠️ Could not fetch Riot chat credentials at the moment.' });
        }

        const client = new RiotChatClient(acc.chatUri, acc.chatDom);
        let ok = false;
        try { ok = await client.initializeChat(acc.accessToken, acc.geopasToken); } catch(e) {}

        if (!ok) {
            client.disconnect();
            return interaction.editReply({ content: '❌ Could not connect to Riot Chat server.' });
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
                    return interaction.editReply({ content: `❌ User **${targetRiotId}** was not found on Riot Games servers.` });
                }
                if (result === "User's friend list is full") {
                    return interaction.editReply({ content: `⚠️ User **${targetRiotId}** has a full friend list.` });
                }

                const embed = new EmbedBuilder()
                    .setTitle('➕ Friend Request Sent!')
                    .setDescription(`Successfully sent friend request to **${name}#${tag}** from account **${accountName}**!`)
                    .setColor('#2ECC71')
                    .setFooter({ text: 'Kitsune V2 Bot • Friend Manager' });

                return interaction.editReply({ embeds: [embed] });
            }

            const roster = await client.getFriendList();
            const pendingIn = roster ? roster.filter(r => r.status === 'pending_in') : [];

            if (acao === 'ver_pedidos') {
                client.disconnect();

                if (pendingIn.length === 0) {
                    const emptyEmbed = new EmbedBuilder()
                        .setTitle(`👥 Friend Requests • ${accountName}`)
                        .setDescription('🟢 **No pending friend requests.**')
                        .setColor('#2ECC71')
                        .setFooter({ text: 'Kitsune V2 Bot • Friend Manager' });

                    return interaction.editReply({ embeds: [emptyEmbed] });
                }

                const requestsList = pendingIn.map(r => `• **${r.name || r.puuid}**`).join('\n');
                const embed = new EmbedBuilder()
                    .setTitle(`📥 Pending Requests (${pendingIn.length}) • ${accountName}`)
                    .setDescription(`You have **${pendingIn.length}** pending friend request(s):\n\n${requestsList}`)
                    .setColor('#F1C40F')
                    .setFooter({ text: 'Select "Accept All Requests" to approve all at once.' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`btn_accept_all_now_${accountName}`).setLabel(`Accept All (${pendingIn.length})`).setStyle(ButtonStyle.Success).setEmoji('✅')
                );

                return interaction.editReply({ embeds: [embed], components: [row] });
            }

            if (acao === 'aceitar_todos') {
                if (pendingIn.length === 0) {
                    client.disconnect();
                    return interaction.editReply({ content: `🟢 **${accountName}** has no pending friend requests.` });
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
                    .setTitle('✅ Friend Requests Accepted!')
                    .setDescription(`Successfully accepted **${acceptedCount}** friend request(s) on **${accountName}**!`)
                    .setColor('#2ECC71')
                    .setFooter({ text: 'Kitsune V2 Bot • Friend Manager' });

                return interaction.editReply({ embeds: [successEmbed] });
            }
        } catch(err) {
            client.disconnect();
            console.error('Error in friendlist command:', err.message);
            return interaction.editReply({ content: '❌ An error occurred processing friend requests.' });
        }
    }
};
