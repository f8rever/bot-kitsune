const { PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    name: 'fechar',
    description: '🔒 Encerra e exclui o canal do ticket atual.',
    default_member_permissions: null,
    dm_permission: false,
    options: [
        {
            name: 'motivo',
            description: 'Motivo do fechamento do ticket (opcional)',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    async execute(interaction) {
        const isTicket = interaction.channel?.name?.startsWith('🎫') ||
            (interaction.channel?.topic && interaction.channel.topic.includes('Ticket-Owner')) ||
            (global.ticketCarts && global.ticketCarts.has(interaction.channel?.id));

        if (!isTicket) {
            return interaction.reply({
                content: '❌ Este comando só pode ser utilizado dentro de um canal de ticket da Kitsune Store!',
                ephemeral: true
            });
        }

        const isOwner = (global.ticketCarts?.get(interaction.channel.id)?.ownerId === interaction.user.id) ||
            (interaction.channel.topic && interaction.channel.topic.includes(interaction.user.id));
        const isAdmin = interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member?.roles?.cache?.has(roleId));

        if (!isOwner && !isAdmin && !hasStaffRole) {
            return interaction.reply({
                content: '🚫 Apenas o cliente (dono do ticket) ou membros da Staff podem fechar este atendimento.',
                ephemeral: true
            });
        }

        const motivo = interaction.options.getString('motivo') || 'Atendimento Concluído';

        try {
            const { fecharCanalTicket } = require('../../index.js');
            if (typeof fecharCanalTicket === 'function') {
                await fecharCanalTicket(interaction.channel, interaction.user, motivo, interaction.client, interaction.guild, interaction);
            } else {
                return interaction.reply({ content: '❌ Erro interno ao fechar ticket.', ephemeral: true });
            }
        } catch (err) {
            console.error('[Command Fechar Error]', err);
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ content: `❌ Falha ao encerrar ticket: \`${err.message}\``, ephemeral: true });
            }
        }
    }
};
