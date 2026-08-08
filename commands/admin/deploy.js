const { EmbedBuilder, REST, Routes } = require('discord.js');

module.exports = {
    name: 'deploy',
    description: 'Força o re-deploy e atualização imediata de todos os comandos Slash na API do Discord.',
    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '🏮 Apenas administradores podem executar o deploy de comandos.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

            // 1. Clean old guild commands from current server
            if (interaction.guildId) {
                try {
                    await rest.put(Routes.applicationGuildCommands(interaction.client.user.id, interaction.guildId), { body: [] });
                } catch(e) {}
            }

            // 2. Register single clean global application commands
            const commandsBody = [];
            interaction.client.commands.forEach(cmd => {
                if (cmd.name && cmd.description) {
                    commandsBody.push({
                        name: cmd.name,
                        description: cmd.description,
                        options: cmd.options || []
                    });
                }
            });

            await rest.put(Routes.applicationCommands(interaction.client.user.id), { body: commandsBody });

            const embed = new EmbedBuilder()
                .setTitle('🚀 Deploy Concluído com Sucesso!')
                .setColor('#2ECC71')
                .setDescription(`Todos os **${commandsBody.length} comandos Slash** foram sincronizados e publicados com sucesso na API oficial do Discord!`)
                .addFields(
                    { name: 'Comandos Registrados', value: `\`${commandsBody.map(c => '/' + c.name).join(', ')}\``, inline: false }
                )
                .setFooter({ text: 'Kitsune Store • Deploy de Comandos', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch(err) {
            console.error('[Deploy Error]', err.message);
            return interaction.editReply({ content: `❌ Falha ao realizar o deploy dos comandos Slash: \`${err.message}\`` });
        }
    }
};
