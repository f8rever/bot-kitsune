const { ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'embeds',
    description: '🦊 Kitsune | Painel de Gerenciamento de Embeds',
    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({ content: '❌ Você precisa ser Administrador ou Staff para usar este comando.', ephemeral: true });
        }

        const embed = buildCustomEmbed('embeds_panel', interaction.client, interaction);

        const menu1 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_embed_select_1')
                .setPlaceholder('🛒 Loja, Tickets, Pedidos & Pagamento...')
                .addOptions([
                    { label: 'Painel Boas-Vindas da Loja (/ticket)', description: 'Mensagem inicial do painel fixo da loja no chat', value: 'ticket_welcome', emoji: '✉️' },
                    { label: 'Resumo do Pedido no Ticket', description: 'Embed do pedido gerado dentro do canal do ticket', value: 'ticket_order_received', emoji: '📋' },
                    { label: 'Formas de Pagamento (/ticket)', description: 'Embed com métodos de pagamento aceitos', value: 'ticket_payment_methods', emoji: '💶' },
                    { label: 'Autenticação de Região da Loja', description: 'Menu de escolha de região (BR, NA, EUW, etc.)', value: 'store_authentication', emoji: '🌍' },
                    { label: 'Central de Vendas (Categorias)', description: 'Menu de categorias (Skins, Loots, etc.)', value: 'store_sales_center', emoji: '🛒' },
                    { label: 'Botão: Back to Main Categories', description: 'Personalizar texto, emoji e cor do botão voltar', value: 'store_back_button', emoji: '⬅️' },
                    { label: 'Tabela de Preços de Skins', description: 'Embed da tabela visual de skins', value: 'tabela_skins', emoji: '📊' },
                    { label: 'Tabela de Preços de Loots', description: 'Embed da tabela visual de loots', value: 'tabela_loot', emoji: '📦' },
                    { label: 'Tabela de Preços de Acessórios', description: 'Embed da tabela de acessórios/cromas', value: 'tabela_acessorios', emoji: '👑' },
                    { label: 'Modelo de Anúncio Geral (/anuncio)', description: 'Embed padrão para comunicados e promoções', value: 'broadcast_announcement', emoji: '📢' },
                    { label: 'Painel de Suporte ao Cliente', description: 'Embed do painel de suporte', value: 'support_panel', emoji: '🎫' },
                    { label: 'Painel Administrativo', description: 'Embed do painel admin', value: 'admin_panel', emoji: '⚙️' },
                    { label: 'Painel Principal Emojis Manager', description: 'Embed do comando /emojis', value: 'emojis_panel', emoji: '✨' },
                    { label: 'Painel Principal Embeds Manager', description: 'Embed do comando /embeds', value: 'embeds_panel', emoji: '📝' }
                ])
        );

        const menu2 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_embed_select_2')
                .setPlaceholder('📦 Categorias & Catálogos da Loja...')
                .addOptions([
                    { label: 'Skins, Cromas & Pacotes', description: 'Menu da Categoria, Skins, Cromas e Bundles', value: 'subgroup_skins', emoji: '🎨' },
                    { label: 'Loot, Passes, Baús & Orbes', description: 'Menu da Categoria, Orbes, Passes, Hextech e Mistério', value: 'subgroup_loot', emoji: '🔮' },
                    { label: 'Campeões & Eternos', description: 'Menu da Categoria, Campeões e Eternos', value: 'subgroup_champions', emoji: '⚔️' },
                    { label: 'Acessórios & TFT', description: 'Menu da Categoria, Emotes, Wards, Ícones, Boosts, Chibis e Arenas', value: 'subgroup_accessories', emoji: '👑' },
                    { label: 'Destaques & Ofertas Especiais', description: 'Menu da Categoria e Catálogo de Destaques', value: 'subgroup_highlights', emoji: '🌟' },
                    { label: 'Botão: Back to Main Categories', description: 'Personalizar texto, emoji e cor do botão voltar', value: 'store_back_button', emoji: '⬅️' }
                ])
        );

        const menu3 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_embed_select_3')
                .setPlaceholder('🛡️ Verificação, Convites & Comandos...')
                .addOptions([
                    { label: 'Verificação - Painel (/verify-panel)', description: 'Embed do painel de verificação', value: 'verify_panel', emoji: '🛡️' },
                    { label: 'Verificação - Sucesso', description: 'Embed efêmera de verificado com sucesso', value: 'verify_success', emoji: '✅' },
                    { label: 'Boas-Vindas & Convites (Entrada)', description: 'Mensagem de boas-vindas com dados do convite', value: 'welcome_invite', emoji: '👋' },
                    { label: 'Convites - Perfil (/invites)', description: 'Embed do comando /invites', value: 'invites_profile', emoji: '👥' },
                    { label: 'Login - Seleção de Conta', description: 'Embed do menu de escolha de conta no /login', value: 'login_select', emoji: '🔐' },
                    { label: 'Login - Sucesso e Informações', description: 'Embed final de sucesso do /login', value: 'login_success', emoji: '🛡️' },
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

        await interaction.reply({ embeds: [embed], components: [menu1, menu2, menu3], ephemeral: true });
    }
};
