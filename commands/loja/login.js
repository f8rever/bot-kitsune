const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getStoreBalance, reauthWithSSID, getEntitlements } = require('../../utils/riotAuth.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'login',
    description: 'Seleciona e conecta a uma conta Riot salva para usar nos comandos de loja, presentes e amigos.',
    options: [
        {
            name: 'conta',
            description: 'Nome da conta Riot cadastrada (Ex: Invocador#BR1)',
            type: 3,
            required: false,
            autocomplete: true
        }
    ],
    async autocomplete(interaction) {
        try {
            const focusedValue = (interaction.options.getFocused() || '').toLowerCase();
            const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
            let accounts = {};
            if (fs.existsSync(accountsPath)) {
                try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e) {}
            }
            const choices = Object.keys(accounts);

            if (choices.length === 0) {
                return await interaction.respond([
                    { name: '❌ Nenhuma conta vinculada. Use o comando /link para cadastrar!', value: 'none' }
                ]);
            }

            const filtered = choices
                .filter(accName => accName.toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map(accName => ({ name: accName, value: accName }));

            if (filtered.length === 0) {
                return await interaction.respond([
                    { name: `❌ Nenhuma conta encontrada correspondente a "${focusedValue}"`, value: 'none' }
                ]);
            }

            await interaction.respond(filtered);
        } catch(err) {
            console.error('[Login Autocomplete Error]', err);
            try { await interaction.respond([]); } catch(e) {}
        }
    },
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const accountsPath = path.join(__dirname, '../../config', 'riot_accounts.json');
        let accounts = {};
        if (fs.existsSync(accountsPath)) {
            try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e) {}
        }

        const accountList = Object.keys(accounts);

        if (accountList.length === 0) {
            return interaction.editReply({ 
                content: '❌ Nenhuma conta Riot vinculada encontrada. Use o comando `/link` para cadastrar e vincular uma conta.' 
            });
        }

        const selectedInput = interaction.options.getString('conta');

        if (selectedInput === 'none') {
            return interaction.editReply({ 
                content: '❌ Nenhuma conta válida foi selecionada. Use o comando `/link` para cadastrar sua conta Riot.' 
            });
        }

        // If user specified a target account name
        if (selectedInput) {
            const targetKey = accountList.find(k => k.toLowerCase() === selectedInput.trim().toLowerCase());
            
            if (!targetKey) {
                const availableStr = accountList.map(a => `• **${a}**`).join('\n');
                return interaction.editReply({ 
                    content: `❌ A conta **${selectedInput}** não foi encontrada.\n\n**Contas disponíveis:**\n${availableStr}` 
                });
            }

            return await activateAccountSession(interaction, targetKey, accounts[targetKey], accountsPath, accounts);
        }

        // If user has only 1 account registered, select it automatically
        if (accountList.length === 1) {
            const targetKey = accountList[0];
            return await activateAccountSession(interaction, targetKey, accounts[targetKey], accountsPath, accounts);
        }

        // If multiple accounts exist and no option specified, present a Select Menu using custom embed
        const selectOptions = accountList.slice(0, 25).map(accName => {
            const accData = accounts[accName];
            const region = accData.region || 'BR1';
            const rp = accData.rp || 0;
            return {
                label: accName,
                description: `Região: ${region} | RP: ${rp.toLocaleString('pt-BR')}`,
                value: accName,
                emoji: '🎮'
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_active_riot_account')
            .setPlaceholder('Selecione a conta Riot para ativar na sessão...')
            .addOptions(selectOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = buildCustomEmbed('login_select', interaction.client, interaction, {
            accountCount: String(accountList.length)
        });

        const msg = await interaction.editReply({ embeds: [embed], components: [row] });

        // Component Collector for Select Menu interaction
        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '❌ Apenas você pode interagir com este menu.', ephemeral: true });
            }

            await i.deferUpdate();
            const chosenAccName = i.values[0];
            collector.stop();

            if (accounts[chosenAccName]) {
                await activateAccountSession(interaction, chosenAccName, accounts[chosenAccName], accountsPath, accounts);
            }
        });
    }
};

async function activateAccountSession(interaction, accountName, accData, accountsPath, allAccounts) {
    let accessToken = accData.accessToken;
    let entitlementsToken = accData.entitlementsToken;
    let region = accData.region || 'BR1';

    // Attempt token refresh via SSID if stored
    if (accData.ssid) {
        try {
            const refreshed = await reauthWithSSID(accData.ssid);
            if (refreshed && refreshed.accessToken) {
                accessToken = refreshed.accessToken;
                entitlementsToken = await getEntitlements(accessToken);
                accData.accessToken = accessToken;
                accData.entitlementsToken = entitlementsToken;
                accData.expired = false;
                allAccounts[accountName] = accData;
                fs.writeFileSync(accountsPath, JSON.stringify(allAccounts, null, 2), 'utf8');
            }
        } catch(e) {}
    }

    // Try fetching fresh balance
    let rp = accData.rp || 0;
    let be = accData.be || 0;
    try {
        const bal = await getStoreBalance(accessToken, entitlementsToken, region);
        if (bal && typeof bal.rp === 'number') {
            rp = bal.rp;
            be = bal.be || be;
            accData.rp = rp;
            accData.be = be;
            allAccounts[accountName] = accData;
            fs.writeFileSync(accountsPath, JSON.stringify(allAccounts, null, 2), 'utf8');
        }
    } catch(e) {}

    // Store in global sessions map
    const userStoreSessions = global.userStoreSessions || new Map();
    userStoreSessions.set(interaction.user.id, {
        accountName: accountName,
        accessToken: accessToken,
        entitlementsToken: entitlementsToken,
        region: region,
        tokens: accData
    });
    global.userStoreSessions = userStoreSessions;

    const successEmbed = buildCustomEmbed('login_success', interaction.client, interaction, {
        accountName: accountName,
        region: region,
        rp: rp.toLocaleString('pt-BR'),
        be: be.toLocaleString('pt-BR'),
        level: accData.summonerLevel ? String(accData.summonerLevel) : '30',
        banned: accData.expired ? 'Sim (Expirado)' : 'Não'
    });

    return interaction.editReply({ embeds: [successEmbed], components: [] });
}
