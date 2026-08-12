const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'embeds',
    description: '🦊 Kitsune | Painel de Gerenciamento de Embeds',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Você precisa ser Administrador para usar este comando.', ephemeral: true });
        }

        const embed = buildCustomEmbed('embeds_panel', interaction.client, interaction);

        const menu1 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_embed_select_1')
                .setPlaceholder('🛒 Loja, Tabelas & Catálogos...')
                .addOptions([
                    { label: 'Painel Boas-Vindas da Loja (/ticket)', description: 'Mensagem inicial do painel fixo da loja no chat', value: 'ticket_welcome', emoji: '✉️' },
                    { label: 'Formas de Pagamento (/ticket)', description: 'Embed de métodos de pagamento', value: 'ticket_payment_methods', emoji: '💶' },
                    { label: 'Autenticação de Região da Loja', description: 'Menu de escolha de região', value: 'store_authentication', emoji: '🌍' },
                    { label: 'Central de Vendas (Categorias)', description: 'Menu de categorias (Skins, Loots, etc.)', value: 'store_sales_center', emoji: '🛒' },
                    { label: 'Catálogo de Destaques', description: 'Página de destaques e pacotes da loja', value: 'catalog_highlights', emoji: '🌟' },
                    { label: 'Catálogo de Skins', description: 'Página de skins de campeões', value: 'catalog_skins', emoji: '👕' },
                    { label: 'Catálogo de Passes', description: 'Página de passes de evento', value: 'catalog_passes', emoji: '🎫' },
                    { label: 'Catálogo de Cromas', description: 'Página de cromas de campeões', value: 'catalog_cromas', emoji: '🎨' },
                    { label: 'Catálogo de Eternos', description: 'Página de eternos', value: 'catalog_eternos', emoji: '🏆' },
                    { label: 'Catálogo de Campeões', description: 'Página de campeões', value: 'catalog_champions', emoji: '⚔️' },
                    { label: 'Catálogo de Emotes', description: 'Página de emotes', value: 'catalog_emotes', emoji: '😃' },
                    { label: 'Catálogo de Ícones', description: 'Página de ícones de invocador', value: 'catalog_icones', emoji: '🖼️' },
                    { label: 'Catálogo de Sentinelas', description: 'Página de sentinelas/wards', value: 'catalog_wards', emoji: '👁️' },
                    { label: 'Catálogo de Lendas / Chibis', description: 'Página de Little Legends e Chibis', value: 'catalog_little_legends', emoji: '🐥' },
                    { label: 'Catálogo de Arenas TFT', description: 'Página de tabuleiros e arenas TFT', value: 'catalog_tft_arena', emoji: '🏟️' },
                    { label: 'Catálogo de Boosts', description: 'Página de boosts', value: 'catalog_boosts', emoji: '⚡' },
                    { label: 'Catálogo de Presentes Mistério', description: 'Página de presentes mistério', value: 'catalog_misterio', emoji: '🎁' },
                    { label: 'Catálogo de Hextech (Baús/Chaves)', description: 'Página de baús e chaves hextech', value: 'catalog_hextech', emoji: '🔑' },
                    { label: 'Catálogo de Orbes & Cápsulas', description: 'Página de orbes e cápsulas de espólio', value: 'catalog_orbes', emoji: '🔮' },
                    { label: 'Tabela de Preços de Skins', description: 'Embed da tabela visual de skins', value: 'tabela_skins', emoji: '📊' },
                    { label: 'Tabela de Preços de Loots', description: 'Embed da tabela visual de loots', value: 'tabela_loot', emoji: '📦' },
                    { label: 'Painel Principal Emojis Manager', description: 'Embed do comando /emojis', value: 'emojis_panel', emoji: '✨' },
                    { label: 'Painel Principal Embeds Manager', description: 'Embed do comando /embeds', value: 'embeds_panel', emoji: '⚙️' }
                ])
        );

        const menu2 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_embed_select_2')
                .setPlaceholder('🎮 Comandos, Logins & Dashboards...')
                .addOptions([
                    { label: 'Login - Seleção de Conta', description: 'Embed do menu de escolha de conta no /login', value: 'login_select', emoji: '🔐' },
                    { label: 'Login - Sucesso e Informações', description: 'Embed final de sucesso do /login', value: 'login_success', emoji: '🛡️' },
                    { label: 'Login - Passo 1 (Carregamento)', description: 'Embed de inicialização de login', value: 'login_loading_1', emoji: '⏳' },
                    { label: 'Login - Passo 2 (Tokens)', description: 'Embed de atualização de tokens', value: 'login_loading_2', emoji: '☑️' },
                    { label: 'Login - Passo 3 (Amigos)', description: 'Embed de carregamento de amigos', value: 'login_loading_3', emoji: '👥' },
                    { label: 'Link - Sucesso (/link)', description: 'Embed de sucesso ao vincular conta no /link', value: 'link_success', emoji: '🔗' },
                    { label: 'AddFriend - Envio de Amizade', description: 'Embed enviada ao solicitar amizade no /addfriend', value: 'addfriend_sent', emoji: '➕' },
                    { label: 'Friendlist - Lista Principal', description: 'Embed exibida ao listar amigos no /friendlist', value: 'friendlist_main', emoji: '👥' },
                    { label: 'Friendlist - Pedidos Pendentes', description: 'Embed exibida ao listar pedidos recebidos', value: 'friendlist_requests', emoji: '📥' },
                    { label: 'Friendlist - Pedidos Aceitos', description: 'Embed exibida ao aceitar pedidos em lote', value: 'friendlist_accepted', emoji: '✅' },
                    { label: 'Gift - Envio de Presente', description: 'Embed exibida ao enviar um presente com sucesso', value: 'gift_sent', emoji: '🎁' },
                    { label: 'Gift - Falha no Envio', description: 'Embed exibida ao falhar no envio do presente', value: 'gift_failed', emoji: '❌' },
                    { label: 'Gift - Log de Auditoria (Staff)', description: 'Log de envio de presente enviado à staff', value: 'gift_staff_log', emoji: '📊' },
                    { label: 'Dashboard RP / BE', description: 'Embed de saldo RP/BE no painel', value: 'dashboard_rp', emoji: '🪙' },
                    { label: 'Dashboard Informações da Conta', description: 'Embed de detalhes da conta no painel', value: 'dashboard_account', emoji: 'ℹ️' },
                    { label: 'Dashboard Lista de Amigos', description: 'Embed de amigos no painel', value: 'dashboard_friends', emoji: '🫂' },
                    { label: 'Config - Sucesso (/config)', description: 'Embed de sucesso do comando /config', value: 'config_success', emoji: '⚙️' }
                ])
        );

        await interaction.reply({ embeds: [embed], components: [menu1, menu2], ephemeral: true });
    }
};
