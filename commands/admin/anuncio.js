const { 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChannelType
} = require('discord.js');

module.exports = {
    name: 'anuncio',
    description: '📢 Cria e dispara anúncios e comunicados na DM dos membros ou em canais de texto.',
    options: [
        {
            name: 'destino',
            description: 'Onde a mensagem deve ser enviada (DM privada ou Canal de Anúncios)',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: '✉️ Direct Message (DM privada dos membros)', value: 'dm' },
                { name: '📢 Canal de Anúncios deste Servidor', value: 'channel' }
            ]
        },
        {
            name: 'alcance',
            description: 'Quais servidores devem ser incluídos no disparo',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: '🏠 Apenas este servidor', value: 'local' },
                { name: '🌐 Todos os servidores onde o bot está', value: 'global' }
            ]
        }
    ],

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({ 
                content: '🚫 Você precisa ser Administrador para disparar anúncios.', 
                ephemeral: true 
            });
        }

        const destino = interaction.options.getString('destino') || 'dm';
        const alcance = interaction.options.getString('alcance') || 'local';

        // Abrir Modal de Criação do Anúncio
        const modal = new ModalBuilder()
            .setCustomId(`modal_anuncio__${destino}__${alcance}`)
            .setTitle('📢 Criar Novo Anúncio'.substring(0, 45));

        const tituloInput = new TextInputBuilder()
            .setCustomId('anuncio_titulo')
            .setLabel('Título do Anúncio:')
            .setPlaceholder('Ex: 🦊 KITSUNE STORE | FLASH SALE!')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const descInput = new TextInputBuilder()
            .setCustomId('anuncio_desc')
            .setLabel('Conteúdo do Comunicado:')
            .setPlaceholder('Digite a mensagem que os membros receberão...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(2000);

        const bannerInput = new TextInputBuilder()
            .setCustomId('anuncio_banner')
            .setLabel('Banner / Imagem URL (opcional):')
            .setPlaceholder('https://... (deixe em branco se não quiser imagem)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const btnInput = new TextInputBuilder()
            .setCustomId('anuncio_botao')
            .setLabel('Botão Link: Texto | URL (opcional):')
            .setPlaceholder('Ex: Acessar Loja | https://discord.gg/kitsune')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const corInput = new TextInputBuilder()
            .setCustomId('anuncio_cor')
            .setLabel('Cor em HEX (opcional):')
            .setPlaceholder('Ex: #F43F5E (padrão rosa Kitsune)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(7);

        modal.addComponents(
            new ActionRowBuilder().addComponents(tituloInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(bannerInput),
            new ActionRowBuilder().addComponents(btnInput),
            new ActionRowBuilder().addComponents(corInput)
        );

        await interaction.showModal(modal);
    }
};
