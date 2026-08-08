const { buildCustomEmbed } = require("../../utils/customEmbeds.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'ticket',
    description: '📩 Envia o painel fixo da loja no chat.',
    async execute(interaction) {
        const embed = buildCustomEmbed('ticket_welcome', interaction.client, interaction);

        const fs = require('fs');
        const path = require('path');
        const embedsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/embeds.json'), 'utf8'));
        const cfg = embedsData['ticket_welcome'] || {};

        let style = ButtonStyle.Danger;
        if (cfg.buttonStyle) {
            if (cfg.buttonStyle.toLowerCase() === 'primary' || cfg.buttonStyle.toLowerCase() === 'blue') style = ButtonStyle.Primary;
            if (cfg.buttonStyle.toLowerCase() === 'secondary' || cfg.buttonStyle.toLowerCase() === 'gray') style = ButtonStyle.Secondary;
            if (cfg.buttonStyle.toLowerCase() === 'success' || cfg.buttonStyle.toLowerCase() === 'green') style = ButtonStyle.Success;
            if (cfg.buttonStyle.toLowerCase() === 'danger' || cfg.buttonStyle.toLowerCase() === 'red') style = ButtonStyle.Danger;
        }

        const bLabel = cfg.buttonLabel || 'Open Store';
        const bEmoji = cfg.buttonEmoji || '🛒';

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_loja')
                .setLabel(bLabel)
                .setStyle(style)
                .setEmoji(bEmoji)
        );

        await interaction.reply({ embeds: [embed], components: [btn] });
    }
};
