const { EmbedBuilder, REST, Routes } = require('discord.js');

module.exports = {
    name: 'deploy',
    description: 'Força o re-deploy e atualização imediata de todos os comandos Slash na API do Discord.',
    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has('Administrator');
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({ content: '🏮 Apenas administradores e staff podem executar o deploy de comandos.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const rawToken = process.env.DISCORD_TOKEN || '';
            const cleanToken = rawToken.replace(/[\s\r\n"']/g, '');

            if (!cleanToken) {
                return interaction.editReply({ content: '❌ DISCORD_TOKEN não encontrado nas variáveis de ambiente.' });
            }

            const rest = new REST({ version: '10' }).setToken(cleanToken);

            // 1. Limpar comandos locais de guilda para evitar duplicados
            if (interaction.guildId) {
                try {
                    await rest.put(Routes.applicationGuildCommands(interaction.client.user.id, interaction.guildId), { body: [] });
                } catch(e) {}
            }

            // 2. Registrar comandos globais
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
