const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const formatEmbed = require('./embedFormat.js');

function buildCustomEmbed(embedId, client, interactionOrUser = null, extraVars = {}) {
    let customEmbeds = {};
    let customEmojis = {};
    
    try {
        customEmbeds = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/embeds.json'), 'utf8'));
    } catch (e) {}
    
    try {
        customEmojis = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/emojis.json'), 'utf8'));
    } catch (e) {}

    const cfg = customEmbeds[embedId];
    const embed = formatEmbed(new EmbedBuilder(), client);
    
    if (!cfg) return embed;

    const fox = customEmojis?.utilidades?.fox || '🦊';
    let title = cfg.title || '';
    let desc = cfg.description || '';
    
    title = title.replace(/{fox}/g, fox).replace(/\\n/g, '\n');
    desc = desc.replace(/{fox}/g, fox).replace(/\\n/g, '\n');
    
    for (const [key, val] of Object.entries(extraVars)) {
        desc = desc.replace(new RegExp(`{${key}}`, 'g'), val);
        title = title.replace(new RegExp(`{${key}}`, 'g'), val);
    }

    if (title && title.trim()) embed.setTitle(title.trim());
    if (desc && desc.trim()) embed.setDescription(desc.trim());
    if (cfg.color && cfg.color.trim()) {
        try { embed.setColor(cfg.color.trim()); } catch(e){}
    }
    
    if (cfg.image && typeof cfg.image === 'string' && cfg.image.trim().startsWith('http')) {
        try { embed.setImage(cfg.image.trim()); } catch(e){}
    }
    
    if (cfg.thumbnail === '{userAvatar}' && interactionOrUser) {
        let avatarUrl = null;
        if (interactionOrUser.user && typeof interactionOrUser.user.displayAvatarURL === 'function') {
            avatarUrl = interactionOrUser.user.displayAvatarURL({ extension: 'png' });
        } else if (typeof interactionOrUser.displayAvatarURL === 'function') {
            avatarUrl = interactionOrUser.displayAvatarURL({ extension: 'png' });
        }
        if (avatarUrl) embed.setThumbnail(avatarUrl);
    } else if (cfg.thumbnail && typeof cfg.thumbnail === 'string' && cfg.thumbnail.trim().startsWith('http')) {
        try { embed.setThumbnail(cfg.thumbnail.trim()); } catch(e){}
    }

    if (cfg.footerText !== undefined || cfg.footerIcon !== undefined) {
        const icon = (cfg.footerIcon && typeof cfg.footerIcon === 'string' && cfg.footerIcon.trim().startsWith('http'))
            ? cfg.footerIcon.trim()
            : (client?.user ? client.user.displayAvatarURL() : null);
        embed.setFooter({
            text: cfg.footerText || '© Kitsune - Copyright 2026',
            ...(icon ? { iconURL: icon } : {})
        });
    } else if (client?.user) {
        embed.setFooter({ text: '© Kitsune - Copyright 2026', iconURL: client.user.displayAvatarURL() });
    }

    if (cfg.fields && Array.isArray(cfg.fields)) {
        for (const f of cfg.fields) {
            let fName = f.name || '';
            let fValue = f.value || '';
            
            fName = fName.replace(/{fox}/g, fox);
            fValue = fValue.replace(/{fox}/g, fox);
            
            for (const [key, val] of Object.entries(extraVars)) {
                // Ignore missing variables by not replacing them, or handle them based on usage
                fName = fName.replace(new RegExp(`{${key}}`, 'g'), val);
                fValue = fValue.replace(new RegExp(`{${key}}`, 'g'), val);
            }
            
            if (fValue.trim() === '\`\`' || fValue.trim() === '""' || fValue.trim() === '') continue;
            
            if (fName.trim()) {
                embed.addFields({ name: fName, value: fValue, inline: f.inline || false });
            }
        }
    }

    return embed;
}

module.exports = { buildCustomEmbed };
