const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { parseTokensFromUrl, getEntitlements, getUserInfo, getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri, getStoreBalance, getFriendList } = require('../../utils/riotAuth.js');
const fs = require('fs');
const path = require('path');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'link',
    description: 'Vincula uma conta Riot utilizando a URL de redirecionamento do navegador.',
    options: [
        {
            name: 'url',
            description: 'URL completa do redirecionamento (http://localhost/redirect#access_token=...)',
            type: 3,
            required: true
        },
        {
            name: 'ssid',
            description: 'Cookie SSID da conta (opcional - para renovação 24/7 sem expirar)',
            type: 3,
            required: false
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const inputString = interaction.options.getString('url');
        const ssidParam = interaction.options.getString('ssid');
        
        if (!inputString.includes('access_token=')) {
            return interaction.editReply({ content: '❌ URL inválida! Certifique-se de copiar a URL inteira após fazer o login na Riot e ser redirecionado para o localhost.' });
        }
        
        let authData;
        try {
            authData = parseTokensFromUrl(inputString);
            if (!authData || !authData.accessToken) {
                throw new Error("Token não encontrado na URL.");
            }
            authData.entitlementsToken = await getEntitlements(authData.accessToken);
        } catch (e) {
            return interaction.editReply({ content: '❌ Falha ao extrair os tokens da URL. A URL pode estar malformada ou já expirou.' });
        }

        // Auto-extract SSID if present in the pasted string
        let autoSsid = null;
        if (inputString.includes('ssid=')) {
            const match = inputString.match(/ssid=([^;&\s]+)/);
            if (match) autoSsid = match[1];
        }
        
        let finalAccountName = '';
        let region = 'BR1';

        try {
            const userInfo = await getUserInfo(authData.accessToken);
            if (userInfo && userInfo.acct && userInfo.acct.game_name) {
                finalAccountName = `${userInfo.acct.game_name}#${userInfo.acct.tag_line}`;
            } else if (userInfo && userInfo.username) {
                finalAccountName = userInfo.username;
            }
        } catch(e) {}

        if (!finalAccountName && authData.idToken) {
            try {
                const idPayload = JSON.parse(Buffer.from(authData.idToken.split('.')[1], 'base64').toString('utf8'));
                if (idPayload.acct) {
                    finalAccountName = `${idPayload.acct.game_name}#${idPayload.acct.tag_line}`;
                }
            } catch(e) {}
        }

        if (authData.accessToken) {
            try {
                const atPayload = JSON.parse(Buffer.from(authData.accessToken.split('.')[1], 'base64').toString('utf8'));
                if (atPayload.dat && atPayload.dat.r) {
                    region = atPayload.dat.r;
                }
            } catch(e) {}
        }

        if (!finalAccountName) {
            finalAccountName = "Riot_User_" + Math.floor(Math.random() * 1000);
        }

        // Test token against Riot Store API immediately to verify validity
        const balance = await getStoreBalance(authData.accessToken, authData.entitlementsToken, region);
        if (balance && balance.error === 401) {
            return interaction.editReply({ content: '❌ A URL fornecida no `/link` já expirou! Por favor, faça login no navegador novamente e copie a nova URL recém-gerada.' });
        }
        
        const geopasToken = await getGeopasToken(authData.accessToken);
        const affinity = decodeGeopasAffinity(geopasToken);
        const chatDom = getChatDom(affinity);
        const chatUri = getChatUri(region, affinity);
        
        const configDir = path.resolve(__dirname, '../../config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        const accountsPath = path.join(configDir, 'riot_accounts.json');
        let accounts = {};
        if (fs.existsSync(accountsPath)) {
            try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e) {}
        }
        
        const fetchedRp = (balance && balance.rp !== undefined) ? balance.rp : 0;
        const fetchedBe = (balance && balance.ip !== undefined) ? balance.ip : 0;
        const fetchedLevel = (balance && balance.summonerLevel) ? balance.summonerLevel : 30;

        accounts[finalAccountName] = {
            ...(accounts[finalAccountName] || {}),
            ...authData,
            region: region,
            geopasToken: geopasToken,
            affinity: affinity,
            chatDom: chatDom,
            chatUri: chatUri,
            riotId: finalAccountName,
            rp: fetchedRp,
            be: fetchedBe,
            summonerLevel: fetchedLevel,
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
        } else if (autoSsid) {
            accounts[finalAccountName].ssid = autoSsid;
        }

        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2), 'utf8');
        console.log(`[AccountStore] 💾 Conta ${finalAccountName} salva com sucesso em config/riot_accounts.json!`);

        const userStoreSessions = global.userStoreSessions || new Map();
        userStoreSessions.set(interaction.user.id, {
            accountName: finalAccountName,
            accessToken: authData.accessToken,
            entitlementsToken: authData.entitlementsToken,
            region: region,
            idToken: authData.idToken,
            tokens: accounts[finalAccountName]
        });
        global.userStoreSessions = userStoreSessions;

        const friendlistCacheMap = global.friendlistCacheMap || new Map();
        try {
            const friends = await getFriendList(authData.accessToken, authData.entitlementsToken, region);
            if (friends && friends.length > 0) {
                friendlistCacheMap.set(finalAccountName, { timestamp: Date.now(), friends });
                friendlistCacheMap.set(authData.accessToken, { timestamp: Date.now(), friends });
                global.friendlistCacheMap = friendlistCacheMap;
            }
        } catch(e) {}

        const isInfinite = accounts[finalAccountName].ssid ? '🟢 **RENOVAÇÃO 24/7 ATIVA (SSID)**' : '🟢 **SESSÃO ATIVA (HEARTBEAT)**';

        const successEmbed = buildCustomEmbed('link_success', interaction.client, interaction, {
            accountName: finalAccountName,
            region: region,
            level: String(fetchedLevel),
            status247: isInfinite,
            rp: fetchedRp.toLocaleString('pt-BR'),
            be: fetchedBe.toLocaleString('pt-BR')
        });
            
        await interaction.editReply({ embeds: [successEmbed] });
    }
};
