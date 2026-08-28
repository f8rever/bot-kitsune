const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'join',
    description: '🦊 Conecta o bot a um canal de voz (Call 24/7 do servidor).',
    options: [
        {
            name: 'canal',
            description: 'Canal de voz desejado (deixe vazio para entrar na sua call atual)',
            type: 7, // CHANNEL
            channel_types: [ChannelType.GuildVoice, ChannelType.GuildStageVoice],
            required: false
        }
    ],
    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole && !interaction.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
            return interaction.reply({ content: '🚫 Você precisa ser Staff ou Administrador para gerenciar as conexões de voz.', ephemeral: true });
        }

        let voiceChannel = interaction.options.getChannel('canal');

        // Se nenhum canal foi passado, pegar o canal onde o usuário está
        if (!voiceChannel) {
            voiceChannel = interaction.member.voice.channel;
        }

        if (!voiceChannel) {
            return interaction.reply({
                content: '⚠️ Você não está em nenhum canal de voz! Por favor, entre em uma call ou selecione um canal na opção `canal`.',
                ephemeral: true
            });
        }

        if (voiceChannel.type !== ChannelType.GuildVoice && voiceChannel.type !== ChannelType.GuildStageVoice) {
            return interaction.reply({
                content: '❌ Por favor, selecione um canal de **voz** válido.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 5_000);

            const embed = new EmbedBuilder()
                .setTitle('🎙️ Conectado ao Canal de Voz!')
                .setColor('#F43F5E')
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .setDescription(
                    `<a:whitearrow:1346152146814636032> O bot Kitsune entrou com sucesso na call:\n\n` +
                    `> 🔊 **Canal:** ${voiceChannel} (\`${voiceChannel.name}\`)\n` +
                    `> 👥 **Membros na Call:** \`${voiceChannel.members.size}\` membro(s)\n` +
                    `> 🛡️ **Status:** \`Conectado (Call 24/7 Ativa)\`\n` +
                    `> 🎧 **Ensordecido:** \`Sim (Self-Deaf)\``
                )
                .setFooter({ text: 'Kitsune Voice • Use /leave para desconectar a qualquer momento', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('[Voice Join Error]', error);
            return interaction.editReply({
                content: `❌ Erro ao tentar conectar ao canal ${voiceChannel}: \`${error.message}\``
            });
        }
    }
};