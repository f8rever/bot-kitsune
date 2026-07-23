const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'login',
    description: 'Logs in to a linked account and opens the store/friends dashboard.',
    options: [
        {
            name: 'account_name',
            description: 'Select your account',
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
            const prefix = acc.expired ? '[Use /link]' : `[${region}]`;
            return {
                name: `${statusEmoji} ${prefix} ${name} - ${rp.toLocaleString('en-US')} RP`,
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
            return interaction.reply({ content: '❌ Nenhuma conta salva encontrada. Use `/link`.', ephemeral: true });
        }
        
        const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
        const acc = accounts[selected];
        
        if (!acc || !acc.accessToken) {
            return interaction.reply({ content: '❌ Conta não encontrada no cache.', ephemeral: true });
        }
        if (acc.expired) {
            return interaction.reply({ content: '❌ O token desta conta expirou. Use `/link` novamente com um novo redirecionamento para renovar o acesso.', ephemeral: true });
        }
        
        const { buildCustomEmbed } = require('../../utils/customEmbeds.js');
        const sleep = ms => new Promise(res => setTimeout(res, ms));

        // Step 1: Initializing
        const loading1 = buildCustomEmbed('login_loading_1', interaction.client, interaction);
        await interaction.reply({ embeds: [loading1], ephemeral: true });
        await sleep(1500);

        // Step 2: Checking
        const loading2 = buildCustomEmbed('login_loading_2', interaction.client, interaction);
        await interaction.editReply({ embeds: [loading2] });

        const { getStoreBalance } = require('../../utils/riotAuth.js');
        let storeBalance = null;
        let rp = acc.rp || 0;
        let be = acc.be || 0;
        try {
            storeBalance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region);
            if (storeBalance.error === 401) {
                acc.expired = true;
                fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
                return interaction.editReply({ content: '❌ O token desta conta expirou no momento do login. Use `/link` novamente.', embeds: [] });
            }
            rp = storeBalance?.rp || storeBalance?.RP || 0;
            be = storeBalance?.ip || storeBalance?.IP || 0;
            
            acc.rp = rp;
            acc.be = be;
            fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
        } catch(e) {
            console.error('Error fetching balance from cache:', e.message);
        }

        // Step 3: Reusing tokens
        const loading3 = buildCustomEmbed('login_loading_3', interaction.client, interaction);
        await interaction.editReply({ embeds: [loading3] });
        await sleep(1500);
        
        const finalAccountName = selected;
        const region = acc.region || 'BR1';
        
        const successEmbed = buildCustomEmbed('login_success', interaction.client, interaction, {
            accountName: finalAccountName,
            region: region,
            rp: rp.toLocaleString('en-US'),
            be: be.toLocaleString('en-US')
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
