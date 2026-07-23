const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { parseTokensFromUrl, getEntitlements, getUserInfo, getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri } = require('../../utils/riotAuth.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'link',
    description: 'Adiciona uma conta através do Link (URL) de redirecionamento da Riot.',
    options: [
        {
            name: 'url',
            description: 'Cole a URL completa (http://localhost/redirect#access_token=...)',
            type: 3,
            required: true
        },
        {
            name: 'ssid',
            description: 'Cookie SSID da conta (opcional - para renovação automática 24/7 sem expirar)',
            type: 3,
            required: false
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const url = interaction.options.getString('url');
        const ssidParam = interaction.options.getString('ssid');
        
        if (!url.includes('access_token=')) {
            return interaction.editReply({ content: '❌ URL inválida! Certifique-se de copiar a URL inteira após fazer o login na Riot e ser redirecionado para o localhost.' });
        }
        
        let authData;
        try {
            authData = parseTokensFromUrl(url);
            if (!authData || !authData.accessToken) {
                throw new Error("Token não encontrado na URL.");
            }
            authData.entitlementsToken = await getEntitlements(authData.accessToken);
        } catch (e) {
            return interaction.editReply({ content: '❌ Falha ao extrair os tokens da URL. A URL pode estar malformada ou já expirou.' });
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
                finalAccountName = "Unknown_Riot_User_" + Math.floor(Math.random() * 1000);
            }
        } catch(e) {
            finalAccountName = "Unknown_Riot_User_" + Math.floor(Math.random() * 1000);
        }
        
        const geopasToken = await getGeopasToken(authData.accessToken);
        const affinity = decodeGeopasAffinity(geopasToken);
        const chatDom = getChatDom(affinity);
        const chatUri = getChatUri(region, affinity);
        
        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        let accounts = {};
        if (fs.existsSync(accountsPath)) {
            accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
        }
        
        accounts[finalAccountName] = {
            ...(accounts[finalAccountName] || {}),
            ...authData,
            region: region,
            geopasToken: geopasToken,
            affinity: affinity,
            chatDom: chatDom,
            chatUri: chatUri,
            riotId: finalAccountName,
            updatedAt: new Date().toISOString(),
            expired: false
        };

        if (ssidParam) {
            let cleanSsid = ssidParam.trim();
            if (cleanSsid.includes('ssid=')) {
                const match = cleanSsid.match(/ssid=([^;]+)/);
                if (match) cleanSsid = match[1];
            }
            accounts[finalAccountName].ssid = cleanSsid;
        }

        const userStoreSessions = global.userStoreSessions || new Map();
        userStoreSessions.set(interaction.user.id, {
            accountName: finalAccountName,
            accessToken: authData.accessToken,
            entitlementsToken: authData.entitlementsToken,
            region: region,
            idToken: authData.idToken
        });
        global.userStoreSessions = userStoreSessions;

        const { getFriendList, getStoreBalance } = require('../../utils/riotAuth.js');
        const friendlistCacheMap = global.friendlistCacheMap || new Map();
        
        let fetchedRp = 0;
        let fetchedBe = 0;
        let fetchedLevel = 30;

        try {
            const balance = await getStoreBalance(authData.accessToken, authData.entitlementsToken, region);
            if (balance && balance.rp !== undefined) {
                fetchedRp = balance.rp;
                fetchedBe = balance.ip;
                fetchedLevel = balance.summonerLevel || 30;
                accounts[finalAccountName].rp = fetchedRp;
                accounts[finalAccountName].be = fetchedBe;
                accounts[finalAccountName].summonerLevel = fetchedLevel;
            }

            const friends = await getFriendList(authData.accessToken, authData.entitlementsToken, region);
            if (friends && friends.length > 0) {
                friendlistCacheMap.set(finalAccountName, { timestamp: Date.now(), friends });
                friendlistCacheMap.set(authData.accessToken, { timestamp: Date.now(), friends });
                global.friendlistCacheMap = friendlistCacheMap;
            }
        } catch(e) {}

        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));

        const successEmbed = new EmbedBuilder()
            .setTitle('🔗 Conta Linkada & Conectada com Sucesso!')
            .setColor('#23A559')
            .setDescription(`A conta **${finalAccountName}** (\`${region}\`) foi vinculada ao bot e definida como sua **conta ativa**!`)
            .addFields(
                { name: 'Riot ID', value: `**${finalAccountName}**`, inline: true },
                { name: 'Região', value: `\`${region}\``, inline: true },
                { name: 'Nível da Conta', value: `\`Nv. ${fetchedLevel}\``, inline: true },
                { name: 'Saldo Atual', value: `\`${fetchedRp.toLocaleString('en-US')} RP\` | \`${fetchedBe.toLocaleString('en-US')} BE\``, inline: false }
            )
            .setFooter({ text: '© Kitsune Store • Link de Conta', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
            
        await interaction.editReply({ embeds: [successEmbed] });
    }
};
