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
            .setDescription('Welcome to the **Embed Manager**! Here you can customize the text, colors, and images of every embed in the bot.\n\nSelect the embed you wish to edit from the menu below:');

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_embed_select')
                .setPlaceholder('Select an embed to edit...')
                .addOptions([
                    { label: 'Login Success', description: 'Sent after logging in with /login or /link', value: 'login_success', emoji: '✅' },
                    { label: 'RP / BE Balance Dashboard', description: 'Shows RP and BE currency balance inside /login dashboard', value: 'dashboard_rp', emoji: '🪙' },
                    { label: 'Account Info Dashboard', description: 'Shows summoner level, region, and ban status in /login dashboard', value: 'dashboard_account', emoji: 'ℹ️' },
                    { label: 'Friends List Dashboard', description: 'Shows list of in-game friends inside /login dashboard', value: 'dashboard_friends', emoji: '🫂' },
                    { label: 'Ticket Welcome Panel', description: 'Main store panel message sent by /ticket with Buy button', value: 'ticket_welcome', emoji: '✉️' },
                    { label: 'Store Authentication', description: 'Region selection menu shown when starting store purchase', value: 'store_authentication', emoji: '🌍' },
                    { label: 'Store Sales Center', description: 'Category selection menu (Skins, Loots, etc.) in store', value: 'store_sales_center', emoji: '🛒' },
                    { label: 'Catalog Highlights', description: 'Highlights category page showing bundles & sets', value: 'catalog_highlights', emoji: '🌟' },
                    { label: 'Catalog Skins', description: 'Skins category page showing champion skins', value: 'catalog_skins', emoji: '👕' },
                    { label: 'Catalog Chromas', description: 'Chromas category page showing champion chromas', value: 'catalog_cromas', emoji: '🎨' },
                    { label: 'Catalog Passes & Loots', description: 'Passes category page showing passes, orbs & chests', value: 'catalog_passes', emoji: '🎫' },
                    { label: 'Catalog Champions', description: 'Champions category page showing purchasable champions', value: 'catalog_champions', emoji: '⚔️' },
                    { label: 'Catalog Eternals', description: 'Eternals category page showing champion eternals', value: 'catalog_eternos', emoji: '🏆' },
                    { label: 'Ticket Order Received', description: 'Summary message inside newly created ticket channel', value: 'ticket_order_received', emoji: '🎫' },
                    { label: 'Ticket Payment Methods', description: 'Message sent when clicking Payment Methods button in ticket', value: 'ticket_payment_methods', emoji: '💳' },
                    { label: 'Skins Price Table', description: 'Embed displayed for Skins price table', value: 'tabela_skins', emoji: '👕' },
                    { label: 'Loot Price Table', description: 'Embed displayed for Loots price table', value: 'tabela_loot', emoji: '📦' },
                    { label: 'Admin Control Panel', description: 'Admin control panel message sent by /admin_panel', value: 'admin_panel', emoji: '⚙️' },
                    { label: 'Support Panel', description: 'Support panel message sent by /panel', value: 'support_panel', emoji: '🛠️' }
                ])
        );

        await interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });
    }
};
