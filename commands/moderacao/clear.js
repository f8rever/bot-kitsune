const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'clear',
    description: '🧹 Limpa mensagens do chat com filtros inteligentes (quantidade, usuário ou apenas bots).',
    options: [
        {
            name: 'quantidade',
            description: 'Quantidade de mensagens a serem analisadas e apagadas (1 a 100)',
            type: 4, // INTEGER
            required: true,
            min_value: 1,
            max_value: 100
        },
        {
            name: 'usuario',
            description: 'Filtrar e apagar apenas mensagens deste usuário específico',
            type: 6, // USER
            required: false
        },
        {
            name: 'apenas_bots',
            description: 'Filtrar e apagar apenas mensagens enviadas por bots',
            type: 5, // BOOLEAN
            required: false
        }
    ],

    async execute(interaction) {
        const hasManageMessages = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
        const hasAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasManageMessages && !hasAdmin && !hasStaffRole) {
            return interaction.reply({
                content: '🚫 Você não possui permissão para usar este comando de moderação (Gerenciar Mensagens).',
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('quantidade');
        const targetUser = interaction.options.getUser('usuario');
        const onlyBots = interaction.options.getBoolean('apenas_bots');

        await interaction.deferReply({ ephemeral: true });

        try {
            const fetched = await interaction.channel.messages.fetch({ limit: amount });
            let messagesToDelete = fetched;

            if (targetUser) {
                messagesToDelete = fetched.filter(m => m.author.id === targetUser.id);
            } else if (onlyBots) {
                messagesToDelete = fetched.filter(m => m.author.bot);
            }

            if (messagesToDelete.size === 0) {
                return interaction.editReply({
                    content: '⚠️ Nenhuma mensagem correspondente aos filtros selecionados foi encontrada nas últimas mensagens.'
                });
            }

            const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);
            const count = deleted.size;

            let filtroTexto = 'Todas as mensagens recentes';
            if (targetUser) filtroTexto = `Apenas de ${targetUser}`;
            if (onlyBots) filtroTexto = 'Apenas mensagens de bots';

            const replyEmbed = new EmbedBuilder()
                .setTitle('🧹 Limpeza de Chat Concluída!')
                .setColor('#2ECC71')
                .setDescription(
                    `<a:whitearrow:1346152146814636032> A limpeza do canal ${interaction.channel} foi executada com sucesso!\n\n` +
                    `> 🗑️ **Mensagens Deletadas:** \`${count}\` mensagem(ns)\n` +
                    `> 🎯 **Filtro Aplicado:** ${filtroTexto}\n` +
                    `> 🛡️ **Moderador:** ${interaction.user}`
                )
                .setFooter({ text: 'Kitsune Moderação', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            // Log no canal de auditoria se configurado
            try {
                const configPath = path.join(__dirname, '../../config/config.json');
                if (fs.existsSync(configPath)) {
                    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    if (cfg.canal_logs_id) {
                        const logChannel = interaction.guild.channels.cache.get(cfg.canal_logs_id);
                        if (logChannel) {
                            await logChannel.send({ embeds: [replyEmbed] }).catch(() => {});
                        }
                    }
                }
            } catch(e) {}

            return interaction.editReply({ embeds: [replyEmbed] });
        } catch (err) {
            console.error('[Clear Error]', err.message);
            return interaction.editReply({
                content: `❌ Não foi possível apagar as mensagens. Detalhes: \`${err.message}\` (Mensagens com mais de 14 dias não podem ser deletadas em massa pelo Discord).`
            });
        }
    }
};
