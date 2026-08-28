const { buildCustomEmbed } = require("../../utils/customEmbeds.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ticket',
    description: '🛒 Envia o painel fixo de compras da Kitsune Store.',
    options: [
        {
            name: 'canal',
            description: 'Canal de texto onde o painel fixo deve ser enviado (opcional)',
            type: 7, // CHANNEL
            channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            required: false
        }
    ],

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        const targetChannel = interaction.options.getChannel('canal');

        if (targetChannel && !isAdmin && !hasStaffRole) {
            return interaction.reply({
                content: '🚫 Você precisa ser Administrador ou Staff para enviar o painel da loja em outro canal.',
                ephemeral: true
            });
        }

        const embed = buildCustomEmbed('ticket_welcome', interaction.client, interaction);

        const embedsPath = path.join(__dirname, '../../config/embeds.json');
        let cfg = {};
        if (fs.existsSync(embedsPath)) {
            try {
                const embedsData = JSON.parse(fs.readFileSync(embedsPath, 'utf8'));
                cfg = embedsData['ticket_welcome'] || {};
            } catch(e) {}
        }

        let style = ButtonStyle.Secondary;
        if (cfg.buttonStyle) {
            const st = cfg.buttonStyle.toLowerCase();
            if (st === 'primary' || st === 'blue') style = ButtonStyle.Primary;
            if (st === 'secondary' || st === 'gray') style = ButtonStyle.Secondary;
            if (st === 'success' || st === 'green') style = ButtonStyle.Success;
            if (st === 'danger' || st === 'red') style = ButtonStyle.Danger;
        }

        const bLabel = cfg.buttonLabel || 'Comprar aqui';
        const bEmoji = cfg.buttonEmoji || '<:dinheiro:1527368514057408713>';

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_loja')
                .setLabel(bLabel)
                .setStyle(style)
                .setEmoji(bEmoji)
        );

        if (targetChannel) {
            try {
                await targetChannel.send({ embeds: [embed], components: [btn] });
                return interaction.reply({
                    content: `✅ Painel da loja enviado com sucesso no canal ${targetChannel}!`,
                    ephemeral: true
                });
            } catch (err) {
                console.error('[Ticket Command Error]', err);
                return interaction.reply({
                    content: `❌ Não foi possível enviar a mensagem no canal ${targetChannel}. Verifique as permissões do bot.`,
                    ephemeral: true
                });
            }
        }

        await interaction.reply({ embeds: [embed], components: [btn] });
    }
};
