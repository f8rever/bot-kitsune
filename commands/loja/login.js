const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getStoreBalance, getEntitlements, reauthWithSSID } = require('../../utils/riotAuth.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

function getAccountsFilePath() {
    return path.resolve(__dirname, '../../config/riot_accounts.json');
}

function loadAccountsFromDisk() {
    const accountsPath = getAccountsFilePath();
    if (fs.existsSync(accountsPath)) {
        try {
            return { accountsPath, accounts: JSON.parse(fs.readFileSync(accountsPath, 'utf8')) };
        } catch (e) {}
    }
    return { accountsPath, accounts: {} };
}

/** Monta a action row com os botões do painel da conta */
function buildDashboardButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_rp').setLabel('RP').setStyle(ButtonStyle.Secondary).setEmoji('🪙'),
        new ButtonBuilder().setCustomId('btn_account').setLabel('Account').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️'),
        new ButtonBuilder().setCustomId('btn_friend').setLabel('Friends').setStyle(ButtonStyle.Primary).setEmoji('🫂'),
        new ButtonBuilder().setCustomId('btn_back').setStyle(ButtonStyle.Secondary).setEmoji('🔄')
    );
}

module.exports = {
    name: 'login',
    description: 'Seleciona e conecta a uma conta Riot salva. Exibe o painel completo da conta após autenticar.',
    options: [
        {
            name: 'conta',
            description: 'Nome da conta Riot cadastrada (Ex: Invocador#BR1)',
            type: 3,
            required: false,
            autocomplete: true
        }
    ],

    // ── Autocomplete ─────────────────────────────────────────────────────────
    async autocomplete(interaction) {
        try {
            const focusedValue = (interaction.options.getFocused() || '').toLowerCase().trim();
            const { accounts } = loadAccountsFromDisk();
            const choices = Object.keys(accounts);

            if (choices.length === 0) {
                return await interaction.respond([
                    { name: '❌ Nenhuma conta vinculada. Use /link para cadastrar!', value: 'none' }
                ]);
            }

            const filtered = choices
                .filter(accName => {
                    const accData = accounts[accName] || {};
                    const region = accData.region || '';
                    const fullSearch = `${accName} ${region}`.toLowerCase();
                    return fullSearch.includes(focusedValue) || accName.toLowerCase().split('#')[0].includes(focusedValue);
                })
                .slice(0, 25)
                .map(accName => {
                    const acc = accounts[accName] || {};
                    const isExpired = acc.expired === true;
                    const statusDot = isExpired ? '🔴' : '🟢';
                    const region = acc.region || 'BR1';
                    const rpStr = typeof acc.rp === 'number' ? `${acc.rp.toLocaleString('pt-BR')} RP` : '0 RP';
                    const infoStr = isExpired ? 'Expirado' : rpStr;
                    const displayName = `${statusDot} ${accName} [${region} • ${infoStr}]`.substring(0, 100);
                    return { name: displayName, value: accName };
                });

            if (filtered.length === 0) {
                return await interaction.respond([
                    { name: `❌ Nenhuma conta encontrada para "${focusedValue}"`, value: 'none' }
                ]);
            }

            await interaction.respond(filtered);
        } catch (err) {
            console.error('[Login Autocomplete Error]', err);
            try { await interaction.respond([]); } catch (e) {}
        }
    },

    // ── Execute ───────────────────────────────────────────────────────────────
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const { accountsPath, accounts } = loadAccountsFromDisk();
        const accountList = Object.keys(accounts);

        if (accountList.length === 0) {
            return interaction.editReply({
                content: '❌ Nenhuma conta Riot vinculada encontrada no bot. Use `/link` para cadastrar sua conta Riot primeiro!'
            });
        }

        const selectedInput = interaction.options.getString('conta');

        // Valor inválido do autocomplete (digitou algo que não existe)
        if (selectedInput === 'none') {
            return interaction.editReply({
                content: '❌ Nenhuma conta válida selecionada. Use `/link` para cadastrar sua conta Riot.'
            });
        }

        // ── Conta especificada via autocomplete ──────────────────────────────
        if (selectedInput) {
            const cleanInput = selectedInput.trim().toLowerCase();
            const targetKey = accountList.find(k => {
                const kLower = k.toLowerCase();
                const nameWithoutTag = kLower.split('#')[0];
                return kLower === cleanInput ||
                    cleanInput.includes(kLower) ||
                    kLower.includes(cleanInput) ||
                    nameWithoutTag === cleanInput.split('#')[0];
            });

            if (!targetKey) {
                const availableStr = accountList.map(a => `• **${a}**`).join('\n');
                return interaction.editReply({
                    content: `❌ Conta **${selectedInput}** não encontrada.\n\n**Contas disponíveis:**\n${availableStr}`
                });
            }

            return await activateAccountSession(interaction, targetKey, accounts[targetKey], accountsPath, accounts);
        }

        // ── Só 1 conta → seleciona automaticamente ───────────────────────────
        if (accountList.length === 1) {
            return await activateAccountSession(interaction, accountList[0], accounts[accountList[0]], accountsPath, accounts);
        }

        // ── Múltiplas contas → mostra menu de seleção ────────────────────────
        const selectOptions = accountList.slice(0, 25).map(accName => {
            const accData = accounts[accName];
            const region = accData.region || 'BR1';
            const rp = accData.rp || 0;
            const statusDot = accData.expired ? '🔴' : '🟢';
            return {
                label: `${statusDot} ${accName}`.substring(0, 100),
                description: `Região: ${region} | RP: ${rp.toLocaleString('pt-BR')}`,
                value: accName,
                emoji: '🎮'
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_active_riot_account')
            .setPlaceholder('Selecione a conta Riot para ativar...')
            .addOptions(selectOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = buildCustomEmbed('login_select', interaction.client, interaction, {
            accountCount: String(accountList.length)
        });

        const msg = await interaction.editReply({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '❌ Apenas você pode interagir com este menu.', ephemeral: true });
            }
            await i.deferUpdate();
            const chosenAccName = i.values[0];
            collector.stop();
            if (accounts[chosenAccName]) {
                await activateAccountSession(i, chosenAccName, accounts[chosenAccName], accountsPath, accounts);
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                interaction.editReply({ components: [] }).catch(() => {});
            }
        });
    }
};

// ── Função principal: autentica, sincroniza e exibe o painel ──────────────────
async function activateAccountSession(targetInt, accountName, accData, accountsPath, allAccounts) {
    let accessToken = accData.accessToken;
    let entitlementsToken = accData.entitlementsToken;
    const region = accData.region || 'BR1';

    // ── 1. Renovar token via SSID ────────────────────────────────────────────
    if (accData.ssid) {
        try {
            const refreshed = await reauthWithSSID(accData.ssid);
            if (refreshed && refreshed.accessToken) {
                accessToken = refreshed.accessToken;
                if (refreshed.idToken) accData.idToken = refreshed.idToken;
                // Renovar entitlements com o novo token
                try {
                    entitlementsToken = await getEntitlements(accessToken);
                } catch (e) {}
                accData.accessToken = accessToken;
                accData.entitlementsToken = entitlementsToken;
                accData.expired = false;
                // Limpar cache XMPP para forçar renovação
                delete accData.geopasToken;
                delete accData.chatUri;
                delete accData.chatDom;
                allAccounts[accountName] = accData;
                try { fs.writeFileSync(accountsPath, JSON.stringify(allAccounts, null, 2), 'utf8'); } catch (e) {}
                console.log(`[Login] Token renovado via SSID para: ${accountName}`);
            }
        } catch (e) {
            console.warn(`[Login] Aviso: falha ao renovar via SSID para ${accountName}:`, e.message);
        }
    }

    // ── 2. Sincronizar saldo (RP + BE) ───────────────────────────────────────
    let rp = accData.rp || 0;
    let be = accData.be || 0;
    try {
        const bal = await getStoreBalance(accessToken, entitlementsToken, region);
        if (bal && typeof bal.rp === 'number') {
            rp = bal.rp;
            be = bal.ip ?? bal.be ?? accData.be ?? 0;
            if (bal.summonerLevel) accData.summonerLevel = bal.summonerLevel;
            accData.rp = rp;
            accData.be = be;
            accData.expired = false;
            allAccounts[accountName] = accData;
            try { fs.writeFileSync(accountsPath, JSON.stringify(allAccounts, null, 2), 'utf8'); } catch (e) {}
        } else if (bal && bal.error === 401) {
            // Token inválido mesmo após tentativa de renovação
            accData.expired = true;
            allAccounts[accountName] = accData;
            try { fs.writeFileSync(accountsPath, JSON.stringify(allAccounts, null, 2), 'utf8'); } catch (e) {}
        }
    } catch (e) {
        console.warn(`[Login] Aviso: não foi possível buscar saldo para ${accountName}:`, e.message);
    }

    // ── 3. Registrar sessão na memória global ────────────────────────────────
    if (!global.userStoreSessions) global.userStoreSessions = new Map();
    global.userStoreSessions.set(targetInt.user.id, {
        accountName,
        accessToken,
        entitlementsToken,
        region,
        tokens: accData
    });

    // ── 4. Montar e exibir painel com botões ─────────────────────────────────
    const panelEmbed = buildCustomEmbed('login_success', targetInt.client, targetInt, {
        accountName,
        region,
        rp: rp.toLocaleString('en-US'),
        be: be.toLocaleString('en-US'),
        level: accData.summonerLevel ? String(accData.summonerLevel) : '?',
        banned: accData.expired ? '🔴 **Expirado**' : '🟢 **Ativa**'
    });

    const dashboardRow = buildDashboardButtons();

    const replyPayload = { embeds: [panelEmbed], components: [dashboardRow] };

    if (targetInt.deferred || targetInt.replied) {
        return targetInt.editReply(replyPayload);
    } else {
        return targetInt.reply({ ...replyPayload, ephemeral: true });
    }
}
