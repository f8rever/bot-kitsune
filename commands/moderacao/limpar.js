module.exports = {
    name: 'limpar',
    description: 'Deleta uma quantidade específica de mensagens.',
    options: [
        {
            name: 'quantidade',
            description: 'Número de mensagens (1-100)',
            type: 4, // INTEGER
            required: true
        }
    ],
    async execute(interaction) {
        const qtd = interaction.options.getInteger('quantidade');
        if (qtd < 1 || qtd > 100) return interaction.reply({ content: 'Escolha entre 1 e 100.', ephemeral: true });
        
        await interaction.channel.bulkDelete(qtd, true);
        await interaction.reply({ content: `🧹 Limpei ${qtd} mensagens!`, ephemeral: true });
    }
};