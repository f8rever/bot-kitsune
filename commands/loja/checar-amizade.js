const { 
    ApplicationCommandOptionType, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { checkFriendshipEligibility, getSavedAccounts } = require('../../utils/friendshipChecker.js');

module.exports = {
    name: 'checar-amizade',
    description: '⏱️ Checa tempo de amizade e elegibilidade para envio de presentes (24h e 7 dias).',
    options: [
        {
            name: 'conta',
            description: 'Selecione a conta Riot (alt de envio) que deseja consultar',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
        {
            name: 'riot_id',
            description: 'Nome#TAG do cliente (opcional se executado dentro de um ticket de pedido)',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'regiao',
            description: 'Região do League of Legends',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: 'BR1 (Brasil)', value: 'BR1' },
                { name: 'NA1 (América do Norte)', value: 'NA1' },
                { name: 'EUW1 (Europa Ocidental)', value: 'EUW1' },
                { name: 'EUN1 (Europa Nórdica/Leste)', value: 'EUN1' },
                { name: 'LA1 (LAN)', value: 'LA1' },
                { name: 'LA2 (LAS)', value: 'LA2' }
            ]
        }
    ],

    // ── Autocomplete para sugestão interativa das contas ───────────────────────
    async autocomplete(interaction) {
        try {
            const focusedValue = (interaction.options.getFocused() || '').toLowerCase().trim();
            const accounts = getSavedAccounts();
            const choices = Object.keys(accounts);

            if (choices.length === 0) {
                return await interaction.respond([
                    { name: '❌ Nenhuma conta vinculada. Use /login ou /link!', value: 'none' }
                ]);
            }

            const filtered = choices
                .filter(accName => {
                    const accData = accounts[accName] || {};
                    const region = accData.region || '';
                    const fullSearch = `${accName} ${region}`.toLowerCase();
                    return fullSearch.includes(focusedValue) || accName.toLowerCase().includes(focusedValue);
                })
                .slice(0, 25)
                .map(accName => {
                    const acc = accounts[accName] || {};
                    const statusDot = acc.expired ? '🔴' : '🟢';
                    const region = acc.region || 'BR1';
                    const rpStr = typeof acc.rp === 'number' ? `${acc.rp.toLocaleString('pt-BR')} RP` : '';
                    const displayName = `${statusDot} ${accName} [${region} • ${rpStr || 'Conta Ativa'}]`.substring(0, 100);
                    return { name: displayName, value: accName };
                });

            await interaction.respond(filtered.length > 0 ? filtered : [
                { name: `❌ Nenhuma conta encontrada para "${focusedValue}"`, value: 'none' }
            ]);
        } catch (err) {
            console.error('[ChecarAmizade Autocomplete Error]', err);
            try { await interaction.respond([]); } catch (e) {}
        }
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const selectedAccount = interaction.options.getString('conta');
        let targetRiotId = interaction.options.getString('riot_id');
        let regiao = interaction.options.getString('regiao');

        if (selectedAccount === 'none') {
            return interaction.editReply({ content: '❌ Por favor, selecione uma conta válida na lista de sugestões.' });
        }

        // Se o riot_id não foi informado, tentar recuperar do pedido no canal do ticket
        if (!targetRiotId && interaction.channel) {
            const cart = global.ticketCarts?.get(interaction.channel.id);
            if (cart && cart.riotId && cart.riotId !== 'Unknown') {
                targetRiotId = cart.riotId;
                if (!regiao && cart.regiao) regiao = cart.regiao;
            } else {
                // Tentar ler das mensagens do canal
                try {
                    const messages = await interaction.channel.messages.fetch({ limit: 15 });
                    const botMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0);
                    if (botMsg && botMsg.embeds[0]) {
                        const fields = botMsg.embeds[0].fields || [];
                        const riotField = fields.find(f => f.name && (f.name.includes('Riot ID') || f.name.includes('Invocador')));
                        if (riotField) {
                            targetRiotId = riotField.value.replace(/[`*]/g, '').trim();
                        }
                        const regionField = fields.find(f => f.name && (f.name.includes('Região') || f.name.includes('Region')));
                        if (regionField && !regiao) {
                            regiao = regionField.value.replace(/[`*]/g, '').trim();
                        }
                    }
                } catch (e) {}
            }
        }

        if (!targetRiotId) {
            return interaction.editReply({
                content: '❌ Nenhum **Riot ID** informado! Informe o campo `riot_id: Nome#TAG` ou execute o comando dentro do canal do ticket.'
            });
        }

        const accounts = getSavedAccounts();
        const accData = accounts[selectedAccount];
        if (!regiao && accData && accData.region) {
            regiao = accData.region;
        }

        const res = await checkFriendshipEligibility(selectedAccount, targetRiotId, regiao);

        if (!res.success) {
            return interaction.editReply({ content: `❌ ${res.error}` });
        }

        const embed = new EmbedBuilder().setTimestamp();

        if (!res.found) {
            embed
                .setTitle('❌ Cliente Não Encontrado na Friendlist')
                .setColor('#EF4444')
                .setDescription([
                    `O cliente **${targetRiotId}** não está adicionado na conta **${selectedAccount}**!`,
                    '',
                    '**Possíveis Causas:**',
                    '• O cliente ainda não enviou o pedido de amizade.',
                    '• O pedido de amizade foi enviado mas ainda está **Pendente** na conta.',
                    '• O Riot ID informado contém algum erro de digitação.',
                    '',
                    '> *Clique no botão abaixo para enviar um pedido de amizade direto pelo bot:*'
                ].join('\n'))
                .addFields(
                    { name: '🤖 Conta Verificadora', value: `\`${selectedAccount}\``, inline: true },
                    { name: '🌍 Região', value: `\`${res.region || 'BR1'}\``, inline: true },
                    { name: '👥 Total de Amigos', value: `\`${res.totalFriends} amigos\``, inline: true }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`btn_send_friend_req__${encodeURIComponent(selectedAccount)}__${encodeURIComponent(targetRiotId)}`)
                    .setLabel('➕ Enviar Pedido de Amizade')
                    .setStyle(ButtonStyle.Success)
            );

            // Atualizar status no carrinho do ticket se estiver no canal
            if (interaction.channel && global.ticketCarts?.has(interaction.channel.id)) {
                const cart = global.ticketCarts.get(interaction.channel.id);
                cart.friendshipStatus = `❌ Não encontrado na Friendlist de **${selectedAccount}**`;
                try {
                    const { atualizarEmbedTicket } = require('../../index.js');
                    if (typeof atualizarEmbedTicket === 'function') {
                        await atualizarEmbedTicket(interaction.channel, interaction.client);
                    }
                } catch (e) {}
            }

            return interaction.editReply({ embeds: [embed], components: [row] });
        }

        // Cliente encontrado na Friendlist!
        const isEligible24h = res.eligible24h;
        const isEligible7d = res.eligible7d;

        const status24hText = isEligible24h
            ? '🟢 **Elegível (Mais de 24h)**'
            : `⏳ **Faltam ${res.remain24hFormatted}** (Libera em ${res.releaseDate24hFormatted})`;

        const status7dText = isEligible7d
            ? '🟢 **Elegível (Mais de 7 dias)**'
            : `⏱️ **Faltam ${res.remain7dFormatted}** (Libera em ${res.releaseDate7dFormatted})`;

        embed
            .setTitle(isEligible24h ? '🟢 Elegibilidade de Gifting Verificada' : '⏳ Amizade em Período de Cooldown')
            .setColor(isEligible24h ? '#10B981' : '#F59E0B')
            .setDescription([
                `O cliente **${res.friendName}** está adicionado como amigo na conta **${selectedAccount}**!`,
                '',
                `📅 **Amigos desde:** \`${res.sinceDateFormatted || 'Desconhecido'}\``,
                `⏱️ **Tempo decorrido de amizade:** \`${res.timeElapsed}\``,
                ''
            ].join('\n'))
            .addFields(
                { name: '⏱️ Status 24 Horas (Padrão LoL)', value: status24hText, inline: false },
                { name: '📅 Status 7 Dias (Eventos Especiais)', value: status7dText, inline: false }
            );

        // Se estiver dentro de um canal de ticket, atualizar a embed principal do ticket
        if (interaction.channel && global.ticketCarts?.has(interaction.channel.id)) {
            const cart = global.ticketCarts.get(interaction.channel.id);
            cart.friendshipStatus = isEligible24h
                ? `🟢 Elegível para presente (Amigos há ${res.timeElapsed} em ${selectedAccount})`
                : `⏳ Aguardando prazo (Faltam ${res.remain24hFormatted} em ${selectedAccount})`;

            try {
                const { atualizarEmbedTicket } = require('../../index.js');
                if (typeof atualizarEmbedTicket === 'function') {
                    await atualizarEmbedTicket(interaction.channel, interaction.client);
                }
            } catch (e) {}
        }

        return interaction.editReply({ embeds: [embed] });
    }
};
