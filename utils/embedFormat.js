const fs = require('fs');
const path = require('path');

module.exports = function formatEmbed(embed, client) {
    if(client?.user) {
        embed.setFooter({ text: '© Kitsune - Copyright 2026', iconURL: client.user.displayAvatarURL() });
    }
    return embed;
};
