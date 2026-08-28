const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');
const fs = require('fs');
const path = require('path');

const DEFAULT_RESTORECORD_URL = 'https://discord.com/oauth2/authorize?client_id=1527499371971870740&redirect_uri=https%3A%2F%2Frestorecord.com%2Fapi%2Fcallback&response_type=code&scope=identify+guilds.join&state=1540159601817817168&prompt=none';

module.exports = {
    name: 'verify-panel',
    description: '🦊 Envia o painel oficial de verificação com link direto para o RestoreCord.',
    options: [
        {
            name: 'canal',
            description: 'Canal onde o painel de verificação será enviado (Opcional)',
            type: 7, // CHANNEL
            channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            required: false
        },
        {
            name: 'restorecord_url',
            description: 'URL customizada do RestoreCord / OAuth2 (Opcional)',
            type: 3, // STRING
            required: false,
            autocomplete: true
        }
    ],

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const configPath = path.join(__dirname, '../../config/config.json');
        let savedUrl = DEFAULT_RESTORECORD_URL;

        if (fs.existsSync(configPath)) {
            try {
                const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (cfg.restorecord_url && cfg.restorecord_url.startsWith('http')) {
                    savedUrl = cfg.restorecord_url;
                }
            } catch (e) {}
        }

        const choices = [
            {
                name: `🔗 RestoreCord URL (Configured Link)`,
                value: savedUrl
            }
        ];

        const filtered = choices.filter(choice =>
            choice.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
            choice.value.toLowerCase().includes(focusedValue.toLowerCase())
        );

        await interaction.respond(filtered.slice(0, 25)).catch(() => {});
    },

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({
                content: '🚫 Only Administrators and Staff members can send the verification panel.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const targetChannel = interaction.options.getChannel('canal') || interaction.options.getChannel('channel') || interaction.channel;
        const customUrl = interaction.options.getString('restorecord_url');

        // Check configured URL from config.json or fallback
        const configPath = path.join(__dirname, '../../config/config.json');
        let activeUrl = DEFAULT_RESTORECORD_URL;

        if (customUrl) {
            activeUrl = customUrl.trim();
            try {
                let botConfig = {};
                if (fs.existsSync(configPath)) {
                    botConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
                botConfig.restorecord_url = activeUrl;
                fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2), 'utf8');
            } catch (e) {}
        } else {
            try {
                if (fs.existsSync(configPath)) {
                    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    if (cfg.restorecord_url && cfg.restorecord_url.startsWith('http')) {
                        activeUrl = cfg.restorecord_url;
                    }
                }
            } catch (e) {}
        }

        const embed = buildCustomEmbed('verify_panel', interaction.client, interaction);

        const verifyButton = new ButtonBuilder()
            .setLabel('Verify')
            .setEmoji('🦊')
            .setStyle(ButtonStyle.Link)
            .setURL(activeUrl);

        const row = new ActionRowBuilder().addComponents(verifyButton);

        try {
            await targetChannel.send({ embeds: [embed], components: [row] });
            return interaction.editReply({
                content: `✅ Verification panel successfully sent to ${targetChannel}!`
            });
        } catch (err) {
            console.error('[Verify Panel Error]', err.message);
            return interaction.editReply({
                content: `❌ Failed to send verification panel to ${targetChannel}: \`${err.message}\``
            });
        }
    }
};
