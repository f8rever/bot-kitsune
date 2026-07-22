const { SlashCommandBuilder } = require('discord.js');
const contasCommand = require('./contas.js');

module.exports = {
    name: 'saldo',
    description: 'Mostra o saldo das contas salvas (Atalho para /contas).',
    async execute(interaction) {
        // Just execute the contas command
        await contasCommand.execute(interaction);
    }
};
