const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    name: 'leave',
    description: 'Faz o bot sair do canal de voz.',
    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            return interaction.reply({ 
                content: '❌ Eu não estou em nenhum canal de voz no momento.', 
                ephemeral: true 
            });
        }

        connection.destroy();
        await interaction.reply({ content: '👋 Saí do canal de voz!', ephemeral: true });
    }
};