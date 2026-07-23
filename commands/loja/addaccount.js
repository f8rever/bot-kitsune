const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loginWithRiotCredentials, getEntitlements, getStoreBalance, getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri, getFriendList } = require('../../utils/riotAuth.js');

module.exports = {
    name: 'addaccount',
    description: 'Adds a Riot account via Username and Password for 24/7 Infinite Session.',
    options: [
        {
            name: 'username',
            description: 'Riot Account Username',
            type: 3,
            required: true
        },
        {
            name: 'password',
            description: 'Riot Account Password',
            type: 3,
            required: true
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const username = interaction.options.getString('username').trim();
        const password = interaction.options.getString('password').trim();

        const authData = await loginWithRiotCredentials(username, password);

        if (!authData || !authData.accessToken) {
            return interaction.editReply({ content: '❌ Failed to perform automatic login. Please check username/password or 2FA status.' });
        }

        let finalAccountName = '';
        let region = 'BR1';
        try {
            if (authData.idToken) {
                const idPayload = JSON.parse(Buffer.from(authData.idToken.split('.')[1], 'base64').toString('utf8'));
                if (idPayload.acct) {
                    finalAccountName = `${idPayload.acct.game_name}#${idPayload.acct.tag_line}`;
                }
            }
            if (authData.accessToken) {
                const atPayload = JSON.parse(Buffer.from(authData.accessToken.split('.')[1], 'base64').toString('utf8'));
                if (atPayload.dat && atPayload.dat.r) {
                    region = atPayload.dat.r;
                }
            }
            if (!finalAccountName) {
                finalAccountName = username;
            }
        } catch(e) {
            finalAccountName = username;
        }

        const entitlementsToken = await getEntitlements(authData.accessToken);
        const geopasToken = await getGeopasToken(authData.accessToken);
        const affinity = decodeGeopasAffinity(geopasToken);
        const chatDom = getChatDom(affinity);
        const chatUri = getChatUri(region, affinity);

        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        let accounts = {};
        if (fs.existsSync(accountsPath)) {
            try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e) {}
        }

        accounts[finalAccountName] = {
            ...(accounts[finalAccountName] || {}),
            accessToken: authData.accessToken,
            idToken: authData.idToken,
            entitlementsToken: entitlementsToken,
            region: region,
            geopasToken: geopasToken,
            affinity: affinity,
            chatDom: chatDom,
            chatUri: chatUri,
            riotId: finalAccountName,
            username: username,
            password: password,
            ssid: authData.ssid || (accounts[finalAccountName] ? accounts[finalAccountName].ssid : null),
            updatedAt: new Date().toISOString(),
            expired: false
        };

        let fetchedRp = 0;
        let fetchedBe = 0;

        try {
            const balance = await getStoreBalance(authData.accessToken, entitlementsToken, region);
            if (balance && balance.rp !== undefined) {
                fetchedRp = balance.rp;
                fetchedBe = balance.ip;
                accounts[finalAccountName].rp = fetchedRp;
                accounts[finalAccountName].be = fetchedBe;
            }

            const friends = await getFriendList(authData.accessToken, entitlementsToken, region);
            const friendlistCacheMap = global.friendlistCacheMap || new Map();
            if (friends && friends.length > 0) {
                friendlistCacheMap.set(finalAccountName, { timestamp: Date.now(), friends });
                friendlistCacheMap.set(authData.accessToken, { timestamp: Date.now(), friends });
                global.friendlistCacheMap = friendlistCacheMap;
            }
        } catch(e) {}

        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));

        const embed = new EmbedBuilder()
            .setTitle('♾️ Account Added Successfully!')
            .setDescription(`Account **${finalAccountName}** has been authenticated and registered!\n\n- **Region:** \`${region}\`\n- **RP:** \`${fetchedRp.toLocaleString()}\` | **BE:** \`${fetchedBe.toLocaleString()}\`\n- **Status:** 🟢 **24/7 INFINITE SESSION ACTIVE**\n\nThe bot will automatically refresh Riot tokens 24/7 in the cloud without ever expiring!`)
            .setColor('#2ECC71')
            .setFooter({ text: 'Kitsune V2 Bot • 24/7 Authentication' });

        return interaction.editReply({ embeds: [embed] });
    }
};
