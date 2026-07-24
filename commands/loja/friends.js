const friendlistCmd = require('./friendlist.js');

module.exports = {
    name: 'friends',
    description: 'Atalho para o /friendlist - Gerencia e aceita pedidos de amizade.',
    options: friendlistCmd.options,
    async execute(interaction) {
        return friendlistCmd.execute(interaction);
    }
};
