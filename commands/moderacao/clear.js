module.exports = {
    name: 'clear',
    description: 'Limpa uma quantidade específica de mensagens do canal.',
    options: [
        {
            name: 'amount',
            description: 'Quantidade de mensagens a serem apagadas (1-100)',
            type: 4,
            required: true
        }
    ],
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: '❌ Informe um número entre 1 e 100.', ephemeral: true });
        }
        await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({ content: `🧹 **${amount}** mensagens apagadas com sucesso.`, ephemeral: true });
    }
};
