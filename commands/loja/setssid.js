const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { reauthWithSSID, getEntitlements, getStoreBalance } = require('../../utils/riotAuth.js');

module.exports = {
    name: 'setssid',
    description: 'Associa um cookie SSID a uma conta da Riot para renovação de sessão infinita (24/7).',
    options: [
        {
            name: 'conta',
            description: 'Nome da conta (Riot ID Ex: Nome#TAG)',
            type: 3,
            required: true,
            autocomplete: true
        },
        {
            name: 'ssid',
            description: 'Valor do cookie SSID copiado do navegador',
            type: 3,
            required: true
        }
    ],
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        if (!fs.existsSync(accountsPath)) return interaction.respond([]);
        try {
            const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
            const matches = Object.keys(accounts)
                .filter(name => name.toLowerCase().includes(focusedValue))
                .slice(0, 25);
            await interaction.respond(matches.map(name => {
                const acc = accounts[name] || {};
                const statusEmoji = acc.expired ? '🔴' : '🟢';
                const prefix = acc.expired ? '[Use /link]' : `[${acc.region || 'BR1'}]`;
                return {
                    name: `${statusEmoji} ${prefix} ${name} - ${(acc.rp || 0).toLocaleString('en-US')} RP`,
                    value: name
                };
            }));
        } catch(e) {
            await interaction.respond([]);
        }
    },
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const accountName = interaction.options.getString('conta');
        const rawSsid = interaction.options.getString('ssid');

        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        if (!fs.existsSync(accountsPath)) {
            return interaction.editReply({ content: '❌ Nenhuma conta cadastrada.' });
        }

        let accounts = {};
        try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e) {}

        if (!accounts[accountName]) {
            return interaction.editReply({ content: `❌ Conta **${accountName}** não encontrada.` });
        }

        let cleanSsid = rawSsid.trim();
        if (cleanSsid.includes('ssid=')) {
            const match = cleanSsid.match(/ssid=([^;]+)/);
            if (match) cleanSsid = match[1];
        }

        // Test SSID immediately
        const freshTokens = await reauthWithSSID(cleanSsid);
        if (!freshTokens || !freshTokens.accessToken) {
            return interaction.editReply({ content: '❌ O cookie SSID fornecido parece inválido ou expirou. Verifique se copiou corretamente do F12 (Application > Cookies).' });
        }

        accounts[accountName].ssid = cleanSsid;
        accounts[accountName].accessToken = freshTokens.accessToken;
        if (freshTokens.idToken) accounts[accountName].idToken = freshTokens.idToken;
        
        try {
            const ent = await getEntitlements(freshTokens.accessToken);
            if (ent) accounts[accountName].entitlementsToken = ent;
            const bal = await getStoreBalance(freshTokens.accessToken, accounts[accountName].entitlementsToken, accounts[accountName].region || 'BR1');
            if (bal && bal.rp !== undefined) {
                accounts[accountName].rp = bal.rp;
                accounts[accountName].be = bal.ip;
            }
        } catch(e) {}

        accounts[accountName].expired = false;
        accounts[accountName].updatedAt = new Date().toISOString();

        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));

        const embed = new EmbedBuilder()
            .setTitle('♾️ Sessão Infinita 24/7 Ativada!')
            .setDescription(`O cookie **SSID** foi associado com sucesso à conta **${accountName}**!\n\nAgora o bot renovará os tokens da Riot automaticamente em segundo plano. Essa conta **NUNCA MAIS EXPIRARÁ**!`)
            .setColor('#2ECC71')
            .setFooter({ text: 'Kitsune V2 Bot • Renovação Automática 24/7' });

        return interaction.editReply({ embeds: [embed] });
    }
};
