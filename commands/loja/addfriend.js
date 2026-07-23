const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri } = require('../../utils/riotAuth.js');
const { RiotChatClient } = require('../../utils/riotXmpp.js');

module.exports = {
    name: 'addfriend',
    description: 'Sends a friend request from the active Riot account to specified Riot ID.',
    options: [
        {
            name: 'riot_id',
            description: 'Target Riot ID (Name#TAG)',
            type: 3,
            required: true
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
            return interaction.editReply({ content: '⚠️ Could not fetch Riot chat credentials at the moment.' });
        }

        const client = new RiotChatClient(acc.chatUri, acc.chatDom);
        let ok = false;
        try { ok = await client.initializeChat(acc.accessToken, acc.geopasToken); } catch(e) {}

        if (!ok) {
            client.disconnect();
            return interaction.editReply({ content: '❌ Could not connect to Riot Chat server.' });
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
        } catch(err) {
            client.disconnect();
            return interaction.editReply({ content: '❌ An error occurred sending the friend request.' });
        }
    }
};
