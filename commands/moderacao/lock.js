module.exports = {
    name: 'lock',
    description: 'Tranca o canal atual.',
    async execute(interaction) {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
        await interaction.reply('🔒 Este canal foi trancado!');
    }
};