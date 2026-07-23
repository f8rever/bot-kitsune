require('dotenv').config();

// Web Server para manter o bot online no Render (Pings do UptimeRobot)
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot Kitsune está Online e rodando!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor Web iniciado na porta ${PORT} para UptimeRobot.`));

process.on('unhandledRejection', (reason) => {
    if (reason?.code === 'UND_ERR_CONNECT_TIMEOUT' || reason?.code === 10062 || reason?.code === 40060) return;
    console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
    if (err?.code === 'UND_ERR_CONNECT_TIMEOUT' || err?.code === 10062 || err?.code === 40060) return;
    console.error('[Uncaught Exception]', err);
});

const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const formatEmbed = require('./utils/embedFormat.js');
const { buildCustomEmbed } = require("./utils/customEmbeds.js");

let riotCatalog = [];
try {
    const rawCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'catalogo.json'), 'utf8'));
    riotCatalog = Object.values(rawCatalog).map(x => ({
        id: x.itemId,
        nome: x.localizations?.en_US?.name || '',
        tipo: x.inventoryType,
        parent_id: x.parent?.itemId || null,
        iconUrl: x.iconUrl ? 'https:' + x.iconUrl : null,
        price_rp: x.prices?.find(p => p.currency === 'RP')?.cost || 0,
        rawItem: x
    }));
} catch (e) {
    console.error("Erro ao carregar catalogo.json", e);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            loadCommands(fullPath);
        } else if (item.endsWith('.js')) {
            const command = require(fullPath);
            if (command.name) client.commands.set(command.name, command);
        }
    });
}
loadCommands(path.join(__dirname, 'commands'));

function obterDadosLoja() {
    const p = path.join(__dirname, 'config', 'loja.json');
    try {
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) { console.error("Erro loja.json", e); }
    return {};
}

let customEmojis = {};
function carregarEmojis() {
    try {
        customEmojis = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'emojis.json'), 'utf8'));
    } catch (e) {
        console.error("Erro ao carregar emojis.json", e);
    }
}
carregarEmojis();

let customEmbeds = {};
function carregarEmbeds() {
    try {
        customEmbeds = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'embeds.json'), 'utf8'));
    } catch (e) {
        console.error("Erro ao carregar embeds.json", e);
    }
}
carregarEmbeds();

client.on('reloadEmojis', () => {
    carregarEmojis();
});
client.on('reloadEmbeds', () => {
    carregarEmbeds();
});

const getLoadStr = (context = 'default') => {
    switch (context) {
        case 'auth':
            return 'Loading authentication...';
        case 'sales':
            return 'Loading Sales Center...';
        case 'catalog':
            return 'Loading the catalog...';
        case 'ticket':
            return 'Preparing your items...';
        case 'search':
            return 'Fetching data from the void...';
        default:
            return 'Awakening the foxes...';
    }
};

const skinsRarityMap = {};
try {
    const rarityData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'skins_rarity.json'), 'utf8'));
    for (const [skinName, rarity] of Object.entries(rarityData)) {
        skinsRarityMap[skinName.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()] = rarity;
    }
} catch (e) {
    console.error("Erro carregando skins_rarity.json:", e);
}


function getCatalogRp(item) {
    if (!item) return 0;
    let cost = 0;
    if (item.prices && item.prices.length) {
        const p = item.prices.find(x => x.currency === 'RP');
        if (p) cost = p.cost;
    } else if (item.bundleItems) {
        cost = item.bundleItems.reduce((acc, curr) => acc + (curr.price && curr.price.currency === 'RP' ? curr.price.cost : 0), 0);
    }
    return cost;
}

function getCatalogPrice(rpCost, loja, formatDiscountStr = false) {
    if (!rpCost || isNaN(rpCost)) return '0.00';

    const getVal = (item) => {
        if (!item) return null;
        const basePrice = item.preco ? parseFloat(item.preco) : null;
        const discountPrice = (item.desconto && parseFloat(item.desconto) > 0) ? parseFloat(item.desconto) : null;
        if (discountPrice && basePrice && discountPrice < basePrice) {
            return {
                final: discountPrice.toFixed(2),
                raw: `~~€${basePrice.toFixed(2)}~~ 🔥 **€${discountPrice.toFixed(2)}**`,
                ratio: discountPrice / rpCost
            };
        }
        if (basePrice) {
            return {
                final: basePrice.toFixed(2),
                raw: `€${basePrice.toFixed(2)}`,
                ratio: basePrice / rpCost
            };
        }
        return null;
    };

    // 1. Check Loot / Pass / Orb / Hextech items in loja.loot
    if (loja && loja.loot) {
        for (const [key, item] of Object.entries(loja.loot)) {
            const nameLower = (item.nome || '').toLowerCase();
            const rpMatch = nameLower.match(/(\d+)\s*rp/);
            if (rpMatch && parseInt(rpMatch[1], 10) === rpCost) {
                const res = getVal(item);
                if (res) return formatDiscountStr ? res.raw : res.final;
            }
        }
    }

    // 2. Check Skins in loja.skins
    if (loja && loja.skins) {
        let catItem = null;
        if (rpCost === 3250) catItem = loja.skins.ultimate;
        else if (rpCost >= 2000) catItem = loja.skins.mythic;
        else if (rpCost === 1820) catItem = loja.skins.legendary;
        else if (rpCost === 1350) catItem = loja.skins.epic;
        else if (rpCost === 975) catItem = loja.skins.common_975;
        else if (rpCost === 750) catItem = loja.skins.common_750;
        else if (rpCost === 520) catItem = loja.skins.common_520;
        else if (rpCost === 290) catItem = loja.skins.croma;

        if (catItem) {
            const res = getVal(catItem);
            if (res) return formatDiscountStr ? res.raw : res.final;
        }

        const epicRes = getVal(loja.skins.epic);
        if (epicRes) {
            const calculated = parseFloat(epicRes.final) * (rpCost / 1350);
            return formatDiscountStr ? `€${calculated.toFixed(2)}` : calculated.toFixed(2);
        }
    }

    return (rpCost * 0.0065).toFixed(2);
}

const userStoreSessions = global.userStoreSessions = global.userStoreSessions || new Map();

function getItemRpValue(nome, tipoFiltro, rawItem = null) {
    let rp = rawItem ? getCatalogRp(rawItem) : 0;
    if (rp > 0) return rp;

    const n = (nome || '').toLowerCase();

    // 1. Check if name explicitly contains RP value (e.g. "125 RP", "2250 RP", "1650 RP")
    const rpMatch = n.match(/(\d+)\s*rp/);
    if (rpMatch) {
        return parseInt(rpMatch[1], 10);
    }

    // 2. Exact match for Hextech Chest, Key, Orbs, and Passes
    if (n.includes('baú') || n.includes('chest') || n.includes('chave') || n.includes('key')) {
        if (n.includes('25')) return 5625;
        if (n.includes('10')) return 2250;
        if (n.includes('5')) return 1125;
        if (n.includes('1') && (n.includes('baú e chave') || n.includes('chest & key') || n.includes('chest and key') || n.includes('conjunto'))) return 225;
        if (n.includes('mestre') || n.includes('masterwork')) return 165;
        return 125;
    }

    if (n.includes('orbe') || n.includes('orb')) {
        if (n.includes('mega') || n.includes('50') || n.includes('12500')) return 12500;
        if (n.includes('premium') || n.includes('deluxe') || n.includes('25') || n.includes('6250')) return 6250;
        if (n.includes('10') || n.includes('2500')) return 2500;
        return 250;
    }

    if (n.includes('passe') || n.includes('pass')) {
        if (n.includes('premium') || n.includes('3650')) return 3650;
        if (n.includes('upgraded') || n.includes('2650')) return 2650;
        return 1650;
    }

    if (n.includes('chibi')) return 1900;
    if (n.includes('riot id')) return 1250;

    // 3. Fallback per category
    if (tipoFiltro === 'skins') {
        const rarityCode = skinsRarityMap[n.replace(/\s*\(.*?\)\s*/g, '').trim()] || 'kEpic';
        if (n.includes('prestige') || rarityCode === 'kMythic') return 2000;
        if (rarityCode === 'kUltimate') return 3250;
        if (rarityCode === 'kLegendary') return 1820;
        if (rarityCode === 'kEpic') return 1350;
        if (rarityCode === 'kRare') return 975;
        return 750;
    }
    if (tipoFiltro === 'cromas') return 290;
    if (tipoFiltro === 'eternos') return 600;
    if (tipoFiltro === 'passes') return 1650;
    if (tipoFiltro === 'champions') return 975;

    return 1350;
}

function obterDetalhesItem(nome, tipoFiltro, loja, precoPadrao, rawItem = null) {
    const emjRp = '💎';
    const emjDinheiro = '💶';
    
    let calcRp = getItemRpValue(nome, tipoFiltro, rawItem);

    const precoReal = getCatalogPrice(calcRp, loja);

    const formatarStr = (prefixo, emoji) => {
        return { desc: `${prefixo} | ${emjRp} ${calcRp} RP | ${emjDinheiro} €${precoReal}`, emoji };
    };

    if (tipoFiltro === 'skins') {
        if (rawItem && (rawItem.inventoryType === 'BUNDLES' || rawItem.inventoryType === 'BUNDLE') && nome.toLowerCase().includes('signature edition')) {
            let bundleIcon = (customEmojis?.skins?.transcendent || '🌟').trim();
            return formatarStr('Signature Edition', bundleIcon);
        }
        
        const nomeLower = nome.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
        let rarityCode = skinsRarityMap[nomeLower];
        if (!rarityCode) {
            if (calcRp === 3250) rarityCode = 'kUltimate';
            else if (calcRp === 1820) rarityCode = 'kLegendary';
            else if (calcRp <= 975) rarityCode = 'kRare';
            else rarityCode = 'kEpic';
        }
        if (nome.toLowerCase().includes('prestige')) rarityCode = 'kMythic';

        switch(rarityCode) {
            case 'kTranscendent': return formatarStr('Transcendent', (customEmojis?.skins?.transcendent || '🔸').trim());
            case 'kExalted': return formatarStr('Exalted', (customEmojis?.skins?.exalted || '🔸').trim());
            case 'kUltimate': return formatarStr('Ultimate', (customEmojis?.skins?.ultimate || '🔸').trim());
            case 'kMythic': return formatarStr('Mythic', (customEmojis?.skins?.mythic || '✨').trim());
            case 'kLegendary': return formatarStr('Legendary', (customEmojis?.skins?.legendary || '🔴').trim());
            case 'kEpic': return formatarStr('Epic', (customEmojis?.skins?.epic || '🟣').trim());
            case 'kRare': return formatarStr('Common', (customEmojis?.skins?.common || '🔵').trim());
            default: return formatarStr('Common', (customEmojis?.skins?.common || '🟢').trim());
        }
    } 
    else if (tipoFiltro === 'cromas') {
        return formatarStr('Chroma', (customEmojis?.skins?.croma || '🎨').trim());
    } 
    else if (tipoFiltro === 'eternos') {
        return formatarStr('Eternals Series', (customEmojis?.skins?.eternos || '🏆').trim());
    } 
    else if (tipoFiltro === 'passes') {
        let lootIcon = (customEmojis?.loot?.pass || '🎫').trim();
        let prefix = 'Pass & Loots';
        if (nome.toLowerCase().includes('pass')) { prefix = 'Pass'; lootIcon = (customEmojis?.loot?.pass || '🎫').trim(); }
        else {
            prefix = 'Loot';
            if (nome.toLowerCase().includes('mega') && nome.toLowerCase().includes('orb')) lootIcon = (customEmojis?.loot?.megaorb || '📦').trim();
            else if (nome.toLowerCase().includes('deluxe') && nome.toLowerCase().includes('orb')) lootIcon = (customEmojis?.loot?.deluxe || '📦').trim();
            else if (nome.toLowerCase().includes('premium') && nome.toLowerCase().includes('orb')) lootIcon = (customEmojis?.loot?.premium || '📦').trim();
            else if (nome.toLowerCase().includes('orb')) lootIcon = (customEmojis?.loot?.orb || '📦').trim();
            else if (nome.toLowerCase().includes('chest') && nome.toLowerCase().includes('key')) lootIcon = (customEmojis?.loot?.chestkey || '📦').trim();
            else if (nome.toLowerCase().includes('chest')) lootIcon = (customEmojis?.loot?.chest || '📦').trim();
            else if (nome.toLowerCase().includes('key')) lootIcon = (customEmojis?.loot?.key || '🔑').trim();
        }
        return formatarStr(prefix, lootIcon);
    } 
    else if (tipoFiltro === 'highlights') {
        if (rawItem && rawItem.inventoryType === 'CHAMPION_SKIN') {
            const nomeLower = nome.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
            let rarityCode = skinsRarityMap[nomeLower];
            if (!rarityCode) {
                if (calcRp === 3250) rarityCode = 'kUltimate';
                else if (calcRp === 1820) rarityCode = 'kLegendary';
                else if (calcRp <= 975) rarityCode = 'kRare';
                else rarityCode = 'kEpic';
            }
            if (nome.toLowerCase().includes('prestige')) rarityCode = 'kMythic';

            switch(rarityCode) {
                case 'kTranscendent': return formatarStr('Transcendent', (customEmojis?.skins?.transcendent || '🔸').trim());
                case 'kExalted': return formatarStr('Exalted', (customEmojis?.skins?.exalted || '🔸').trim());
                case 'kUltimate': return formatarStr('Ultimate', (customEmojis?.skins?.ultimate || '🔸').trim());
                case 'kMythic': return formatarStr('Mythic', (customEmojis?.skins?.mythic || '✨').trim());
                case 'kLegendary': return formatarStr('Legendary', (customEmojis?.skins?.legendary || '🔴').trim());
                case 'kEpic': return formatarStr('Epic', (customEmojis?.skins?.epic || '🟣').trim());
                case 'kRare': return formatarStr('Common', (customEmojis?.skins?.common || '🔵').trim());
                default: return formatarStr('Common', (customEmojis?.skins?.common || '🟢').trim());
            }
        }
        
        let bundleIcon = (customEmojis?.bundles?.bundle || '🌟').trim();
        let prefix = 'Highlight';
        if (nome.toLowerCase().includes('signature edition')) { prefix = 'Signature Edition'; bundleIcon = (customEmojis?.skins?.transcendent || '🌟').trim(); }
        else if (nome.toLowerCase().includes('chroma pack') || nome.toLowerCase().includes('chroma bundle')) { prefix = 'Chroma Bundle'; bundleIcon = (customEmojis?.bundles?.chroma || '🎨').trim(); }
        else if (nome.toLowerCase().includes('set')) { prefix = 'Set'; bundleIcon = (customEmojis?.bundles?.set || '✨').trim(); }
        return formatarStr(prefix, bundleIcon);
    }
    else if (tipoFiltro === 'champions') {
        return formatarStr('Champion', (customEmojis?.skins?.champion || '⚔️').trim());
    }

    return formatarStr('Item', '📦');
}

async function enviarPaginaCatalogo(interaction, tipoFiltro, pagina = 0, isUpdate = false) {
    const cor = '#F43F5E';
    const ITEMS_PER_PAGE = 25;
    
    let results = [];
    let titulo = '';
    let customId = '';
    
    if (tipoFiltro === 'highlights') {
        results = riotCatalog.filter(x => {
            const n = x.nome.toLowerCase();
            const isBundle = (x.tipo === 'BUNDLES' || x.tipo === 'BUNDLE');
            const isTargetSkin = (x.tipo === 'CHAMPION_SKIN' && n === 'mvp t1 miss fortune');
            return (isBundle || isTargetSkin) &&
                   x.rawItem?.active !== false &&
                   n.includes('t1') &&
                   (n.includes('signature') || n.includes('set') || n.includes('chroma pack') || n.includes('chroma bundle') || isTargetSkin);
        });
        titulo = `📦 ${results.length} Highlights`;
        customId = 'selecionar_highlight_menu';
    } else if (tipoFiltro === 'passes') {
        results = riotCatalog.filter(x => {
            const n = x.nome.toLowerCase();
            return x.rawItem?.active !== false &&
                (x.tipo === 'EVENT_PASS' || x.tipo === 'HEXTECH_CRAFTING' || x.tipo === 'BUNDLES' || x.tipo === 'BUNDLE') &&
                (n.includes('pass') || n.includes('orb') || n.includes('chest') || n.includes('key')) &&
                !n.includes('clash') &&
                !n.includes('new player') &&
                !n.includes('mystery') &&
                !n.includes('three-peat') &&
                !n.includes('banner') &&
                !n.includes('chroma') &&
                !n.includes('signature') &&
                !n.includes('missions token bank pass');
        });
        titulo = `📦 ${results.length} Passes & Loots`;
        customId = 'selecionar_passe_menu';
    }

    results = results.sort((a,b) => {
        const dateA = a.rawItem?.releaseDate ? new Date(a.rawItem.releaseDate).getTime() : 0;
        const dateB = b.rawItem?.releaseDate ? new Date(b.rawItem.releaseDate).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return b.id - a.id;
    });
    
    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE) || 1;
    if (pagina < 0) pagina = 0;
    if (pagina >= totalPages) pagina = totalPages - 1;
    
    const pageItems = results.slice(pagina * ITEMS_PER_PAGE, (pagina + 1) * ITEMS_PER_PAGE);

    if (pageItems.length === 0) {
        if (isUpdate) return interaction.update({ content: '❌ No items found.', embeds: [], components: [] });
        return interaction.reply({ content: '❌ No items found.', embeds: [], components: [] });
    }

    const embedId = 'catalog_' + tipoFiltro;
    let embed = buildCustomEmbed(embedId, interaction?.client, interaction, {
        count: results.length.toString(),
        page: (pagina + 1).toString(),
        totalPages: totalPages.toString(),
        emoji: customEmojis?.utilidades?.[tipoFiltro] || '📦'
    });
    
    if (!embed.data.title) {
        embed.setTitle(titulo);
    }
    
    if (!embed.data.description) {
        let catName = tipoFiltro === 'passes' ? 'passes / loots' : tipoFiltro;
        embed.setDescription(`> Please select an **${catName}** from the **menu** below to continue:\n> ${pagina + 1} page of ${totalPages} pages`);
    }

    if (!customEmbeds[embedId]?.color) embed.setColor(cor);

    const lojaConfig = obterDadosLoja();
    if (customEmbeds[embedId]?.syncImage !== false) {
        if (tipoFiltro === 'passes' && lojaConfig?.banners?.loot) {
            embed.setImage(lojaConfig.banners.loot);
        } else if (tipoFiltro === 'highlights' && lojaConfig?.banners?.bundles) {
            embed.setImage(lojaConfig.banners.bundles);
        }
    }

    const loja = obterDadosLoja();
    
    const opcoesMenu = [];
    for (const r of pageItems) {
        const info = obterDetalhesItem(r.nome, tipoFiltro, loja, '0.00', r.rawItem);
        const baseName = r.nome.length > 90 ? r.nome.substring(0, 90) : r.nome;
        opcoesMenu.push({
            label: r.nome.substring(0, 100) || 'Unknown Item',
            description: info.desc,
            value: `${baseName}||${r.id}`,
            emoji: info.emoji
        });
    }

    const actionRows = [];

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(`Select from Page ${pagina + 1}`)
            .setOptions(opcoesMenu)
    );
    actionRows.push(menu);

    const btnRow = new ActionRowBuilder();
    
    btnRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`voltar_menu_modal`)
            .setLabel('Back to Menu')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji((customEmojis?.utilidades?.left || '⬅️').trim())
    );

    if (totalPages > 1) {
        btnRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`pag_${tipoFiltro}_${pagina - 1}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pagina === 0),
            new ButtonBuilder()
                .setCustomId(`pag_${tipoFiltro}_${pagina + 1}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pagina === totalPages - 1)
        );
    }
    actionRows.push(btnRow);

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: '', embeds: [embed], components: actionRows });
    } else if (isUpdate) {
        await interaction.update({ content: '', embeds: [embed], components: actionRows });
    } else {
        await interaction.reply({ content: '', embeds: [embed], components: actionRows, ephemeral: true });
    }
}

async function criarCanalTicket(interaction, itemSelecionado, tipoFiltro = 'skins') {
    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
    await interaction.reply({ content: `${loadEmj} ${getLoadStr('ticket')}`, ephemeral: true });
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const session = userStoreSessions.get(interaction.user.id) || { regiao: 'NA', riotId: 'Unknown' };

    const { ChannelType } = require('discord.js');
    let category = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toUpperCase() === `TICKETS - ${session.regiao.toUpperCase()}`);
    const staffRolesArray = (process.env.STAFF_ROLE_IDS || '').split(',').map(r => r.trim()).filter(r => r);
    
    if (!category) {
        const categoryOverwrites = [
            { id: interaction.guild.id, deny: ['ViewChannel'] },
            { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'] }
        ];
        for (const roleId of staffRolesArray) {
            categoryOverwrites.push({ id: roleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] });
        }
        category = await interaction.guild.channels.create({
            name: `TICKETS - ${session.regiao.toUpperCase()}`,
            type: ChannelType.GuildCategory,
            permissionOverwrites: categoryOverwrites
        });
    }

    const ticketOverwrites = [
        { id: interaction.guild.id, deny: ['ViewChannel'] }, 
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }, 
        { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'] } 
    ];
    for (const roleId of staffRolesArray) {
        ticketOverwrites.push({ id: roleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] });
    }

    const canal = await interaction.guild.channels.create({
        name: `🎫-${interaction.user.username}`,
        parent: category.id,
        topic: `Ticket-Owner: ${interaction.user.id}`,
        permissionOverwrites: ticketOverwrites
    });
    
    const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(id => `<@&${id}>`).join(' ');
    const estrela = customEmojis?.utilidades?.estrela || '⭐';
    
    const loja = obterDadosLoja();
    let variacao = 'Unknown';
    let valorRP = '';
    let eVariacao = (customEmojis?.ticket?.variacao || '🌟').trim();
    
    let nomeReal = itemSelecionado;
    let itemId = null;
    if (itemSelecionado.includes('||')) {
        const p = itemSelecionado.split('||');
        nomeReal = p[0];
        itemId = parseInt(p[1], 10);
    }
    const catItemEncontrado = itemId ? riotCatalog.find(x => x.id === itemId) : riotCatalog.find(x => x.nome === nomeReal);

    if (tipoFiltro === 'champions') {
        variacao = 'Champion';
        eVariacao = (customEmojis?.skins?.champion || '🌟').trim();
    } else {
        const raw = catItemEncontrado ? catItemEncontrado.rawItem : null;
        const detalhes = obterDetalhesItem(nomeReal, tipoFiltro, loja, '0.00', raw);
        const partes = detalhes.desc.split('|');
        variacao = partes[0].trim();
        if (detalhes.emoji) {
            eVariacao = detalhes.emoji;
        }
        if (partes.length > 2) {
            valorRP = partes[1].trim().replace('💎', '').trim();
        } else if (partes.length === 2 && partes[0].includes('RP')) {
            valorRP = partes[0].trim().replace('💎', '').trim();
        }
    }

    const calcRp = getItemRpValue(nomeReal, tipoFiltro, catItemEncontrado ? catItemEncontrado.rawItem : null);
    const precoRealStr = getCatalogPrice(calcRp, loja, true);
    const valorDinheiro = precoRealStr.includes('€') ? precoRealStr : `€${precoRealStr}`;

    const eProduto = (customEmojis?.ticket?.produto || '🛒').trim();
    const eRegiao = (customEmojis?.ticket?.regiao || '🌍').trim();
    const eRiotId = (customEmojis?.ticket?.riot_id || '🎮').trim();
    const eFechar = (customEmojis?.utilidades?.fechar || '🔒').trim();
    const eRP = (customEmojis?.loja_produtos?.moeda || '💎').trim();
    const eDinheiro = '<:dinheiro:1527368514057408713>';

    const embed = buildCustomEmbed('ticket_order_received', interaction.client, interaction, { 
        staffRoles,
        itemSelecionado: nomeReal,
        variacao,
        valorRP,
        valorDinheiro,
        regiao: session.regiao.toUpperCase(),
        riotId: session.riotId,
        eProduto,
        eVariacao,
        eRP,
        eDinheiro,
        eRegiao,
        eRiotId
    });
    
    try {
        const champMap = require('./data/championMap.json');
        let ddragonUrl = null;
        
        const catItem = catItemEncontrado;
        if (tipoFiltro === 'skins' || tipoFiltro === 'cromas') {
            if (catItem && catItem.parent_id) {
                const champKey = champMap[catItem.parent_id];
                if (champKey) {
                    const skinNum = catItem.id % 1000;
                    ddragonUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champKey}_${skinNum}.jpg`;
                }
            } else if (catItem && catItem.iconUrl) {
                ddragonUrl = catItem.iconUrl.startsWith('//') ? 'https:' + catItem.iconUrl : catItem.iconUrl;
            }
        } else if (tipoFiltro === 'champions') {
            if (catItem) {
                const champKey = champMap[catItem.id];
                if (champKey) ddragonUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champKey}_0.jpg`;
            }
        } else if (tipoFiltro === 'highlights') {
            if (catItem && catItem.iconUrl) {
                ddragonUrl = catItem.iconUrl.startsWith('//') ? 'https:' + catItem.iconUrl : catItem.iconUrl;
            } else {
                const lojaConfig = obterDadosLoja();
                if (lojaConfig?.banners?.bundles) {
                    ddragonUrl = lojaConfig.banners.bundles;
                }
            }
        }
        
        if (ddragonUrl) {
            embed.setImage(ddragonUrl);
        }
    } catch (err) {
        console.error("Erro ao buscar imagem da skin/campeao:", err);
    }


    const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji(eFechar),
        new ButtonBuilder().setCustomId('btn_payment_methods').setLabel('Payment Methods').setStyle(ButtonStyle.Success).setEmoji(eDinheiro),
        new ButtonBuilder().setCustomId('editar_pedido').setLabel('Edit Order').setStyle(ButtonStyle.Secondary).setEmoji('✏️')
    );
    
    await canal.send({ content: `${interaction.user}`, embeds: [embed], components: [btn] });
    
    await interaction.editReply({ content: `✅ Your support ticket has been created: ${canal}`, embeds: [], components: [] });
}

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
                return;
            } catch (error) {
                if (error.code !== 10062 && error.code !== 40060) {
                    console.error('Command Execution Error:', error);
                }
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'Houve um erro ao executar esse comando!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: 'Houve um erro ao executar esse comando!', ephemeral: true });
                    }
                } catch(e) { /* ignore */ }
                return;
            }
        }

        else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                if (command.autocomplete) {
                    await command.autocomplete(interaction);
                }
            } catch (error) {
                if (error.code !== 10062 && error.code !== 40060) {
                    console.error('Autocomplete error:', error);
                }
            }
        }

        else if (interaction.isStringSelectMenu()) {
            const cor = '#F43F5E';
            const loja = obterDadosLoja();

            if (interaction.customId === 'select_account_login') {
                const selected = interaction.values[0];
                const fs = require('fs');
                const path = require('path');
                const accountsPath = path.join(__dirname, 'config', 'riot_accounts.json');
                
                if (!fs.existsSync(accountsPath)) {
                    return interaction.reply({ content: '❌ Nenhuma conta salva encontrada.', ephemeral: true });
                }
                
                const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
                const acc = accounts[selected];
                
                if (!acc || !acc.accessToken) {
                    return interaction.reply({ content: '❌ Conta não encontrada no cache.', ephemeral: true });
                }
                
                await interaction.deferReply({ ephemeral: true });
                
                const { getStoreBalance } = require('./utils/riotAuth.js');
                let storeBalance = null;
                let rp = acc.rp || 0;
                let be = acc.be || 0;
                try {
                    storeBalance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region);
                    if (storeBalance.error === 401) {
                        acc.expired = true;
                        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
                        return interaction.editReply({ content: '❌ O token desta conta expirou no momento do login. Use `/link` novamente.' });
                    }
                    rp = storeBalance?.rp || storeBalance?.RP || 0;
                    be = storeBalance?.ip || storeBalance?.IP || 0;
                    
                    acc.rp = rp;
                    acc.be = be;
                    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
                } catch(e) {
                    console.error('Error fetching balance from cache:', e.message);
                }
                
                const finalAccountName = selected;
                const region = acc.region || 'BR1';
                
                const eRiotId = '<:RiotID:1329241635308638208>';
                const eRP = '<:rp:1329188049283121172>';
                const eAE = '<:EA:1329241193392439366>';
                
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Success!')
                    .setColor('#23A559')
                    .setDescription(`Logged in to **${finalAccountName}**\n\n` +
                                    `> ${eRiotId} **Region:** \`${region}\`\n` +
                                    `> ${eRP} **RP:** \`${rp}\`\n\n` +
                                    `* You may now use any of the account commands.`);
                
                const accRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_rp').setLabel('Atualizar RP').setStyle(ButtonStyle.Secondary).setEmoji('💎'),
                    new ButtonBuilder().setCustomId('btn_account').setLabel('Account').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️'),
                    new ButtonBuilder().setCustomId('btn_friend').setLabel('Friend').setStyle(ButtonStyle.Secondary).setEmoji('🫂')
                );
                
                global.userStoreSessions = global.userStoreSessions || new Map();
                global.userStoreSessions.set(interaction.user.id, {
                    accessToken: acc.accessToken,
                    entitlementsToken: acc.entitlementsToken,
                    idToken: acc.idToken,
                    region: region,
                    riotId: finalAccountName
                });
                
                return await interaction.followUp({ embeds: [successEmbed], components: [accRow], ephemeral: true });
            }

            if (interaction.customId === 'menu_regiao') {
                const regiao = interaction.values[0];
                userStoreSessions.set(interaction.user.id, { regiao });
                
                const modal = new ModalBuilder().setCustomId('modal_riot_id').setTitle('🎮 Riot ID Configuration');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('ticket_riot')
                        .setLabel('Your Riot ID (Name#TAG):')
                        .setPlaceholder('Ex: Player#BR1')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ));
                await interaction.showModal(modal).catch(() => {});
                return;
            }

            if (interaction.customId === 'menu_emojis_categorias') {
                const cat = interaction.values[0];
                const items = customEmojis[cat];
                if (!itens) return interaction.reply({ content: 'Category not found.', ephemeral: true });

                const opcoes = Object.keys(itens).slice(0, 25).map(k => ({
                    label: k,
                    value: `${cat}__${k}`,
                    emoji: '✏️'
                }));

                const embed = formatEmbed(new EmbedBuilder(), interaction.client)
                    .setTitle(`🦊 Emoji Manager | ${cat.toUpperCase()}`)
                    .setColor('#F43F5E')
                    .setDescription(`Select the specific emoji you want to edit in the **${cat}** category.`);

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_emojis_items')
                        .setPlaceholder('Select an emoji to edit')
                        .addOptions(opcoes)
                );

                const btnVoltar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('voltar_menu_emojis_categorias')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji((customEmojis?.utilidades?.left || '⬅️').trim())
                );

                await interaction.update({ embeds: [embed], components: [menu, btnVoltar] });
                return;
            }

            if (interaction.customId === 'menu_emojis_items') {
                const val = interaction.values[0]; // e.g. "skins__ultimate"
                const [cat, key] = val.split('__');

                const currentVal = customEmojis[cat]?.[key] || '';
                
                const modal = new ModalBuilder().setCustomId(`modal_emoji_edit__${val}`).setTitle(`Edit Emoji: ${key}`);
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('novo_emoji')
                        .setLabel(`New Emoji for ${key}:`)
                        .setPlaceholder('e.g. <a:anim:123> or 🎈')
                        .setValue(currentVal)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ));
                
                await interaction.showModal(modal).catch(e => console.error(e));
                return;
            }

            if (interaction.customId === 'menu_vendas') {
                const opcao = interaction.values[0];

                if (opcao === 'compra_skins') {
                    abrirModalBusca(interaction, 'buscar_campeao_modal', '🔍 Search Skins', 'Enter the champion\'s name:');
                } else if (opcao === 'compra_chromas') {
                    abrirModalBusca(interaction, 'buscar_campeao_chromas_modal', '🔍 Search Chromas', 'Enter the champion\'s name:');
                } else if (opcao === 'compra_champions') {
                    abrirModalBusca(interaction, 'buscar_compra_campeao_modal', '⚔️ Purchase Champion', 'Enter the champion\'s name:');
                } else if (opcao === 'compra_passes') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 2500));
                    await enviarPaginaCatalogo(interaction, 'passes', 0, false);
                } else if (opcao === 'compra_highlights') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 2500));
                    await enviarPaginaCatalogo(interaction, 'highlights', 0, false);
                } else if (opcao === 'compra_eternos') {
                    abrirModalBusca(interaction, 'buscar_campeao_eternos_modal', '🏆 Search Eternals', 'Which champion\'s Eternals do you want to see?');
                }
            } 
            
            else if (['selecionar_skin_menu', 'selecionar_chroma_menu', 'selecionar_eterno_menu', 'selecionar_champion_menu', 'selecionar_passe_menu', 'selecionar_highlight_menu'].includes(interaction.customId)) {
                if (interaction.values[0] === 'nenhum') return interaction.reply({ content: 'Invalid option.', ephemeral: true });
                let tipo = 'skins';
                if (interaction.customId === 'selecionar_chroma_menu') tipo = 'cromas';
                else if (interaction.customId === 'selecionar_eterno_menu') tipo = 'eternos';
                else if (interaction.customId === 'selecionar_champion_menu') tipo = 'champions';
                else if (interaction.customId === 'selecionar_passe_menu') tipo = 'passes';
                else if (interaction.customId === 'selecionar_highlight_menu') tipo = 'highlights';
                
                let itemSelecionado = interaction.values[0];
                if (tipo === 'bundles' && itemSelecionado.includes('||')) {
                    itemSelecionado = itemSelecionado.split('||')[0];
                }
                
                await criarCanalTicket(interaction, itemSelecionado, tipo);
            }

            if (interaction.customId === 'menu_embed_select') {
                const embedId = interaction.values[0];
                
                const embed = formatEmbed(new EmbedBuilder(), interaction.client)
                    .setTitle(`🦊 Kitsune | Edit Embed`)
                    .setColor('#F43F5E')
                    .setDescription(`You are editing the embed: **${embedId}**.\n\nSelect which field you want to modify below:`);

                const opts = [
                    { label: 'Title', value: `${embedId}__title`, emoji: '📝' },
                    { label: 'Description', value: `${embedId}__description`, emoji: '📄' },
                    { label: 'Color (HEX/Name)', value: `${embedId}__color`, emoji: '🎨' },
                    { label: 'Thumbnail URL', value: `${embedId}__thumbnail`, emoji: '🖼️' },
                    { label: 'Image URL', value: `${embedId}__image`, emoji: '🖼️' },
                    { label: 'Footer Text', value: `${embedId}__footerText`, emoji: '📝' },
                    { label: 'Footer Icon URL', value: `${embedId}__footerIcon`, emoji: '🖼️' },
                    { label: 'Button Label', value: `${embedId}__buttonLabel`, emoji: '🔘' },
                    { label: 'Button Emoji', value: `${embedId}__buttonEmoji`, emoji: '😀' },
                    { label: 'Button Color (Red/Green/Blue/Gray)', value: `${embedId}__buttonStyle`, emoji: '🎨' },
                    { label: 'Sync Dynamic Image (True/False)', description: 'Sync embed image with the store product', value: `${embedId}__syncImage`, emoji: '🔄' }
                ];
                
                if (embedId.startsWith('tabela_')) {
                    opts.push({ label: 'Global Discount (%)', description: 'Apply a global discount to all items', value: `${embedId}__globalDiscount`, emoji: '🎉' });
                }
                
                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_embed_field')
                        .setPlaceholder('Select a field to edit')
                        .addOptions(opts)
                );
                
                const btnVoltar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('voltar_menu_embeds_inicio')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                );

                await interaction.update({ embeds: [embed], components: [menu, btnVoltar] });
                return;
            }

            if (interaction.customId === 'menu_embed_field') {
                const [embedId, field] = interaction.values[0].split('__');
                
                let currentValue = customEmbeds[embedId]?.[field] || '';
                
                if (!currentValue) {
                    if (embedId.startsWith('catalog_') && field === 'description') {
                        currentValue = `Por favor, selecione o item no menu abaixo para prosseguir:\\n(Página {page} de {totalPages})`;
                    } else if (field === 'title') {
                        if (embedId === 'catalog_skins') currentValue = `✨ {campeao} Skins ({count})`;
                        else if (embedId === 'catalog_cromas') currentValue = `✨ {campeao} Cromas ({count})`;
                        else if (embedId === 'catalog_passes') currentValue = `🎫 Passes & Loots ({count} itens)`;
                        else if (embedId === 'catalog_highlights') currentValue = `🌟 Highlights ({count} itens)`;
                        else if (embedId === 'catalog_champions') currentValue = `✨ {campeao} Champions ({count})`;
                        else if (embedId === 'catalog_eternos') currentValue = `✨ {campeao} Eternos ({count})`;
                    }
                }

                const modal = new ModalBuilder()
                    .setCustomId(`modal_embed_${embedId}__${field}`)
                    .setTitle(`Edit ${field.toUpperCase()}`.substring(0, 45));

                let style = TextInputStyle.Short;
                if (field === 'description') style = TextInputStyle.Paragraph;

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('novo_valor')
                            .setLabel(`New ${field}:`.substring(0, 45))
                            .setStyle(style)
                            .setRequired(false)
                            .setValue(currentValue.substring(0, 4000))
                    )
                );
                await interaction.showModal(modal);
                return;
            }
        }
        else if (interaction.isButton()) {
            if (interaction.customId.startsWith('pag_')) {
                const parts = interaction.customId.split('_');
                const tipoFiltro = parts[1]; // 'bundles' or 'passes' or 'skins' or 'cromas' or 'eternos'
                const pageStr = parts[2];
                const champName = parts[3];
                if (!pageStr) return interaction.deferUpdate().catch(()=>null);
                
                const page = parseInt(pageStr);
                
                if (champName) {
                    const cor = '#F43F5E';
                    const menuId = `selecionar_${tipoFiltro.slice(0,-1)}_menu`; // e.g. selecionar_skin_menu
                    return await buscarEExibirItens(champName.replace(/-/g, ' '), interaction, cor, menuId, tipoFiltro, page, true);
                }
                
                return await enviarPaginaCatalogo(interaction, tipoFiltro, page, true);
            }
            if (['btn_rp', 'btn_account', 'btn_friend', 'btn_back'].includes(interaction.customId) || interaction.customId.startsWith('btn_friend_')) {
                try {
                    await interaction.deferUpdate();
                } catch (e) {
                    return; // Ignora se a interação já tiver expirado
                }
                
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const { getUserInfo, getStoreBalance, getFriendList } = require('./utils/riotAuth.js');
                    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    
                    const accountsPath = path.join(__dirname, 'config', 'riot_accounts.json');
                    if (!fs.existsSync(accountsPath)) return interaction.followUp({ content: '❌ No accounts saved.', ephemeral: true });
                    const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
                    let accountName = null;
                    if (global.userStoreSessions && global.userStoreSessions.has(interaction.user.id)) {
                        accountName = global.userStoreSessions.get(interaction.user.id).accountName;
                    }
                    
                    if (!accountName && interaction.message.embeds.length > 0) {
                        const embed = interaction.message.embeds[0];
                        const fullText = `${embed.title || ''} ${embed.description || ''} ${embed.footer?.text || ''}`;
                        for (const name in accounts) {
                            if (fullText.includes(name)) {
                                accountName = name;
                                break;
                            }
                        }
                    }
                    
                    if (!accountName) {
                        const accEntries = Object.entries(accounts);
                        const validAcc = accEntries.find(([n, a]) => !a.expired) || accEntries[0];
                        if (validAcc) {
                            accountName = validAcc[0];
                        }
                    }
                    
                    if (!accountName || !accounts[accountName]) {
                        return interaction.followUp({ content: '❌ Account session not found or expired.', ephemeral: true });
                    }
                    
                    const acc = accounts[accountName];
                    
                    if (!global.userStoreSessions) global.userStoreSessions = new Map();
                    global.userStoreSessions.set(interaction.user.id, {
                        accountName: accountName,
                        accessToken: acc.accessToken,
                        entitlementsToken: acc.entitlementsToken,
                        region: acc.region || 'BR1'
                    });
                    const { buildCustomEmbed } = require('./utils/customEmbeds.js');

                    if (interaction.customId === 'btn_rp') {
                        console.log('btn_rp clicked, fetching balance...');
                        const balance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region);
                        const rp = balance?.rp || 0;
                        console.log('btn_rp got rp:', rp);
                        
                        acc.rp = rp;
                        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));

                        const rpEmbed = buildCustomEmbed('dashboard_rp', interaction.client, interaction, {
                            accountName: accountName,
                            region: acc.region || 'BR1',
                            rp: rp.toLocaleString('en-US'),
                            be: (acc.be || 0).toLocaleString('en-US')
                        });
                        
                        await interaction.editReply({ embeds: [rpEmbed] }).catch(err => console.error('editReply error:', err));
                        console.log('btn_rp finished.');
                    }
                    else if (interaction.customId === 'btn_account') {
                        const { checkAccountBan } = require('./utils/riotAuth.js');
                        const isBanned = await checkAccountBan(acc.accessToken, acc.idToken);

                        let level = acc.summonerLevel || 30;

                        try {
                            const balance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                            if (balance && balance.summonerLevel) {
                                level = balance.summonerLevel;
                                acc.summonerLevel = level;
                                fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
                            }
                        } catch(e) {}

                        let expMs = null;
                        if (acc.accessToken) {
                            try {
                                const payload = JSON.parse(Buffer.from(acc.accessToken.split('.')[1], 'base64').toString('utf8'));
                                if (payload.exp) expMs = payload.exp * 1000;
                            } catch(e) {}
                        }
                        if (!expMs && acc.idToken) {
                            try {
                                const payload = JSON.parse(Buffer.from(acc.idToken.split('.')[1], 'base64').toString('utf8'));
                                if (payload.exp) expMs = payload.exp * 1000;
                            } catch(e) {}
                        }

                        let sessionTimeStr = '🟢 **Ativo**';
                        if (acc.expired || !expMs || expMs <= Date.now()) {
                            acc.expired = true;
                            sessionTimeStr = '🔴 **Expirado (0m)**';
                        } else {
                            const diffMs = expMs - Date.now();
                            const mins = Math.floor(diffMs / (1000 * 60));
                            const hours = Math.floor(mins / 60);
                            const remMins = mins % 60;
                            if (hours > 0) {
                                sessionTimeStr = `🟢 **${hours}h ${remMins}m restantes**`;
                            } else {
                                sessionTimeStr = `🟢 **${mins} min restantes**`;
                            }
                        }

                        const bannedStr = isBanned ? '🔴 **Sim (Banida)**' : '🟢 **Não (Ativa)**';
                        
                        const accEmbed = buildCustomEmbed('dashboard_account', interaction.client, interaction, {
                            accountName: accountName,
                            region: acc.region || 'BR1',
                            level: String(level),
                            banned: bannedStr,
                            sessionTime: sessionTimeStr
                        });
                        if (isBanned) accEmbed.setColor('#EF4444');

                        await interaction.editReply({ embeds: [accEmbed] }).catch(err => console.error('editReply error:', err));
                    }
                    else if (interaction.customId.startsWith('btn_friend')) {
                        let page = 1;
                        if (interaction.customId.includes('_prev_')) {
                            page = parseInt(interaction.customId.split('_prev_')[1]) || 1;
                        } else if (interaction.customId.includes('_next_')) {
                            page = parseInt(interaction.customId.split('_next_')[1]) || 1;
                        }

                        const friends = await getFriendList(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                        let friendText = 'Nenhum amigo encontrado.';
                        const totalFriends = friends ? friends.length : 0;
                        const pageSize = 12;
                        const totalPages = Math.max(1, Math.ceil(totalFriends / pageSize));
                        if (page > totalPages) page = totalPages;
                        if (page < 1) page = 1;

                        if (friends && friends.length > 0) {
                            const startIdx = (page - 1) * pageSize;
                            const pageFriends = friends.slice(startIdx, startIdx + pageSize);
                            friendText = pageFriends.map(f => {
                                let timeStr = '';
                                if (f.friendsSince) {
                                    const since = new Date(f.friendsSince.replace(' ', 'T') + 'Z');
                                    const diffMs = Date.now() - since.getTime();
                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    timeStr = ` (${diffDays}d)`;
                                }
                                return `• **${f.name || f.nick}**${timeStr}`;
                            }).join('\n');
                        }

                        const friendEmbed = buildCustomEmbed('dashboard_friends', interaction.client, interaction, {
                            accountName: accountName,
                            friendText: friendText
                        });

                        const prevPage = Math.max(1, page - 1);
                        const nextPage = Math.min(totalPages, page + 1);

                        const row1 = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('btn_rp').setLabel('RP').setStyle(ButtonStyle.Secondary).setEmoji('🪙'),
                            new ButtonBuilder().setCustomId('btn_account').setLabel('Account').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️'),
                            new ButtonBuilder().setCustomId('btn_friend').setLabel('Friend').setStyle(ButtonStyle.Primary).setEmoji('🫂'),
                            new ButtonBuilder().setCustomId('btn_back').setStyle(ButtonStyle.Secondary).setEmoji('🔄')
                        );

                        const row2 = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`btn_friend_prev_${prevPage}`).setLabel('Anterior').setStyle(ButtonStyle.Secondary).setEmoji('◀️').setDisabled(page <= 1),
                            new ButtonBuilder().setCustomId('btn_friend_indicator').setLabel(`Página ${page}/${totalPages} (${totalFriends} amigos)`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                            new ButtonBuilder().setCustomId(`btn_friend_next_${nextPage}`).setLabel('Próxima').setStyle(ButtonStyle.Secondary).setEmoji('▶️').setDisabled(page >= totalPages)
                        );

                        await interaction.editReply({ embeds: [friendEmbed], components: [row1, row2] }).catch(err => console.error('editReply error:', err));
                    }
                    else if (interaction.customId === 'btn_back') {
                        const balance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region);
                        const rp = balance?.rp || 0;
                        const be = balance?.ip || 0;
                        acc.rp = rp;
                        acc.be = be;
                        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));

                        const successEmbed = buildCustomEmbed('login_success', interaction.client, interaction, {
                            accountName: accountName,
                            region: acc.region || 'BR1',
                            rp: rp.toLocaleString('en-US'),
                            be: be.toLocaleString('en-US')
                        });

                        await interaction.editReply({ embeds: [successEmbed] }).catch(err => console.error('editReply error:', err));
                    }
                } catch (e) {
                    console.error('[Button Error]', e.response ? e.response.data : e.message);
                    await interaction.followUp({ content: `❌ Error fetching data: ${e.message}`, ephemeral: true });
                }
                return;
            }

            if (interaction.customId === 'btn_payment_methods') {
                const embedPay = buildCustomEmbed('ticket_payment_methods', interaction.client, interaction);
                return await interaction.reply({ embeds: [embedPay], ephemeral: true }).catch(()=>{});
            }

            if (['adicionar_saldo', 'meu_perfil', 'backup'].includes(interaction.customId)) {
                return interaction.reply({ content: '🛠️ **Em breve!** Este sistema está em desenvolvimento.', ephemeral: true }).catch(()=>{});
            }
            if (interaction.customId === 'abrir_loja') {
                const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                await interaction.reply({ content: `${loadEmj} ${getLoadStr('auth')}`, ephemeral: true });
                
                await new Promise(resolve => setTimeout(resolve, 2500));
                
                if (!userStoreSessions.has(interaction.user.id)) {
                    userStoreSessions.set(interaction.user.id, { regiao: 'NA', riotId: 'Unknown' });
                }

                const embed = buildCustomEmbed('store_authentication', interaction.client, interaction);
                
                const regionNames = {
                    'br': 'Brazil', 'na': 'North America', 'euw': 'Europe West', 'eune': 'Europe Nordic & East',
                    'lan': 'Latin America North', 'las': 'Latin America South', 'oce': 'Oceania', 'tr': 'Turkey',
                    'ru': 'Russia', 'jp': 'Japan', 'kr': 'South Korea', 'ph': 'Philippines', 'sg': 'Singapore, Malaysia, & Indonesia',
                    'tw': 'Taiwan, Hong Kong, & Macao', 'th': 'Thailand', 'vn': 'Vietnam'
                };
                
                const objRegioes = customEmojis?.lol_regions || {};
                const opcoesRegiao = Object.keys(objRegioes).map(k => {
                    const emjStr = (objRegioes[k] || '').trim();
                    const desc = regionNames[k.toLowerCase()] || `Region: ${k.toUpperCase()}`;
                    let emojiObj = null;
                    const match = emjStr.match(/<a?:(\w+):(\d+)>/);
                    if (match) {
                        emojiObj = { name: match[1], id: match[2] };
                    } else if (emjStr) {
                        emojiObj = emjStr;
                    }
                    return {
                        label: k.toUpperCase(),
                        description: desc,
                        value: k.toUpperCase(),
                        ...(emojiObj ? { emoji: emojiObj } : {})
                    };
                });

                if (opcoesRegiao.length === 0) {
                    opcoesRegiao.push({ label: 'NA', value: 'NA', emoji: '🌍' });
                }

                const regiaoMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_regiao')
                        .setPlaceholder('Select your region')
                        .addOptions(opcoesRegiao)
                );

                try {
                    await interaction.editReply({ content: '', embeds: [embed], components: [regiaoMenu] });
                } catch (e) {
                    console.error("Erro ao enviar menu de regiões:", e);
                    if (e.code === 50035) {
                        await interaction.editReply({ content: '❌ **Error:** One or more emojis set for the **LoL Regions** in the Emoji Manager are invalid or inaccessible to the bot! Please go to `/emojis` -> Utilities -> LoL Regions and fix/remove them.', embeds: [], components: [] });
                    }
                }
                return;
            }

            else if (interaction.customId === 'confirmar_regiao_store') {
                const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                await interaction.update({ content: `${loadEmj} ${getLoadStr('sales')}`, embeds: [], components: [] });
                await new Promise(resolve => setTimeout(resolve, 2500));

                const embed = buildCustomEmbed('store_sales_center', interaction.client, interaction);
                
                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('menu_vendas').setPlaceholder('Select a purchase option').addOptions([
                        { label: 'Skins', description: 'Purchase LoL skins', value: 'compra_skins', emoji: (customEmojis?.skins?.legendary || '🔴').trim() },
                        { label: 'Chromas', description: 'Purchase LoL chromas', value: 'compra_chromas', emoji: (customEmojis?.skins?.croma || '🎨').trim() },
                        { label: 'Passes & Loots', description: 'Purchase event passes & loots', value: 'compra_passes', emoji: (customEmojis?.loot?.pass || '🎫').trim() },
                        { label: 'Highlights', description: 'Purchase featured store items (Signatures, Sets, etc.)', value: 'compra_highlights', emoji: (customEmojis?.bundles?.signature || '🌟').trim() },
                        { label: 'Champions', description: 'Purchase champions', value: 'compra_champions', emoji: (customEmojis?.skins?.champion || '⚔️').trim() },
                        { label: 'Eternals', description: 'Purchase eternals series', value: 'compra_eternos', emoji: (customEmojis?.skins?.eternos || '🏆').trim() }
                    ])
                );
                await interaction.editReply({ content: '', embeds: [embed], components: [menu] });
                return;
            }

            else if (interaction.customId === 'voltar_menu_modal') {
                const embed = buildCustomEmbed('store_sales_center', interaction.client, interaction);
                
                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('menu_vendas').setPlaceholder('Select a purchase option').addOptions([
                        { label: 'Skins', description: 'Purchase LoL skins', value: 'compra_skins', emoji: (customEmojis?.skins?.legendary || '🔴').trim() },
                        { label: 'Chromas', description: 'Purchase LoL chromas', value: 'compra_chromas', emoji: (customEmojis?.skins?.croma || '🎨').trim() },
                        { label: 'Passes & Loots', description: 'Purchase event passes & loots', value: 'compra_passes', emoji: (customEmojis?.loot?.pass || '🎫').trim() },
                        { label: 'Highlights', description: 'Purchase featured store items (Signatures, Sets, etc.)', value: 'compra_highlights', emoji: (customEmojis?.bundles?.signature || '🌟').trim() },
                        { label: 'Champions', description: 'Purchase champions', value: 'compra_champions', emoji: (customEmojis?.skins?.champion || '⚔️').trim() },
                        { label: 'Eternals', description: 'Purchase eternals series', value: 'compra_eternos', emoji: (customEmojis?.skins?.eternos || '🏆').trim() }
                    ])
                );
                await interaction.update({ content: '', embeds: [embed], components: [menu] });
                return;
            }

            else if (interaction.customId === 'fechar_ticket') {
                const modal = new ModalBuilder().setCustomId('modal_fechar_ticket').setTitle('🔒 Close Ticket');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('ticket_motivo_fechamento').setLabel('Reason for closing:').setStyle(TextInputStyle.Paragraph).setRequired(true)
                ));
                interaction.showModal(modal).catch(e => { if (e.code !== 10062 && e.code !== 40060) console.error("Erro ao abrir modal_fechar_ticket:", e); });
            }
            else if (interaction.customId === 'editar_pedido') {
                const modal = new ModalBuilder().setCustomId('modal_editar_pedido').setTitle('✏️ Edit Details');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_region').setLabel('New Region').setPlaceholder('Ex: BR, NA, EUW').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_riotid').setLabel('New Riot ID').setPlaceholder('Ex: Name#Tag').setStyle(TextInputStyle.Short).setRequired(true))
                );
                interaction.showModal(modal).catch(e => { if (e.code !== 10062 && e.code !== 40060) console.error("Erro ao abrir modal_editar_pedido:", e); });
            }
            else if (interaction.customId.startsWith('rate_')) {
                const stars = interaction.customId.split('_')[1];
                await interaction.update({ content: `💖 Muito obrigado pela sua avaliação de **${stars} estrela(s)**!`, components: [], embeds: [] });
                return;
            }
            else if (interaction.customId === 'tentar_novamente_skins') {
                abrirModalBusca(interaction, 'buscar_campeao_modal', '🔍 Search Skins', 'Enter the champion\'s name:');
            } 
            else if (interaction.customId === 'tentar_novamente_cromas') {
                abrirModalBusca(interaction, 'buscar_campeao_chromas_modal', '🔍 Search Chromas', 'Enter the champion\'s name:');
            } 
            else if (interaction.customId === 'tentar_novamente_eternos') {
                abrirModalBusca(interaction, 'buscar_campeao_eternos_modal', '🏆 Search Eternals', 'Which champion\'s Eternals do you want to see?');
            } 
            else if (interaction.customId === 'tentar_novamente_campeao') {
                abrirModalBusca(interaction, 'buscar_compra_campeao_modal', '⚔️ Purchase Champion', 'Enter the champion\'s name:');
            }
            else if (interaction.customId === 'voltar_menu_embeds_inicio') {
                const embed = formatEmbed(new EmbedBuilder(), interaction.client)
                    .setTitle('🦊 Kitsune | Embed Manager')
                    .setColor('#F43F5E')
                    .setDescription('Welcome to the **Embed Manager**! Here you can customize the text, colors, and images of all the bot embeds.\n\nSelect the embed you wish to edit below:');

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_embed_select')
                        .setPlaceholder('Select an embed to edit')
                        .addOptions([
                            { label: 'Ticket Welcome', description: 'The message sent by /ticket', value: 'ticket_welcome', emoji: '✉️' },
                            { label: 'Store Authentication', description: 'The region selection menu', value: 'store_authentication', emoji: '🌍' },
                            { label: 'Store Sales Center', description: 'The category selection menu', value: 'store_sales_center', emoji: '🛒' },
                            { label: 'Ticket Order Received', description: 'The message inside the ticket channel', value: 'ticket_order_received', emoji: '🎫' },
                            { label: 'Admin Panel', description: 'The message sent by /painel_admin', value: 'admin_panel', emoji: '⚙️' },
                            { label: 'Support Panel', description: 'The message sent by /painel', value: 'support_panel', emoji: '🛠️' },
                            { label: 'Table Skins', description: 'The Skins embed sent by /tabela', value: 'tabela_skins', emoji: '👗' },
                            { label: 'Table Loot', description: 'The Loot embed sent by /tabela', value: 'tabela_loot', emoji: '🎁' }
                        ])
                );

                await interaction.update({ embeds: [embed], components: [menu] });
                return;
            }

            else if (interaction.customId === 'voltar_menu_emojis_categorias') {
                const embed = formatEmbed(new EmbedBuilder(), interaction.client)
                    .setTitle('🦊 Kitsune | Emoji Manager')
                    .setColor('#F43F5E')
                    .setDescription('Select an emoji category below to begin editing the bot emojis.');

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_emojis_categorias')
                        .setPlaceholder('Select a category')
                        .addOptions([
                            { label: 'Skins', value: 'skins', emoji: '✨' },
                            { label: 'Loot', value: 'loot', emoji: '📦' },
                            { label: 'Utilities', value: 'utilidades', emoji: '🛠️' },
                            { label: 'Store Products', value: 'loja_produtos', emoji: '🛒' },
                            { label: 'Store Status', value: 'loja_status', emoji: '📊' },
                            { label: 'Staff Roles', value: 'staff_roles', emoji: '🛡️' },
                            { label: 'LoL Roles', value: 'lol_roles', emoji: '⚔️' },
                            { label: 'LoL Regions', value: 'lol_regions', emoji: '🌍' },
                            { label: 'Ticket', value: 'ticket', emoji: '🎫' }
                        ])
                );

                await interaction.update({ embeds: [embed], components: [menu] });
                return;
            }

        }

        else if (interaction.isModalSubmit()) {
            const cor = '#F43F5E';
            if (interaction.customId.startsWith('modal_embed_')) {
                const match = interaction.customId.match(/modal_embed_(.+)__(.+)/);
                if (match) {
                    const embedId = match[1];
                    const field = match[2];
                    let finalValue = interaction.fields.getTextInputValue('novo_valor');
                    
                    if (field === 'color') {
                        const colorMap = { 'yellow': '#FFFF00', 'red': '#FF0000', 'green': '#00FF00', 'blue': '#0000FF', 'black': '#000000', 'white': '#FFFFFF', 'purple': '#800080', 'pink': '#FFC0CB', 'orange': '#FFA500', 'gray': '#808080', 'blurple': '#5865F2' };
                        const lower = finalValue.toLowerCase().trim();
                        if (colorMap[lower]) finalValue = colorMap[lower];
                        else if (!finalValue.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(finalValue)) finalValue = '#' + finalValue;
                    }

                    if (field === 'globalDiscount') {
                        let pct = parseFloat(finalValue.replace(',', '.').replace('%', ''));
                        if (isNaN(pct) || pct < 0) pct = 0;
                        const lojaPath = path.join(__dirname, 'config', 'loja.json');
                        let lojaFile = {};
                        if (fs.existsSync(lojaPath)) lojaFile = JSON.parse(fs.readFileSync(lojaPath, 'utf8'));
                        
                        let targetCategories = [];
                        if (embedId === 'tabela_skins') targetCategories = ['skins', 'bundles'];
                        else if (embedId === 'tabela_loot') targetCategories = ['loot'];
                        else targetCategories = Object.keys(lojaFile).filter(c => c !== 'banners');

                        for (const cat of targetCategories) {
                            if (!lojaFile[cat]) continue;
                            for (const k in lojaFile[cat]) {
                                const itemObj = lojaFile[cat][k];
                                if (pct === 0) {
                                    itemObj.desconto = null;
                                } else {
                                    if (itemObj.preco && parseFloat(itemObj.preco) > 0) {
                                        const baseP = parseFloat(itemObj.preco);
                                        const finalP = baseP - (baseP * (pct / 100));
                                        itemObj.desconto = finalP.toFixed(2);
                                    }
                                }
                            }
                        }
                        fs.writeFileSync(lojaPath, JSON.stringify(lojaFile, null, 2), 'utf8');
                        await interaction.reply({ content: `✅ Discount of **${pct}%** successfully applied to **${targetCategories.join(', ')}**!`, ephemeral: true });
                        return;
                    }

                    if (!customEmbeds[embedId]) customEmbeds[embedId] = {};
                    customEmbeds[embedId][field] = finalValue;
                    
                    fs.writeFileSync(path.join(__dirname, 'config', 'embeds.json'), JSON.stringify(customEmbeds, null, 2), 'utf8');
                    client.emit('reloadEmbeds');
                    
                    await interaction.reply({ content: `✅ Embed **${embedId}** field **${field}** successfully updated!`, ephemeral: true });
                }
                return;
            }
            
            if (interaction.customId.startsWith('modal_riot_login__')) {
                const accountName = interaction.customId.replace('modal_riot_login__', '');
                const password = interaction.fields.getTextInputValue('riot_password');
                
                await interaction.reply({ content: `⏳ Initiating Riot authentication for **${accountName}**... This might take up to 30 seconds.`, ephemeral: true });
                
                try {
                    const { riotLogin } = require('./utils/riotAuth.js');
                    const authData = await riotLogin(accountName, password);
                    
                    const accountsPath = path.join(__dirname, 'config', 'riot_accounts.json');
                    let accounts = {};
                    if (fs.existsSync(accountsPath)) {
                        accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
                    }
                    
                    accounts[accountName] = {
                        ...authData,
                        updatedAt: new Date().toISOString()
                    };
                    
                    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
                    
                    await interaction.editReply({ content: `✅ Successfully authenticated **${accountName}**! Tokens have been securely saved.` });
                } catch (error) {
                    console.error('[RiotAuth Error]', error);
                    await interaction.editReply({ content: `❌ Authentication failed for **${accountName}**. Reason: \`${error.message}\`` });
                }
                return;
            }
            
            if (interaction.customId.startsWith('modal_emoji_edit__')) {
                const val = interaction.customId.split('__').slice(1).join('__'); // "skins__ultimate"
                const [cat, key] = val.split('__');
                const novoEmoji = interaction.fields.getTextInputValue('novo_emoji').trim();

                try {
                    const emojisPath = path.join(__dirname, 'config', 'emojis.json');
                    const fileData = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));
                    
                    if (!fileData[cat]) fileData[cat] = {};
                    fileData[cat][key] = novoEmoji;
                    
                    fs.writeFileSync(emojisPath, JSON.stringify(fileData, null, 2), 'utf8');
                    client.emit('reloadEmojis');
                    
                    await interaction.reply({ content: `✅ Emoji for **${cat} -> ${key}** successfully updated to: ${novoEmoji}`, ephemeral: true });
                } catch (e) {
                    console.error(e);
                    await interaction.reply({ content: `❌ Internal error while updating emojis.json.`, ephemeral: true });
                }
                return;
            }

            if (interaction.customId === 'modal_riot_id') {
                try {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferReply({ ephemeral: true });
                    }
                } catch(e) {
                    if (e.code === 10062) return;
                }

                const riotId = interaction.fields.getTextInputValue('ticket_riot');
                const session = userStoreSessions.get(interaction.user.id) || { regiao: 'BR' };
                session.riotId = riotId;
                userStoreSessions.set(interaction.user.id, session);
                
                const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                await interaction.editReply({ content: `${loadEmj} ${getLoadStr('sales')}` }).catch(() => {});
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const embed = buildCustomEmbed('store_sales_center', interaction.client, interaction);
                
                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('menu_vendas').setPlaceholder('Select a purchase option').addOptions([
                        { label: 'Skins', description: 'Purchase LoL skins', value: 'compra_skins', emoji: (customEmojis?.skins?.legendary || '🔴').trim() },
                        { label: 'Chromas', description: 'Purchase LoL chromas', value: 'compra_chromas', emoji: (customEmojis?.skins?.croma || '🎨').trim() },
                        { label: 'Passes & Loots', description: 'Purchase event passes & loots', value: 'compra_passes', emoji: (customEmojis?.loot?.pass || '🎫').trim() },
                        { label: 'Highlights', description: 'Purchase exclusive signature and chroma bundles', value: 'compra_highlights', emoji: (customEmojis?.bundles?.bundle || '📦').trim() },
                        { label: 'Champions', description: 'Purchase champions', value: 'compra_champions', emoji: (customEmojis?.skins?.champion || '⚔️').trim() },
                        { label: 'Eternals', description: 'Purchase eternals series', value: 'compra_eternos', emoji: (customEmojis?.skins?.eternos || '🏆').trim() }
                    ])
                );
                try {
                    await interaction.editReply({ content: '', embeds: [embed], components: [menu] });
                } catch (e) {
                    console.error("Erro ao enviar menu_vendas (verifique se os emojis em emojis.json são válidos e se o bot está no servidor deles!):", e.message);
                    await interaction.editReply({ content: "❌ **Erro Interno:** Alguns emojis configurados em `emojis.json` são inválidos ou o bot não tem acesso a eles. Verifique o console." });
                }
            }
            
            else if (interaction.customId === 'buscar_campeao_modal') {
                const busca = interaction.fields.getTextInputValue('nome_campeao_busca');
                await buscarEExibirItens(busca, interaction, cor, 'selecionar_skin_menu', 'skins');
            } 
            else if (interaction.customId === 'buscar_campeao_chromas_modal') {
                const busca = interaction.fields.getTextInputValue('nome_campeao_busca');
                await buscarEExibirItens(busca, interaction, cor, 'selecionar_chroma_menu', 'cromas');
            } 
            else if (interaction.customId === 'buscar_campeao_eternos_modal') {
                const busca = interaction.fields.getTextInputValue('nome_campeao_busca');
                await buscarEExibirItens(busca, interaction, cor, 'selecionar_eterno_menu', 'eternos');
            } 

            else if (interaction.customId === 'buscar_compra_campeao_modal') {
                const busca = interaction.fields.getTextInputValue('nome_campeao_busca');
                await buscarEExibirItens(busca, interaction, cor, 'selecionar_champion_menu', 'champions');
            } 
            else if (interaction.customId === 'modal_fechar_ticket') {
                const motivo = interaction.fields.getTextInputValue('ticket_motivo_fechamento');
                
                let ownerId = null;
                if (interaction.channel.topic && interaction.channel.topic.includes('Ticket-Owner: ')) {
                    ownerId = interaction.channel.topic.split('Ticket-Owner: ')[1].trim();
                }

                await interaction.reply({ content: `🔒 Ticket sendo fechado por: *"${motivo}"* em 5 segundos...` }).catch(e => { if (e.code !== 10062 && e.code !== 40060) console.error(e); });

                if (ownerId) {
                    try {
                        const owner = await client.users.fetch(ownerId);
                        if (owner) {
                            const starRow = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId('rate_1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId('rate_2').setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId('rate_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId('rate_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId('rate_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
                            );
                            const ratingEmbed = new EmbedBuilder()
                                .setColor('#F43F5E')
                                .setTitle('Obrigado por usar nossos serviços! 🦊')
                                .setDescription(`Seu ticket foi fechado pelo motivo: *"${motivo}"*\n\nComo você avaliaria o nosso atendimento hoje?`);
                            await owner.send({ embeds: [ratingEmbed], components: [starRow] }).catch(() => {});
                        }
                    } catch (err) {
                        console.error('Failed to send DM to ticket owner:', err);
                    }
                }

                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch (e) {
                        console.error("Erro ao deletar canal:", e);
                    }
                }, 5000);
            }
            else if (interaction.customId === 'modal_editar_pedido') {
                const newRegion = interaction.fields.getTextInputValue('new_region').toUpperCase();
                const newRiotId = interaction.fields.getTextInputValue('new_riotid');
                
                const oldEmbed = interaction.message.embeds[0];
                const newEmbed = EmbedBuilder.from(oldEmbed);
                
                if (newEmbed.data.fields && newEmbed.data.fields.length >= 4) {
                    newEmbed.data.fields[2].value = `\`${newRegion}\``;
                    newEmbed.data.fields[3].value = `\`${newRiotId}\``;
                }
                
                await interaction.update({ embeds: [newEmbed] });
            }
        }
    } catch (e) { 
        console.error('ERRO INTERNO:', e); 
    }
});

function abrirModalBusca(interaction, id, titulo, label) {
    const modal = new ModalBuilder().setCustomId(id).setTitle(titulo);
    modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
            .setCustomId('nome_campeao_busca')
            .setLabel(label)
            .setPlaceholder('Ex: Yasuo, Lux, Zed...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
    ));
    interaction.showModal(modal).catch(() => {});
}

async function buscarEExibirItens(busca, interaction, cor, menuId, tipoFiltro = 'skins', pagina = 0, isUpdate = false) {
    const ITEMS_PER_PAGE = 25;
    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
    if (!isUpdate) {
        await interaction.reply({ content: `${loadEmj} ${getLoadStr('search')}`, ephemeral: true });
        await new Promise(resolve => setTimeout(resolve, 2500));
    }
    
    const buscaLimpa = busca.trim();

    let campeaoFinal = riotCatalog.find(x => x.nome.toLowerCase().includes(buscaLimpa.toLowerCase()) && (x.tipo === 'CHAMPION' || x.tipo === 'CHAMPIONS'));

    if (!campeaoFinal) {
        const skinCamp = riotCatalog.find(x => x.nome.toLowerCase().includes(buscaLimpa.toLowerCase()) && x.tipo === 'CHAMPION_SKIN');
        if (skinCamp && skinCamp.parent_id) {
            campeaoFinal = { 
                id: skinCamp.parent_id, 
                nome: buscaLimpa.charAt(0).toUpperCase() + buscaLimpa.slice(1) 
            };
        }
    }

    if (!campeaoFinal) {
        const btnTentar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`tentar_novamente_${tipoFiltro}`).setLabel('Try Again').setStyle(ButtonStyle.Primary).setEmoji('🔄')
        );
        const msg = `❌ Could not find any champion matching **"${buscaLimpa}"**.`;
        if (interaction.replied || interaction.deferred) return interaction.editReply({ content: msg, embeds: [], components: [btnTentar] });
        if (isUpdate) return interaction.update({ content: msg, embeds: [], components: [btnTentar] });
        return interaction.reply({ content: msg, embeds: [], components: [btnTentar], ephemeral: true });
    }

    let results = [];
    if (tipoFiltro === 'skins') {
        const skins = riotCatalog.filter(x => x.parent_id === campeaoFinal.id && x.tipo === 'CHAMPION_SKIN' && x.rawItem?.subInventoryType !== 'RECOLOR');
        const signatureBundles = riotCatalog.filter(x => 
            (x.tipo === 'BUNDLES' || x.tipo === 'BUNDLE') && 
            x.nome.toLowerCase().includes('signature edition') &&
            x.nome.toLowerCase().includes(campeaoFinal.nome.toLowerCase())
        );
        results = [...skins, ...signatureBundles];
    } else if (tipoFiltro === 'cromas') {
        results = riotCatalog.filter(x => x.parent_id === campeaoFinal.id && x.tipo === 'CHAMPION_SKIN' && x.rawItem?.subInventoryType === 'RECOLOR');
    } else if (tipoFiltro === 'eternos') {
        results = riotCatalog.filter(x => x.parent_id === campeaoFinal.id && x.tipo === 'STATSTONE');
    } else if (tipoFiltro === 'champions') {
        const c = riotCatalog.find(x => x.id === campeaoFinal.id && (x.tipo === 'CHAMPION' || x.tipo === 'CHAMPIONS'));
        if (c) results = [c];
    }

    if (results.length === 0 && tipoFiltro === 'skins') {
        return buscarEExibirItens(campeaoFinal.nome, interaction, cor, 'selecionar_chroma_menu', 'cromas', 0, isUpdate);
    }

    if (results.length === 0) {
        const btnTentar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`tentar_novamente_${tipoFiltro}`).setLabel('Try Again').setStyle(ButtonStyle.Primary).setEmoji('🔄')
        );
        const msg = `❌ No ${tipoFiltro} found for **${campeaoFinal.nome}**.`;
        if (interaction.replied || interaction.deferred) return interaction.editReply({ content: msg, embeds: [], components: [btnTentar] });
        if (isUpdate) return interaction.update({ content: msg, embeds: [], components: [btnTentar] });
        return interaction.reply({ content: msg, embeds: [], components: [btnTentar], ephemeral: true });
    }

    // Sort active ones first, then by ID descending
    results = results.sort((a,b) => {
        const aActive = a.rawItem?.active !== false ? 1 : 0;
        const bActive = b.rawItem?.active !== false ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return b.id - a.id;
    });

    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE) || 1;
    if (pagina < 0) pagina = 0;
    if (pagina >= totalPages) pagina = totalPages - 1;
    
    const pageItems = results.slice(pagina * ITEMS_PER_PAGE, (pagina + 1) * ITEMS_PER_PAGE);

    const embedId = 'catalog_' + tipoFiltro;
    
    let embedConfirmacao = buildCustomEmbed(embedId, interaction?.client, interaction, {
        count: results.length.toString(),
        page: (pagina + 1).toString(),
        totalPages: totalPages.toString(),
        campeao: campeaoFinal.nome,
        emoji: '✨'
    });
    
    if (!embedConfirmacao.data.title) {
        let catTitle = tipoFiltro === 'skins' ? 'skins' : tipoFiltro === 'cromas' ? 'chromas' : tipoFiltro === 'eternos' ? 'eternals' : 'champions';
        embedConfirmacao.setTitle(`📦 ${results.length} ${catTitle} of ${campeaoFinal.nome}`);
    }
    
    if (!embedConfirmacao.data.description) {
        let catDesc = tipoFiltro === 'skins' ? 'skin' : tipoFiltro === 'cromas' ? 'chroma' : tipoFiltro === 'eternos' ? 'eternal' : 'champion';
        embedConfirmacao.setDescription(`> Please select an **${catDesc}** from the **menu** below to continue:\n> ${pagina + 1} page of ${totalPages} pages`);
    }

    if (!customEmbeds[embedId]?.color) embedConfirmacao.setColor(cor);

    if (customEmbeds[embedId]?.syncImage !== false) {
        const champMap = require('./data/championMap.json');
        const champKey = champMap[campeaoFinal.id];
        if (champKey) {
            embedConfirmacao.setImage(`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champKey}_0.jpg`);
        }
    }

    const loja = obterDadosLoja();
    const opcoesMenu = [];
    
    for (const row of pageItems) {
        const info = obterDetalhesItem(row.nome, tipoFiltro, loja, '0.00', row.rawItem);
        const baseName = row.nome.length > 90 ? row.nome.substring(0, 90) : row.nome;
        opcoesMenu.push({
            label: row.nome.substring(0, 100),
            description: info.desc,
            value: `${baseName}||${row.id}`,
            emoji: info.emoji
        });
    }

    const actionRows = [];

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(menuId)
            .setPlaceholder(`Select a ${tipoFiltro}`)
            .setOptions(opcoesMenu)
    );
    actionRows.push(menu);

    const btnRow = new ActionRowBuilder();
    
    btnRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`voltar_menu_modal`)
            .setLabel('Back to Menu')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji((customEmojis?.utilidades?.left || '⬅️').trim())
    );

    if (totalPages > 1) {
        btnRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`pag_${tipoFiltro}_${pagina - 1}_${campeaoFinal.nome.replace(/\s+/g, '-')}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pagina === 0),
            new ButtonBuilder()
                .setCustomId(`pag_${tipoFiltro}_${pagina + 1}_${campeaoFinal.nome.replace(/\s+/g, '-')}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pagina === totalPages - 1)
        );
    }
    actionRows.push(btnRow);

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: '', embeds: [embedConfirmacao], components: actionRows });
    } else if (isUpdate) {
        await interaction.update({ content: '', embeds: [embedConfirmacao], components: actionRows });
    } else {
        await interaction.reply({ content: '', embeds: [embedConfirmacao], components: actionRows, ephemeral: true });
    }
}

client.login(process.env.DISCORD_TOKEN);

// Background loop to refresh accounts and check tokens
async function refreshAccountsTask() {
    const fs = require('fs');
    const path = require('path');
    const { getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri, getStoreBalance, getEntitlements, getFriendList, reauthWithSSID, loginWithRiotCredentials } = require('./utils/riotAuth.js');
    const { friendlistCacheMap } = require('./commands/loja/gift.js');
    
    const accountsPath = path.join(__dirname, 'config', 'riot_accounts.json');
    if (!fs.existsSync(accountsPath)) return;
    
    let accounts;
    try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e) { return; }
    
    let updated = false;
    for (const [name, acc] of Object.entries(accounts)) {
        if (!acc.accessToken && !acc.ssid && !acc.username) continue;
        
        try {
            // Auto re-authenticate with SSID or Username/Password if configured
            if (acc.ssid) {
                try {
                    const freshTokens = await reauthWithSSID(acc.ssid);
                    if (freshTokens && freshTokens.accessToken) {
                        acc.accessToken = freshTokens.accessToken;
                        if (freshTokens.idToken) acc.idToken = freshTokens.idToken;
                        acc.expired = false;
                        updated = true;
                        console.log(`[RiotAuth] 🟢 Token renovado com sucesso via SSID para ${name}!`);
                    }
                } catch(ssidErr) {}
            }

            // Fallback to Username/Password if token expired or SSID failed
            if ((acc.expired || !acc.accessToken) && acc.username && acc.password) {
                try {
                    const freshTokens = await loginWithRiotCredentials(acc.username, acc.password);
                    if (freshTokens && freshTokens.accessToken) {
                        acc.accessToken = freshTokens.accessToken;
                        if (freshTokens.idToken) acc.idToken = freshTokens.idToken;
                        if (freshTokens.ssid) acc.ssid = freshTokens.ssid;
                        acc.expired = false;
                        updated = true;
                        console.log(`[RiotAuth] 🟢 Login automático 24/7 realizado com sucesso para ${name}!`);
                    }
                } catch(passErr) {}
            }

            if (acc.expired && !acc.ssid && !acc.username) continue;
            // Attempt to refresh entitlements token first
            try {
                const freshEntitlements = await getEntitlements(acc.accessToken);
                if (freshEntitlements) {
                    acc.entitlementsToken = freshEntitlements;
                    acc.expired = false;
                    updated = true;
                }
            } catch(e) {}

            // Check balance to see if token is valid and update RP
            const balance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
            if (balance && balance.error === 401) {
                acc.expired = true;
                updated = true;
                console.log(`[RiotAuth] 🔴 Token expirado para a conta ${name}. Copie a nova URL de login e use /link para renovar.`);
                continue;
            }
            
            if (balance && balance.rp !== undefined) {
                acc.rp = balance.rp;
                acc.be = balance.ip;
                acc.expired = false;
                updated = true;
            }

            // Refresh Geopas
            const geopas = await getGeopasToken(acc.accessToken);
            if (geopas) {
                acc.geopasToken = geopas;
                acc.affinity = decodeGeopasAffinity(geopas);
                acc.chatDom = getChatDom(acc.affinity);
                acc.chatUri = getChatUri(acc.region, acc.affinity);
                acc.updatedAt = new Date().toISOString();
                updated = true;
            }

            // Preload & Cache Friendlist in memory for instant /gift autocomplete
            try {
                const friends = await getFriendList(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                if (friends && friends.length > 0) {
                    friendlistCacheMap.set(name, { timestamp: Date.now(), friends });
                    if (acc.accessToken) friendlistCacheMap.set(acc.accessToken, { timestamp: Date.now(), friends });
                }
            } catch(fErr) {}

        } catch(e) {
            console.error(`[Background Task] Erro ao atualizar conta ${name}:`, e.message);
        }
    }
    
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    let summaryList = [];
    for (const [name, acc] of Object.entries(accounts)) {
        const status = acc.banned ? '🔴 BANIDA' : (acc.expired ? '🔴 EXPIRADA' : '🟢 ATIVA');
        summaryList.push(`${name}: ${acc.rp || 0} RP (${status})`);
    }
    console.log(`[${timeStr}] 🔄 [Refresh 20s] Contas atualizadas: ${summaryList.join(' | ')}`);
    
    if (updated) {
        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    }
}

// Run token refresh on startup and every 20 seconds to keep tokens active 24/7
refreshAccountsTask();
setInterval(refreshAccountsTask, 20 * 1000);
