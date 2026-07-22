const { buildCustomEmbed } = require("../../utils/customEmbeds.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'painel_admin',
    description: 'Envia o painel de administração',
    async execute(interaction) {
        const embed = buildCustomEmbed('admin_panel', interaction.client, interaction);

        await interaction.reply({ embeds: [embed] });
    }
};