const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
    name: 'join',
    description: 'Escolha um canal de voz para o bot entrar.',
    options: [
        {
            name: 'canal',
            description: 'Selecione o canal de voz',
            type: 7, // Tipo 7 é específico para CANAIS
            channel_types: [2], // Filtra para mostrar apenas canais de VOZ
            required: true
        }
    ],
    async execute(interaction) {
        const voiceChannel = interaction.options.getChannel('canal');

        // Verifica se o canal selecionado é mesmo de voz
        if (voiceChannel.type !== 2) {
            return interaction.reply({ 
                content: '❌ Por favor, selecione um canal de **voz**.', 
                ephemeral: true 
            });
        }

        try {
            joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });

            await interaction.reply({ 
                content: `🎙️ Conectado com sucesso ao canal **${voiceChannel.name}**!`, 
                ephemeral: true 
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ Erro ao tentar entrar no canal selecionado.', 
                ephemeral: true 
            });
        }
    }
};