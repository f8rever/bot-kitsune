const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'emojis',
    description: '🦊 Kitsune | Emojis Manager Panel',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ You must be an Administrator to use this command.', ephemeral: true });
        }

        const embed = buildCustomEmbed('emojis_panel', interaction.client, interaction);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_emojis_categorias')
                .setPlaceholder('Select a category')
                .addOptions([
                    { label: 'Skins', value: 'skins', emoji: '✨' },
                    { label: 'Loot', value: 'loot', emoji: '📦' },
                    { label: 'Utilities', value: 'utilidades', emoji: '🛠️' },
                    { label: 'Store Products', value: 'loja_produtos', emoji: '🛒' },
                    { label: 'Store Status', value: 'loja_status', emoji: '📊' },
                    { label: 'Staff Roles', value: 'staff_roles', emoji: '🛡️' },
                    { label: 'LoL Roles', value: 'lol_roles', emoji: '⚔️' },
                    { label: 'LoL Regions', value: 'lol_regions', emoji: '🌍' },
                    { label: 'Ticket', value: 'ticket', emoji: '🎫' }
                ])
        );

        await interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });
    }
};
