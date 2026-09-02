const { PermissionsBitField, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { getBlacklist, addToBlacklist, removeFromBlacklist, clearBlacklist } = require('../../utils/broadcastBlacklist.js');

module.exports = {
    name: 'anuncio-blacklist',
    description: '🛡️ Gerencia a lista negra (Blacklist) de membros excluídos dos anúncios e mass DM.',
    options: [
        {
            name: 'acao',
            description: 'Ação que deseja realizar na blacklist',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: '➕ Adicionar Usuário(s)', value: 'adicionar' },
                { name: '➖ Remover Usuário(s)', value: 'remover' },
                { name: '📋 Listar Todos na Blacklist', value: 'listar' },
                { name: '🗑️ Limpar Toda a Blacklist', value: 'limpar' }
            ]
        },
        {
            name: 'usuario',
            description: 'Mencione um usuário do servidor para adicionar ou remover',
            type: ApplicationCommandOptionType.User,
            required: false
        },
        {
            name: 'ids',
            description: 'Um ou mais IDs separados por vírgula ou espaço (ex: 123456789, 987654321)',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({ 
                content: '🚫 Você precisa ser Administrador para gerenciar a blacklist de anúncios.', 
                ephemeral: true 
            });
        }

        const acao = interaction.options.getString('acao');
        const targetUser = interaction.options.getUser('usuario');
        const idsString = interaction.options.getString('ids') || '';

        // Coletar todos os IDs passados
        const inputIds = [];
        if (targetUser) inputIds.push(targetUser.id);
        if (idsString) {
            idsString.split(/[\s,]+/).forEach(id => {
                const clean = id.trim().replace(/[^0-9]/g, '');
                if (clean) inputIds.push(clean);
            });
        }

        if (acao === 'adicionar') {
            if (inputIds.length === 0) {
                return interaction.reply({ 
                    content: '❌ Você precisa informar ao menos um **usuário** ou **ID** no campo `usuario` ou `ids`.', 
                    ephemeral: true 
                });
            }

            const res = await addToBlacklist(inputIds);
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Blacklist de Anúncios Atualizada')
                .setColor('#10B981')
                .setDescription(`✅ **${res.added} novo(s) ID(s)** adicionados com sucesso à Blacklist!\n\n• **Total atual na Blacklist:** \`${res.total} usuários\`\n• *Esses membros nunca receberão DMs ou mensagens enviadas via \`/anuncio\`.*`)
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (acao === 'remover') {
            if (inputIds.length === 0) {
                return interaction.reply({ 
                    content: '❌ Você precisa informar ao menos um **usuário** ou **ID** para remover.', 
                    ephemeral: true 
                });
            }

            const res = await removeFromBlacklist(inputIds);
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Blacklist de Anúncios Atualizada')
                .setColor('#F59E0B')
                .setDescription(`🗑️ **${res.removed} ID(s)** removidos da Blacklist.\n\n• **Total restante na Blacklist:** \`${res.total} usuários\``)
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (acao === 'limpar') {
            await clearBlacklist();
            return interaction.reply({ 
                content: '🗑️ **Blacklist de anúncios completamente limpa!** Nenhum ID está bloqueado no momento.', 
                ephemeral: true 
            });
        }

        if (acao === 'listar') {
            const listSet = getBlacklist();
            const ids = Array.from(listSet);

            if (ids.length === 0) {
                return interaction.reply({ 
                    content: '📋 A **Blacklist de Anúncios está vazia**. Nenhum membro está configurado para ser ignorado.', 
                    ephemeral: true 
                });
            }

            const lines = ids.map((id, index) => `${index + 1}. <@${id}> (\`${id}\`)`).slice(0, 30);
            if (ids.length > 30) {
                lines.push(`*...e mais ${ids.length - 30} usuários.*`);
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Membros na Blacklist de Anúncios')
                .setColor('#3B82F6')
                .setDescription(`Abaixo estão os usuários que **NUNCA** receberão mensagens via \`/anuncio\`:\n\n${lines.join('\n')}\n\n• **Total bloqueados:** \`${ids.length}\``)
                .setFooter({ text: 'Use /anuncio-blacklist acao:Remover para liberar um membro' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
