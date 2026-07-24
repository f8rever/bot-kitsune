const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getStoreBalance, getFriendList, reauthWithSSID, loginWithRiotCredentials, checkAccountBan } = require('../../utils/riotAuth.js');

module.exports = {
    name: 'login',
    description: 'Conecta em uma conta salva e abre o painel da loja e amigos.',
    options: [
        {
            name: 'account_name',
            description: 'Selecione a sua conta Riot',
            type: 3,
            required: true,
            autocomplete: true
        }
    ],
    async autocomplete(interaction) {
        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        if (!fs.existsSync(accountsPath)) return interaction.respond([]);
        
        let accounts;
        try {
            accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
        } catch(e) {
            return interaction.respond([]);
        }
        
        const accountNames = Object.keys(accounts);
        const focusedValue = interaction.options.getFocused();
        
        const choices = accountNames.map(name => {
            const acc = accounts[name];
            const rp = acc.rp || 0;
            const region = acc.region || 'BR1';
            const statusEmoji = acc.expired ? '🔴' : '🟢';
            return {
                name: `${statusEmoji} [${region}] ${name} - ${rp.toLocaleString('pt-BR')} RP`,
                value: name
            };
        });
        
        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase())).slice(0, 25);
        await interaction.respond(filtered);
    },
    async execute(interaction) {
        const selected = interaction.options.getString('account_name');
        
        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        if (!fs.existsSync(accountsPath)) {
            return interaction.reply({ content: '❌ Nenhuma conta salva encontrada. Use `/link` ou `/addaccount`.', ephemeral: true });
        }
        
        let accounts = {};
        try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e) {}
        const acc = accounts[selected];
        
        if (!acc) {
            return interaction.reply({ content: '❌ Conta não encontrada no cache.', ephemeral: true });
        }
        
        const { buildCustomEmbed } = require('../../utils/customEmbeds.js');
        const sleep = ms => new Promise(res => setTimeout(res, ms));

        // Step 1: Initializing Login Process
        const loading1 = buildCustomEmbed('login_loading_1', interaction.client, interaction);
        await interaction.reply({ embeds: [loading1], ephemeral: true });
        await sleep(800);

        // Step 2: Auto Refresh Token & Cookies (reauthWithSSID or loginWithRiotCredentials)
        let renewed = false;
        if (acc.ssid) {
            try {
                const refreshed = await reauthWithSSID(acc.ssid);
                if (refreshed && refreshed.accessToken) {
                    acc.accessToken = refreshed.accessToken;
                    if (refreshed.idToken) acc.idToken = refreshed.idToken;
                    if (refreshed.entitlementsToken) acc.entitlementsToken = refreshed.entitlementsToken;
                    if (refreshed.ssid) acc.ssid = refreshed.ssid;
                    acc.expired = false;
                    renewed = true;
                }
            } catch(e) {}
        }

        if (!renewed && acc.username && acc.password) {
            try {
                const refreshed = await loginWithRiotCredentials(acc.username, acc.password);
                if (refreshed && refreshed.accessToken) {
                    acc.accessToken = refreshed.accessToken;
                    if (refreshed.idToken) acc.idToken = refreshed.idToken;
                    if (refreshed.entitlementsToken) acc.entitlementsToken = refreshed.entitlementsToken;
                    if (refreshed.ssid) acc.ssid = refreshed.ssid;
                    acc.expired = false;
                    renewed = true;
                }
            } catch(e) {}
        }

        // Step 3: Fetching Store Balance & Friends
        let rp = acc.rp || 0;
        let be = acc.be || 0;
        let level = acc.summonerLevel || 30;
        let banned = 'Não';

        const balance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
        if (balance && balance.rp !== undefined) {
            rp = balance.rp;
            be = balance.ip;
            level = balance.summonerLevel || level;
            acc.rp = rp;
            acc.be = be;
            acc.summonerLevel = level;
            acc.expired = false;
        } else if (balance && balance.error === 401) {
            acc.expired = true;
            accounts[selected] = acc;
            fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
            return interaction.editReply({ 
                content: `🔴 **Sessão Expirada:** O token da conta **${selected}** expirou e não pôde ser renovado automaticamente. Use \`/link\` ou \`/addaccount\` para reconectar.`, 
                embeds: [] 
            });
        }

        accounts[selected] = acc;
        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));

        // Step 2 Embed: Token + Cookies updated
        const loading2 = buildCustomEmbed('login_loading_2', interaction.client, interaction);
        await interaction.editReply({ embeds: [loading2] });

        try {
            const isBanned = await checkAccountBan(acc.accessToken);
            banned = isBanned ? 'Sim (Banida)' : 'Não';

            const friends = await getFriendList(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
            const friendlistCacheMap = global.friendlistCacheMap || new Map();
            if (friends && friends.length > 0) {
                friendlistCacheMap.set(selected, { timestamp: Date.now(), friends });
                friendlistCacheMap.set(acc.accessToken, { timestamp: Date.now(), friends });
                global.friendlistCacheMap = friendlistCacheMap;
            }
        } catch(e) {}

        // Step 3 Embed: Friend List Retrieved
        const loading3 = buildCustomEmbed('login_loading_3', interaction.client, interaction);
        await interaction.editReply({ embeds: [loading3] });
        await sleep(800);
        
        const finalAccountName = selected;
        const region = acc.region || 'BR1';
        const displayUsername = acc.username || acc.riotId || selected;
        
        const successEmbed = buildCustomEmbed('login_success', interaction.client, interaction, {
            accountName: finalAccountName,
            username: displayUsername,
            region: region,
            rp: rp.toLocaleString('pt-BR'),
            be: be.toLocaleString('pt-BR'),
            level: level,
            banned: banned
        });
        
        const accRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_rp').setLabel('RP').setStyle(ButtonStyle.Secondary).setEmoji('🪙'),
            new ButtonBuilder().setCustomId('btn_account').setLabel('Account').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️'),
            new ButtonBuilder().setCustomId('btn_friend').setLabel('Friend').setStyle(ButtonStyle.Secondary).setEmoji('🫂'),
            new ButtonBuilder().setCustomId('btn_back').setStyle(ButtonStyle.Secondary).setEmoji('🔄')
        );
        
        global.userStoreSessions = global.userStoreSessions || new Map();
        global.userStoreSessions.set(interaction.user.id, { 
            tokens: acc, 
            accountName: finalAccountName,
            region: region
        });
        
        await interaction.editReply({ content: '', embeds: [successEmbed], components: [accRow] });
    }
};
