const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Limpa uma quantidade específica de mensagens do canal atual.',
    options: [
        {
            name: 'amount',
            description: 'Quantidade de mensagens a serem apagadas (1 a 100)',
            type: 4,
            required: true
        }
    ],
    async execute(interaction) {
        // Verificar se o usuário tem permissão de gerenciar mensagens ou cargo de Staff
        const hasManageMessages = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
        const hasAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasManageMessages && !hasAdmin && !hasStaffRole) {
            return interaction.reply({
                content: '🚫 Você não possui permissão para usar este comando de moderação.',
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('amount');
        if (amount < 1 || amount > 100) {
            return interaction.reply({
                content: '⚠️ Por favor, informe um número entre **1 e 100** mensagens.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            const count = deleted.size;

            return interaction.editReply({
                content: `🧹 **${count}** mensagem(ns) foram apagadas com sucesso por ${interaction.user}.`
            });
        } catch (err) {
            console.error('[Clear Error]', err.message);
            return interaction.editReply({
                content: '❌ Não foi possível apagar algumas mensagens. Mensagens com mais de 14 dias não podem ser deletadas em massa pelo Discord.'
            });
        }
    }
};
