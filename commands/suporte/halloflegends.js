const { buildCustomEmbed } = require("../../utils/customEmbeds.js");
const { ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'halloflegends',
    description: '🏆 Sends the exclusive Hall of Legends 2026 (Caps) store panel.',
    options: [
        {
            name: 'canal',
            description: 'Text channel where the panel will be sent (optional)',
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
                content: '🚫 You must be an Administrator or Staff member to send the Hall of Legends panel to another channel.',
                ephemeral: true
            });
        }

        const embed = buildCustomEmbed('hall_of_legends', interaction.client, interaction);

        const embedsPath = path.join(__dirname, '../../config/embeds.json');
        let cfg = {};
        if (fs.existsSync(embedsPath)) {
            try {
                const embedsData = JSON.parse(fs.readFileSync(embedsPath, 'utf8'));
                cfg = embedsData['hall_of_legends'] || {};
            } catch(e) {}
        }

        const selectPlaceholder = cfg.selectPlaceholder || '🏆 Select a Hall of Legends bundle to order...';

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_hall_of_legends_select')
                .setPlaceholder(selectPlaceholder)
                .addOptions([
                    {
                        label: 'Hall of Legends 2026 Pass (Caps)',
                        description: '1,950 RP • Risen Legend Orianna + 100 Levels',
                        value: 'Hall of Legends 2026 Pass - Caps||99901660',
                        emoji: '🎫'
                    },
                    {
                        label: 'Risen Legend Tristana Collection',
                        description: '5,035 RP • Pass + Risen Legend Tristana + Cosmetics',
                        value: 'Risen Legend Tristana Collection||99901661',
                        emoji: '💥'
                    },
                    {
                        label: 'Immortalized Legend Tristana Collection',
                        description: '32,035 RP • Immortalized Tristana (3 Forms) + Pass',
                        value: 'Immortalized Legend Tristana Collection||99901662',
                        emoji: '👑'
                    },
                    {
                        label: 'Signature Immortalized Tristana Collection',
                        description: '58,865 RP • Full Collection + Caps Signature + Title',
                        value: 'Signature Immortalized Legend Tristana Collection||99901663',
                        emoji: '🌟'
                    }
                ])
        );

        if (targetChannel) {
            try {
                await targetChannel.send({ embeds: [embed], components: [selectMenu] });
                return interaction.reply({
                    content: `✅ Hall of Legends 2026 panel successfully sent to ${targetChannel}!`,
                    ephemeral: true
                });
            } catch (err) {
                console.error('[Hall of Legends Command Error]', err);
                return interaction.reply({
                    content: `❌ Could not send the message to ${targetChannel}. Please check bot permissions.`,
                    ephemeral: true
                });
            }
        }

        await interaction.reply({ embeds: [embed], components: [selectMenu] });
    }
};
