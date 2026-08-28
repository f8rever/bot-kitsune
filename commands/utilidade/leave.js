const { getVoiceConnection } = require('@discordjs/voice');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'leave',
    description: '🦊 Desconecta o bot do canal de voz atual.',
    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole && !interaction.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
            return interaction.reply({ content: '🚫 Você precisa ser Staff ou Administrador para gerenciar as conexões de voz.', ephemeral: true });
        }

        const connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            return interaction.reply({ 
                content: '❌ O bot não está conectado em nenhum canal de voz deste servidor.', 
                ephemeral: true 
            });
        }

        try {
            connection.destroy();

            const embed = new EmbedBuilder()
                .setTitle('👋 Desconectado da Call!')
                .setColor('#F43F5E')
                .setDescription(`<a:whitearrow:1346152146814636032> O bot Kitsune foi desconectado do canal de voz com sucesso por ${interaction.user}.`)
                .setFooter({ text: 'Kitsune Voice', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        } catch(err) {
            console.error('[Voice Leave Error]', err);
            return interaction.reply({ content: `❌ Erro ao desconectar do canal de voz: \`${err.message}\``, ephemeral: true });
        }
    }
};