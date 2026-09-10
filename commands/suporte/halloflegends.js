const { buildCustomEmbed } = require("../../utils/customEmbeds.js");
const { ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'halloflegends',
    description: '🏆 Envia o painel exclusivo do Hall of Legends 2026 (Caps).',
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
                content: '🚫 Você precisa ser Administrador ou Staff para enviar o painel do Hall of Legends em outro canal.',
                ephemeral: true
            });
        }

        const embed = buildCustomEmbed('hall_of_legends', interaction.client, interaction);

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_hall_of_legends_select')
                .setPlaceholder('🏆 Escolha o pacote do Hall of Legends que deseja...')
                .addOptions([
                    {
                        label: 'Passe Hall of Legends 2026 (Caps)',
                        description: '1.950 RP • Orianna Lenda Ascendida + 100 Níveis',
                        value: 'Passe Hall of Legends 2026 - Caps||99901664',
                        emoji: '🎫'
                    },
                    {
                        label: 'Coleção Tristana Lenda Ascendida',
                        description: '5.035 RP • Passe + Tristana Ascendida + Cosméticos',
                        value: 'Coleção Tristana Lenda Ascendida||99901665',
                        emoji: '💥'
                    },
                    {
                        label: 'Coleção Tristana Lenda Imortalizada',
                        description: '32.035 RP • Tristana Imortalizada (3 Formas) + Passe',
                        value: 'Coleção Tristana Lenda Imortalizada||99901666',
                        emoji: '👑'
                    },
                    {
                        label: 'Coleção Assinatura Tristana Imortalizada',
                        description: '58.865 RP • Coleção Completa + Assinatura Caps + Título',
                        value: 'Coleção Assinatura Tristana Lenda Imortalizada||99901667',
                        emoji: '🌟'
                    }
                ])
        );

        if (targetChannel) {
            try {
                await targetChannel.send({ embeds: [embed], components: [selectMenu] });
                return interaction.reply({
                    content: `✅ Painel do Hall of Legends 2026 enviado com sucesso no canal ${targetChannel}!`,
                    ephemeral: true
                });
            } catch (err) {
                console.error('[Hall of Legends Command Error]', err);
                return interaction.reply({
                    content: `❌ Não foi possível enviar a mensagem no canal ${targetChannel}. Verifique as permissões do bot.`,
                    ephemeral: true
                });
            }
        }

        await interaction.reply({ embeds: [embed], components: [selectMenu] });
    }
};
