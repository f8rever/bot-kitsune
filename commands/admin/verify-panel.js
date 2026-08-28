const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'verify-panel',
    description: 'Envia o painel interativo de verificação (com botão e suporte a RestoreCord).',
    options: [
        {
            name: 'canal',
            description: 'Canal onde o painel de verificação será enviado',
            type: 7, // CHANNEL
            required: false
        },
        {
            name: 'restorecord_url',
            description: 'URL de autorização do RestoreCord / OAuth2 (Opcional)',
            type: 3, // STRING
            required: false
        }
    ],
    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({
                content: '🚫 Apenas administradores e membros da staff podem enviar o painel de verificação.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const restorecordUrl = interaction.options.getString('restorecord_url');

        // Se uma URL do RestoreCord foi passada, salva nas configurações
        if (restorecordUrl) {
            try {
                const configPath = path.join(__dirname, '../../config/config.json');
                let botConfig = {};
                if (fs.existsSync(configPath)) {
                    botConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
                botConfig.restorecord_url = restorecordUrl.trim();
                fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2), 'utf8');
            } catch (e) {}
        }

        const embed = buildCustomEmbed('verify_panel', interaction.client, interaction);

        const buttons = [
            new ButtonBuilder()
                .setCustomId('btn_member_verify')
                .setLabel('Verificar-se')
                .setEmoji('🦊')
                .setStyle(ButtonStyle.Success)
        ];

        // Verificar se há RestoreCord configurado
        let activeRestoreCord = restorecordUrl;
        if (!activeRestoreCord) {
            try {
                const configPath = path.join(__dirname, '../../config/config.json');
                if (fs.existsSync(configPath)) {
                    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    if (cfg.restorecord_url) activeRestoreCord = cfg.restorecord_url;
                }
            } catch (e) {}
        }

        if (activeRestoreCord && activeRestoreCord.startsWith('http')) {
            buttons.push(
                new ButtonBuilder()
                    .setLabel('Verificação Externa (RestoreCord)')
                    .setEmoji('🔗')
                    .setStyle(ButtonStyle.Link)
                    .setURL(activeRestoreCord.trim())
            );
        }

        const row = new ActionRowBuilder().addComponents(buttons);

        try {
            await targetChannel.send({ embeds: [embed], components: [row] });
            return interaction.editReply({
                content: `✅ Painel de verificação enviado com sucesso no canal ${targetChannel}!`
            });
        } catch (err) {
            console.error('[Verify Panel Error]', err.message);
            return interaction.editReply({
                content: `❌ Falha ao enviar mensagem no canal ${targetChannel}. Verifique as permissões do bot.`
            });
        }
    }
};
