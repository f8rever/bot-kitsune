const friendlistCmd = require('./friendlist.js');

module.exports = {
    name: 'friends',
    description: 'Alias for /friendlist - Manages and accepts pending friend requests.',
    options: friendlistCmd.options,
    async execute(interaction) {
        return friendlistCmd.execute(interaction);
    }
};
