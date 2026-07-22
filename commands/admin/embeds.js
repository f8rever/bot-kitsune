const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const formatEmbed = require("../../utils/embedFormat.js");

module.exports = {
    name: 'embeds',
    description: '🦊 Kitsune | Embed Manager Panel',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ You must be an Administrator to use this command.', ephemeral: true });
        }

        const embed = formatEmbed(new EmbedBuilder(), interaction.client)
            .setTitle('🦊 Kitsune | Embed Manager')
            .setColor('#F43F5E')
            .setDescription('Welcome to the **Embed Manager**! Here you can customize the text, colors, and images of all the bot embeds.\n\nSelect the embed you wish to edit below:');

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_embed_select')
                .setPlaceholder('Select an embed to edit')
                .addOptions([
                    { label: 'Login Sucesso', description: 'Mensagem enviada após o login', value: 'login_success', emoji: '✅' },
                    { label: 'Painel RP', description: 'Embed com o saldo de RP e BE', value: 'dashboard_rp', emoji: '🪙' },
                    { label: 'Painel Conta', description: 'Embed com informações e nível da conta', value: 'dashboard_account', emoji: 'ℹ️' },
                    { label: 'Painel Amigos', description: 'Embed com a lista de amigos do LoL', value: 'dashboard_friends', emoji: '🫂' },
                    { label: 'Ticket Welcome', description: 'The message sent by /ticket', value: 'ticket_welcome', emoji: '✉️' },
                    { label: 'Store Authentication', description: 'The region selection menu', value: 'store_authentication', emoji: '🌍' },
                    { label: 'Store Sales Center', description: 'The category selection menu', value: 'store_sales_center', emoji: '🛒' },
                    { label: 'Catalog Highlights', description: 'Highlights category page', value: 'catalog_highlights', emoji: '🌟' },
                    { label: 'Catalog Skins', description: 'Skins category page', value: 'catalog_skins', emoji: '👕' },
                    { label: 'Catalog Chromas', description: 'Chromas category page', value: 'catalog_cromas', emoji: '🎨' },
                    { label: 'Catalog Passes', description: 'Passes category page', value: 'catalog_passes', emoji: '🎫' },
                    { label: 'Catalog Champions', description: 'Champions category page', value: 'catalog_champions', emoji: '⚔️' },
                    { label: 'Catalog Eternals', description: 'Eternals category page', value: 'catalog_eternos', emoji: '🏆' },
                    { label: 'Ticket Order Received', description: 'The message inside the ticket channel', value: 'ticket_order_received', emoji: '🎫' },
                    { label: 'Admin Panel', description: 'The message sent by /painel_admin', value: 'admin_panel', emoji: '⚙️' },
                    { label: 'Support Panel', description: 'The message sent by /painel', value: 'support_panel', emoji: '🛠️' },
                    { label: 'Table Skins', description: 'The skins table embed', value: 'tabela_skins', emoji: '👕' },
                    { label: 'Table Loot', description: 'The loot table embed', value: 'tabela_loot', emoji: '📦' },
                    { label: 'Payment Methods', description: 'The message sent by Payment Methods button in tickets', value: 'ticket_payment_methods', emoji: '💳' }
                ])
        );

        await interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });
    }
};
