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
    
    // Auto-detectar mencao do cliente se fornecido via interactionOrUser
    if (!extraVars.cliente && interactionOrUser) {
        const uId = interactionOrUser.user?.id || interactionOrUser.id;
        if (uId) {
            extraVars.cliente = `<@${uId}>`;
        }
    }

    // Injetar valores padrão das tabelas de preços caso seja um embed de tabela
    if (embedId && embedId.startsWith('tabela_')) {
        let loja = {};
        try {
            loja = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/loja.json'), 'utf8'));
        } catch (e) {}

        const tableDefaults = {
            price_3250: loja.skins?.ultimate?.desconto || '10.49',
            price_1820: loja.skins?.legendary?.desconto || '5.75',
            price_1350: loja.skins?.epic?.desconto || '4.25',
            price_975: loja.skins?.common_975?.desconto || '3.25',
            price_750: loja.skins?.common_750?.desconto || '3.25',
            price_520: loja.skins?.common_520?.desconto || '1.75',
            price_490: loja.skins?.mystery_skin?.desconto || '1.59',
            price_champ_490: loja.skins?.mystery_champ?.desconto || '1.59',
            skinsDiscount: loja.desconto_skins ?? 50,
            price_1650: loja.loot?.pass_1?.desconto || '5.39',
            price_2650: loja.loot?.pass_2?.desconto || '8.64',
            price_3650: loja.loot?.pass_3?.desconto || '11.74',
            price_2500: loja.loot?.orb_1?.desconto || '8.00',
            price_6250: loja.loot?.orb_2?.desconto || '20.25',
            price_12500: loja.loot?.orb_3?.desconto || '40.74',
            price_225: loja.loot?.chest_key_1?.desconto || '0.65',
            price_1125: loja.loot?.chest_key_5?.desconto || '3.15',
            price_2250: loja.loot?.chest_key_10?.desconto || '6.25',
            lootDiscount: loja.desconto_chests ?? 55,
            passesDiscount: loja.desconto_passes ?? 50,
            price_290: loja.skins?.croma?.desconto || '1.39',
            price_350: (350 * 0.006 * (1 - (loja.desconto_emotes ?? 30) / 100)).toFixed(2),
            price_640: (640 * 0.006 * (1 - (loja.desconto_wards ?? 30) / 100)).toFixed(2),
            price_250: (250 * 0.006 * (1 - (loja.desconto_icones ?? 30) / 100)).toFixed(2),
            price_clash_975: (975 * 0.006 * (1 - (loja.desconto_acessorios ?? 30) / 100)).toFixed(2),
            price_boost_3490: (3490 * 0.006 * (1 - (loja.desconto_boosts ?? 30) / 100)).toFixed(2),
            acessoriosDiscount: loja.desconto_acessorios ?? 30
        };

        for (const [k, v] of Object.entries(tableDefaults)) {
            if (extraVars[k] === undefined) {
                extraVars[k] = v;
            }
        }
    }

    for (const [key, val] of Object.entries(extraVars)) {
        desc = desc.replace(new RegExp(`{${key}}`, 'g'), val !== undefined && val !== null ? val : '');
        title = title.replace(new RegExp(`{${key}}`, 'g'), val !== undefined && val !== null ? val : '');
    }

    // Fallback inteligente caso a configuracao da embed ainda tenha apenas {staffRoles}
    if (extraVars.cliente && extraVars.staffRoles && desc.includes(extraVars.staffRoles) && !desc.includes(extraVars.cliente)) {
        const fullMention = [extraVars.cliente, extraVars.staffRoles].filter(Boolean).join(' | ');
        desc = desc.replace(extraVars.staffRoles, fullMention);
    }

    // Limpeza de tags nao substituidas para evitar {cliente} ou {staffRoles} literais no embed
    desc = desc.replace(/{cliente}\s*\|\s*/g, extraVars.cliente ? `${extraVars.cliente} | ` : '')
               .replace(/{cliente}/g, extraVars.cliente || '')
               .replace(/\|\s*{staffRoles}/g, extraVars.staffRoles ? `| ${extraVars.staffRoles}` : '')
               .replace(/{staffRoles}/g, extraVars.staffRoles || '');

    // Limpeza de barras soltas caso staffRoles ou cliente estejam vazios
    desc = desc.replace(/\s+\|\s*$/gm, '').replace(/^\s*\|\s*/gm, '').replace(/<a:whitearrow:1555074441933758624>\s*\|\s*/g, '<a:whitearrow:1555074441933758624> ');
    desc = desc.replace(/\n<a:whitearrow:1555074441933758624>\s*$/g, '');

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
            
            if (fValue.trim() === '``' || fValue.trim() === '""' || fValue.trim() === '') continue;
            
            if (fName.trim()) {
                embed.addFields({ name: fName, value: fValue, inline: f.inline || false });
            }
        }
    }

    return embed;
}

function getLoadingEmbed(customText = 'Carregando dados da loja...') {
    let customEmojis = {};
    try {
        customEmojis = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/emojis.json'), 'utf8'));
    } catch (e) {}
    const loadingEmoji = (customEmojis?.status?.loading || '<a:loading:1555074450221961348>').trim();

    return new EmbedBuilder()
        .setColor('#F43F5E')
        .setDescription(`${loadingEmoji} **Kitsune Store** • *${customText}*`);
}

async function sendLoadingReply(interaction, customText = 'Carregando dados da loja...', ephemeral = true) {
    const embed = getLoadingEmbed(customText);
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [embed], ephemeral });
        } else if (interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        }
    } catch (e) {}
}

module.exports = { buildCustomEmbed, getLoadingEmbed, sendLoadingReply };
