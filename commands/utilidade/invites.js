const { buildCustomEmbed } = require('../../utils/customEmbeds.js');
const { getUserInvites } = require('../../utils/mongoStorage.js');

module.exports = {
    name: 'invites',
    description: 'Consulta a contagem e estatísticas de convites de um usuário ou de si mesmo.',
    options: [
        {
            name: 'usuario',
            description: 'Membro que deseja consultar os convites (opcional)',
            type: 6, // USER type
            required: false
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const guildId = interaction.guildId;

        const stats = await getUserInvites(guildId, targetUser.id);

        const embed = buildCustomEmbed('invites_profile', interaction.client, interaction, {
            targetUser: `${targetUser.username}`,
            total: String(stats.total),
            regular: String(stats.regular),
            left: String(stats.left),
            fake: String(stats.fake)
        });

        if (targetUser.displayAvatarURL) {
            embed.setThumbnail(targetUser.displayAvatarURL({ extension: 'png', dynamic: true }));
        }

        return interaction.editReply({ embeds: [embed] });
    }
};
