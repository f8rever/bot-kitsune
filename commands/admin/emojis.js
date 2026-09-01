const { ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'emojis',
    description: '🦊 Kitsune | Gerenciador e Editor Visual de Emojis do Bot',
    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({ content: '🚫 Você precisa ser Administrador ou Staff para gerenciar os emojis do bot.', ephemeral: true });
        }

        const embed = buildCustomEmbed('emojis_panel', interaction.client, interaction);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_emojis_categorias')
                .setPlaceholder('Selecione uma categoria de emojis para editar')
                .addOptions([
                    { label: '🏪 Menu Principal da Loja', description: 'Emojis das 5 categorias principais da loja', value: 'menu_principal', emoji: '🏪' },
                    { label: '✨ Skins & Tiers', description: 'Emojis de Ultimate, Lendária, Épica, Cromas, etc.', value: 'skins', emoji: '✨' },
                    { label: '📦 Espólios & Loot', description: 'Emojis de Passes, Orbes, Baús, Chaves, Cápsulas', value: 'loot', emoji: '📦' },
                    { label: '👑 Acessórios & Itens', description: 'Emojis de Emotes, Wards, Ícones, Boosts, Lendas', value: 'acessorios', emoji: '👑' },
                    { label: '🌟 Destaques & Pacotes', description: 'Emojis de Pacotes, Assinaturas, Bundles, Sets', value: 'bundles', emoji: '🌟' },
                    { label: '🛠️ Utilidades Gerais', description: 'Setas, Sucesso, Erro, Fogo, Carregamento, etc.', value: 'utilidades', emoji: '🛠️' },
                    { label: '🛒 Loja & Moedas', description: 'Emojis de RP, Dinheiro, Essências, Carrinho', value: 'loja_produtos', emoji: '🛒' },
                    { label: '📊 Status da Loja', description: 'Estoque, Promoção, Novidade, Entrega Rápida', value: 'loja_status', emoji: '📊' },
                    { label: '🛡️ Staff & Suporte', description: 'Emojis de Dono, Moderador, Ajuda, Suporte', value: 'staff_e_suporte', emoji: '🛡️' },
                    { label: '⚔️ Roles do LoL', description: 'Assassino, Mago, Atirador, Suporte, Tank, Lutador', value: 'lol_roles', emoji: '⚔️' },
                    { label: '🌍 Regiões do LoL', description: 'Bandeiras e ícones de BR, NA, EUW, EUNE, KR, etc.', value: 'lol_regions', emoji: '🌍' },
                    { label: '🎫 Sistema de Tickets', description: 'Emojis exibidos dentro do embed dos tickets', value: 'ticket', emoji: '🎫' }
                ])
        );

        await interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });
    }
};
