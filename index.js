require('dotenv').config();

// Web Server para manter o bot online no Render (Pings do UptimeRobot)
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot Kitsune está Online e rodando!'));
app.get('/status', (req, res) => res.json({
    online: client.isReady(),
    tag: client.user ? client.user.tag : null,
    uptime: client.uptime,
    servers: client.guilds ? client.guilds.cache.map(g => ({ id: g.id, name: g.name })) : []
}));
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

const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const formatEmbed = require('./utils/embedFormat.js');
const { buildCustomEmbed } = require("./utils/customEmbeds.js");

function loadFullRiotCatalog(lang = 'en') {
    const targetFile = (lang === 'pt' || lang === 'pt_BR') ? 'catalog_cache_pt.json' : 'catalog_cache_en.json';

    let catalogPath = [
        path.join(__dirname, 'config', targetFile),
        path.join(__dirname, 'lol_giftapi-main', targetFile),
        path.join(__dirname, 'python_backend', targetFile),
        path.join(__dirname, 'python_backend', 'api_files', targetFile),
        path.join(__dirname, 'data', 'catalogo.json')
    ].find(p => fs.existsSync(p));

    if (!catalogPath) return [];

    try {
        const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        let items = [];

        if (Array.isArray(raw)) {
            items = raw.map(x => ({
                id: x.itemId || x.id,
                nome: x.localizations?.en_US?.name || x.name || x.nome || '',
                tipo: (x.inventoryType || x.tipo || 'DEFAULT').toUpperCase(),
                parent_id: x.parent?.itemId || x.parent_id || null,
                iconUrl: x.iconUrl ? (x.iconUrl.startsWith('http') ? x.iconUrl : 'https:' + x.iconUrl) : null,
                price_rp: x.prices?.find(p => p.currency === 'RP')?.cost || x.price_rp || 0,
                rarity: x.rarity || null,
                rarity_label: x.rarity_label || null,
                is_available: x.is_available !== false,
                status: x.status || (x.is_available !== false ? 'available' : 'off'),
                offer_id: x.offerId || x.offer_id || null,
                rawItem: x
            }));
        } else if (typeof raw === 'object' && raw !== null) {
            for (const catName in raw) {
                const catObj = raw[catName];
                if (typeof catObj === 'object' && catObj !== null) {
                    for (const itemName in catObj) {
                        const info = catObj[itemName];
                        let priceRp = info.price_rp;
                        if (priceRp === 'Null' || priceRp === null || priceRp === undefined) priceRp = 0;
                        items.push({
                            id: info.item_id || info.offer_id || itemName,
                            nome: itemName,
                            tipo: (info.inventory_type || catName).toUpperCase(),
                            parent_id: info.parent_id || null,
                            iconUrl: info.icon_url || null,
                            price_rp: Number(priceRp) || 0,
                            rarity: info.rarity || null,
                            rarity_label: info.rarity_label || null,
                            is_available: info.is_available !== false,
                            status: info.status || (info.is_available !== false ? 'available' : 'off'),
                            offer_id: info.offer_id || null,
                            rawItem: info
                        });
                    }
                }
            }
        }

        const tftArenasPath = path.join(__dirname, 'config', 'tft_arenas.json');
        if (fs.existsSync(tftArenasPath)) {
            try {
                const arenas = JSON.parse(fs.readFileSync(tftArenasPath, 'utf8'));
                for (const a of arenas) {
                    items.push({
                        id: a.id,
                        nome: a.name,
                        tipo: 'TFT_MAP_SKIN',
                        parent_id: null,
                        iconUrl: a.iconUrl || null,
                        price_rp: Number(a.price_rp) || 0,
                        rawItem: a
                    });
                }
            } catch (e) {}
        }

        const featBundlesPath = path.join(__dirname, 'config', 'featured_bundles.json');
        if (fs.existsSync(featBundlesPath)) {
            try {
                const feat = JSON.parse(fs.readFileSync(featBundlesPath, 'utf8'));
                for (const f of feat) {
                    items.push({
                        id: f.id,
                        nome: f.name,
                        tipo: 'BUNDLES',
                        parent_id: null,
                        iconUrl: f.iconUrl || null,
                        price_rp: Number(f.price_rp) || 0,
                        rawItem: f
                    });
                }
            } catch (e) {}
        }

        const mergedMap = new Map();
        items.forEach(item => {
            if (!item.id) return;
            const uniqueKey = item.rawItem?.offer_id || item.id;
            if (mergedMap.has(uniqueKey)) {
                const existing = mergedMap.get(uniqueKey);
                if (item.nome) existing.names.add(item.nome.toLowerCase());
            } else {
                item.names = new Set([item.nome.toLowerCase()]);
                mergedMap.set(uniqueKey, item);
            }
        });

        return Array.from(mergedMap.values());
    } catch (e) {
        console.error(`Erro ao carregar catálogo:`, e);
        return [];
    }
}

function isChroma(x) {
    if (!x) return false;
    const t = (x.tipo || x.inventory_type || '').toUpperCase();
    if (t === 'CHROMA') return true;
    const raw = x.rawItem || x;
    const sub = (raw.subInventoryType || raw.sub_inventory_type || x.subInventoryType || '').toUpperCase();
    if (sub === 'RECOLOR' || sub.includes('CHROMA')) return true;
    const name = (x.nome || x.name || '').toLowerCase();
    if (name.includes('chroma') || name.includes('croma')) return true;
    if (t !== 'CHAMPION_SKIN' && t !== 'SKIN' && t !== 'BUNDLES' && t !== 'BUNDLE') return false;
    if (/\((.*?)\)/.test(name)) {
        const content = name.match(/\((.*?)\)/)?.[1] || '';
        if (content === 'hextech' || content === 'prestige' || content === 'prestigiosa' || content.includes('2022') || content.includes('2023') || content.includes('2024') || content.includes('2025') || content.includes('2026')) {
            return false;
        }
        if (raw.price_rp === 290 || sub === 'RECOLOR' || t === 'CHROMA') return true;
    }
    return false;
}

let riotCatalog = loadFullRiotCatalog();

function findCatalogItem(itemId, name) {
    if (itemId && name) {
        const nameLower = name.toLowerCase();
        const found = riotCatalog.find(x => x.id === itemId && (x.nome?.toLowerCase() === nameLower || x.names?.has(nameLower)));
        if (found) return found;
    }
    if (itemId) {
        const found = riotCatalog.find(x => x.id === itemId);
        if (found) return found;
    }
    if (name) {
        const nameLower = name.toLowerCase();
        const found = riotCatalog.find(x => {
            if (x.nome && x.nome.toLowerCase() === nameLower) return true;
            if (x.names && x.names.has(nameLower)) return true;
            return false;
        });
        if (found) return found;
    }
    return null;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

client.commands = new Collection();

// Auto-restore persistent accounts from MongoDB Atlas & Render Environment Variable
const accountsDir = path.join(__dirname, 'config');
if (!fs.existsSync(accountsDir)) {
    fs.mkdirSync(accountsDir, { recursive: true });
}
const accountsPath = path.join(accountsDir, 'riot_accounts.json');

if (process.env.SAVED_RIOT_ACCOUNTS) {
    try {
        const envAccounts = JSON.parse(process.env.SAVED_RIOT_ACCOUNTS);
        let diskAccounts = {};
        if (fs.existsSync(accountsPath)) {
            try { diskAccounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e){}
        }
        const mergedAccounts = { ...envAccounts, ...diskAccounts };
        fs.writeFileSync(accountsPath, JSON.stringify(mergedAccounts, null, 2), 'utf8');
        console.log(`[Persistence] 💾 ${Object.keys(mergedAccounts).length} conta(s) restaurada(s) do backup SAVED_RIOT_ACCOUNTS!`);
    } catch(e) {
        console.error('[Persistence Error] Falha ao carregar SAVED_RIOT_ACCOUNTS:', e.message);
    }
}

// Sincronização automática inicial com o MongoDB Atlas
(async () => {
    try {
        const { syncMongoAndDisk, syncAllBotConfigs } = require('./utils/mongoStorage.js');
        await syncMongoAndDisk(accountsPath);
        await syncAllBotConfigs(path.join(__dirname, 'config'));
        carregarEmojis();
        carregarEmbeds();
    } catch (e) {
        console.error('[MongoDB Startup Sync Error]', e.message);
    }
})();

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

// Carregamento dinâmico de eventos (events/*.js)
function loadEvents(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            loadEvents(fullPath);
        } else if (item.endsWith('.js')) {
            const event = require(fullPath);
            if (event.name) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                console.log(`[Events] 📡 Evento '${event.name}' registrado com sucesso!`);
            }
        }
    });
}
loadEvents(path.join(__dirname, 'events'));

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

client.once(Events.ClientReady, async () => {
    console.log(`🟢 Kitsune Bot online como ${client.user.tag}!`);

    // Cache inicial de convites para o Invite Tracker
    global.guildInvitesCache = new Map();
    for (const guild of client.guilds.cache.values()) {
        try {
            const invites = await guild.invites.fetch();
            const guildCache = new Map();
            invites.forEach(inv => guildCache.set(inv.code, inv.uses));
            global.guildInvitesCache.set(guild.id, guildCache);
            console.log(`[InviteTracker] 📥 Cache de ${guildCache.size} convites carregado para o servidor: ${guild.name}`);
        } catch (e) {
            console.warn(`[InviteTracker] Não foi possível carregar convites de ${guild.name}:`, e.message);
        }
    }

    // Automatic Slash Commands Deployment to Discord API
    try {
        const { REST, Routes } = require('discord.js');
        const token = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.replace(/[\s\r\n"']/g, '') : null;
        if (token) {
            const rest = new REST({ version: '10' }).setToken(token);

            // 1. Wipe old guild commands from all servers to eliminate duplicates
            for (const guild of client.guilds.cache.values()) {
                try {
                    await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: [] });
                    console.log(`🧹 [Clean] Cleared old guild commands from server: ${guild.name}`);
                } catch (gErr) {}
            }

            // 2. Register clean single global commands
            const commandsBody = [];
            client.commands.forEach(cmd => {
                if (cmd.name && cmd.description) {
                    commandsBody.push({
                        name: cmd.name,
                        description: cmd.description,
                        options: cmd.options || []
                    });
                }
            });
            if (commandsBody.length > 0) {
                await rest.put(Routes.applicationCommands(client.user.id), { body: commandsBody });
                console.log(`✅ [Deploy] Successfully registered ${commandsBody.length} single global slash commands to Discord API!`);
            }
        }
    } catch (deployErr) {
        console.error('❌ [Deploy Error] Failed to register slash commands:', deployErr.message);
    }

    const { ActivityType } = require('discord.js');
    const activities = [
        { name: '🧙‍♂️ League of Legends', type: ActivityType.Streaming, url: 'https://twitch.tv/kitsunestore' },
        { name: '🎁 70% OFF Skins & Passes', type: ActivityType.Watching },
        { name: '⚡ 24/7 Gifting Delivery ', type: ActivityType.Streaming, url: 'https://twitch.tv/kitsunestore' }
    ];

    let i = 0;
    setInterval(() => {
        const act = activities[i % activities.length];
        client.user.setPresence({
            activities: [
                act.url
                    ? { name: act.name, type: act.type, url: act.url }
                    : { name: act.name, type: act.type }
            ],
            status: 'online'
        });
        i++;
    }, 15000);
});

console.log('🤖 Tentando autenticar bot no Discord...');
const cleanToken = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.replace(/[\s\r\n"']/g, '') : null;
if (!cleanToken) {
    console.error('❌ [ERRO CRÍTICO] process.env.DISCORD_TOKEN não está definido no Render!');
} else {
    client.login(cleanToken)
        .then(() => {
            console.log('🔑 Token validado e aceito pelo Discord!');
        })
        .catch(err => {
            console.error('❌ [ERRO AO LOGAR NO DISCORD]:', err);
        });
}

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
    } else if (item.price_rp !== undefined && item.price_rp !== null && item.price_rp !== 'Null') {
        cost = Number(item.price_rp);
    } else if (item.bundleItems) {
        cost = item.bundleItems.reduce((acc, curr) => acc + (curr.price && curr.price.currency === 'RP' ? curr.price.cost : 0), 0);
    }
    return cost;
}

function getCatalogPrice(rpCost, loja, formatMode = false, lang = 'pt', tipo = null) {
    if (!rpCost || isNaN(rpCost)) return '0.00';

    let discountPercent = 70;
    if (loja) {
        const t = (tipo || '').toLowerCase();
        let catKey = null;
        if (t === 'skins') catKey = 'desconto_skins';
        else if (t === 'cromas' || t === 'chromas') catKey = 'desconto_cromas';
        else if (t === 'highlights' || t === 'bundles') catKey = 'desconto_highlights';
        else if (t === 'passes') catKey = 'desconto_passes';
        else if (t === 'chests' || t === 'loot') {
            catKey = (loja.desconto_chests !== undefined && loja.desconto_chests !== null) ? 'desconto_chests' : 'desconto_hextech';
        }
        else if (t === 'emotes') catKey = 'desconto_emotes';
        else if (t === 'icones' || t === 'icons') catKey = 'desconto_icones';
        else if (t === 'wards' || t === 'ward') catKey = 'desconto_wards';
        else if (t === 'little_legends') catKey = 'desconto_little_legends';
        else if (t === 'tft_arena' || t === 'tft') catKey = 'desconto_tft_arena';
        else if (t === 'boosts') catKey = 'desconto_boosts';
        else if (t === 'eternos' || t === 'eternals') catKey = 'desconto_eternos';
        else if (t === 'misterio' || t === 'mystery') catKey = 'desconto_misterio';
        else if (t === 'hextech') {
            catKey = (loja.desconto_hextech !== undefined && loja.desconto_hextech !== null) ? 'desconto_hextech' : 'desconto_chests';
        }

        if (catKey && loja[catKey] !== undefined && loja[catKey] !== null) {
            discountPercent = parseFloat(loja[catKey]);
        } else if (loja.promocao_porcentagem !== undefined && loja.promocao_porcentagem !== null) {
            discountPercent = parseFloat(loja.promocao_porcentagem);
        }
    }

    const multiplier = (100 - discountPercent) / 100;
    const wasLabel = lang === 'en' ? 'Was' : 'De';

    const getVal = (item) => {
        if (!item) return null;
        const basePrice = item.preco ? parseFloat(item.preco) : null;
        if (!basePrice) return null;

        const calculatedDiscountPrice = basePrice * multiplier;

        if (discountPercent > 0 && discountPercent < 100) {
            return {
                final: calculatedDiscountPrice.toFixed(2),
                rawEmbed: `~~€${basePrice.toFixed(2)}~~ 🔥 **€${calculatedDiscountPrice.toFixed(2)}** (-${discountPercent}%)`,
                rawSelect: `€${calculatedDiscountPrice.toFixed(2)} 🔥 (${wasLabel} €${basePrice.toFixed(2)}) (-${discountPercent}%)`
            };
        }
        return {
            final: basePrice.toFixed(2),
            rawEmbed: `€${basePrice.toFixed(2)}`,
            rawSelect: `€${basePrice.toFixed(2)}`
        };
    };

    let catRes = null;

    // 1. Check exact RP match in loja.loot
    if (loja && loja.loot) {
        for (const [key, item] of Object.entries(loja.loot)) {
            const nameLower = (item.nome || '').toLowerCase();
            const rpMatch = nameLower.match(/(\d+)\s*rp/);
            if (rpMatch && parseInt(rpMatch[1], 10) === rpCost) {
                catRes = getVal(item);
                break;
            }
        }
    }

    // 2. Check exact RP match in loja.skins
    if (!catRes && loja && loja.skins) {
        let catItem = null;
        if (rpCost === 3250) catItem = loja.skins.ultimate;
        else if (rpCost === 2000) catItem = loja.skins.mythic;
        else if (rpCost === 1820) catItem = loja.skins.legendary;
        else if (rpCost === 1350) catItem = loja.skins.epic;
        else if (rpCost === 975) catItem = loja.skins.common_975;
        else if (rpCost === 750) catItem = loja.skins.common_750;
        else if (rpCost === 520) catItem = loja.skins.common_520;
        else if (rpCost === 290) catItem = loja.skins.croma;
        else if (rpCost === 490) catItem = loja.skins.mystery_skin;

        if (catItem) catRes = getVal(catItem);
    }

    // 3. Check exact RP match in loja.bundles
    if (!catRes && loja && loja.bundles) {
        for (const [key, item] of Object.entries(loja.bundles)) {
            const nameLower = (item.nome || '').toLowerCase();
            const rpMatch = nameLower.match(/(\d+)\s*rp/);
            if (rpMatch && parseInt(rpMatch[1], 10) === rpCost) {
                catRes = getVal(item);
                break;
            }
        }
    }

    if (catRes) {
        if (formatMode === 'embed') return catRes.rawEmbed;
        if (formatMode === 'select' || formatMode === true) return catRes.rawSelect;
        return catRes.final;
    }

    // 4. Fallback calculation with dynamic promo discount
    const baseVal = rpCost * 0.0060;

    if (discountPercent > 0 && discountPercent < 100) {
        const discountVal = baseVal * multiplier;
        if (formatMode === 'embed') {
            return `~~€${baseVal.toFixed(2)}~~ 🔥 **€${discountVal.toFixed(2)}** (-${discountPercent}%)`;
        }
        if (formatMode === 'select' || formatMode === true) {
            return `€${discountVal.toFixed(2)} 🔥 (${wasLabel} €${baseVal.toFixed(2)}) (-${discountPercent}%)`;
        }
        return discountVal.toFixed(2);
    }

    if (formatMode === 'embed' || formatMode === 'select' || formatMode === true) {
        return `€${baseVal.toFixed(2)}`;
    }
    return baseVal.toFixed(2);
}

const userStoreSessions = global.userStoreSessions = global.userStoreSessions || new Map();

function getItemRpValue(nome, tipoFiltro, rawItem = null) {
    if (rawItem && rawItem.sale_rp > 0) return rawItem.sale_rp;
    try {
        const weeklySalesPath = path.join(__dirname, 'config', 'weekly_sales.json');
        if (fs.existsSync(weeklySalesPath)) {
            const saleList = JSON.parse(fs.readFileSync(weeklySalesPath, 'utf8'));
            const nClean = (nome || '').toLowerCase().trim();
            const foundSale = saleList.find(s => s.name.toLowerCase().trim() === nClean || nClean.includes(s.name.toLowerCase().trim()));
            if (foundSale && foundSale.sale_rp > 0) {
                return foundSale.sale_rp;
            }
        }
    } catch (e) {}

    try {
        const featPath = path.join(__dirname, 'config', 'featured_bundles.json');
        if (fs.existsSync(featPath)) {
            const featList = JSON.parse(fs.readFileSync(featPath, 'utf8'));
            const nClean = (nome || '').toLowerCase().trim();
            const found = featList.find(f => f.name.toLowerCase().trim() === nClean || nClean.includes(f.name.toLowerCase().trim()));
            if (found && found.price_rp > 0) return found.price_rp;
        }
    } catch (e) {}

    try {
        const tftPath = path.join(__dirname, 'config', 'tft_arenas.json');
        if (fs.existsSync(tftPath)) {
            const arenaList = JSON.parse(fs.readFileSync(tftPath, 'utf8'));
            const nClean = (nome || '').toLowerCase().trim();
            const found = arenaList.find(a => a.name.toLowerCase().trim() === nClean || nClean.includes(a.name.toLowerCase().trim()));
            if (found && found.price_rp > 0) return found.price_rp;
        }
    } catch (e) {}

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
        if (n.includes('premium') || n.includes('25') || n.includes('6250')) return 6250;
        if (n.includes('deluxe') || n.includes('10') || n.includes('2500')) return 2500;
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
    if (tipoFiltro === 'orbes') return 250;

    return 1350;
}

function getActualItemType(nome, tipoFiltro, rawItem = null) {
    if (rawItem) {
        const invType = (rawItem.inventoryType || rawItem.inventory_type || rawItem.tipo || '').toUpperCase();
        if (invType === 'CHAMPION_SKIN' || invType === 'SKIN') {
            return isChroma(rawItem) ? 'cromas' : 'skins';
        }
        if (invType === 'CHAMPION' || invType === 'CHAMPIONS') {
            return 'champions';
        }
        if (invType === 'STATSTONE') {
            return 'eternos';
        }
        if (invType === 'BUNDLES' || invType === 'BUNDLE') {
            const nameLower = (nome || '').toLowerCase();
            if (isChroma(rawItem) || nameLower.includes('chroma') || nameLower.includes('croma')) {
                return 'cromas';
            }
            if (nameLower.includes('eterno') || nameLower.includes('eternal') || nameLower.includes('series') || nameLower.includes('série') || nameLower.includes('statstone')) {
                return 'eternos';
            }
            if (nameLower.includes('orb') || nameLower.includes('capsule') || nameLower.includes('orbe') || nameLower.includes('cápsula')) {
                return 'orbes';
            }
            if (nameLower.includes('chest') || nameLower.includes('key') || nameLower.includes('baú') || nameLower.includes('chave')) {
                return 'hextech';
            }
            if (nameLower.includes('pass') || nameLower.includes('passe')) {
                return 'passes';
            }
            return 'highlights';
        }
        if (invType === 'EVENT_PASS' || invType === 'PASS') {
            const nameLower = (nome || '').toLowerCase();
            if (nameLower.includes('eterno') || nameLower.includes('eternal') || nameLower.includes('series') || nameLower.includes('série') || nameLower.includes('statstone')) {
                return 'eternos';
            }
            return 'passes';
        }
        if (invType === 'EMOTE') {
            return 'emotes';
        }
        if (invType === 'SUMMONER_ICON' || invType === 'ICON') {
            return 'icones';
        }
        if (invType === 'WARD_SKIN' || invType === 'WARD') {
            return 'wards';
        }
        if (invType === 'COMPANION' || invType === 'LITTLELEGENDS') {
            return 'little_legends';
        }
        if (invType === 'TFT_MAP_SKIN' || invType === 'TFTARENA' || invType === 'TFT_DAMAGE_SKIN') {
            return 'tft_arena';
        }
        if (invType === 'BOOST') {
            return 'boosts';
        }
        if (invType === 'MYSTERY') {
            return 'misterio';
        }
        if (invType === 'HEXTECH_CRAFTING' || invType === 'HEXTECH') {
            const nameLower = (nome || '').toLowerCase();
            if (nameLower.includes('orb') || nameLower.includes('capsule') || nameLower.includes('orbe') || nameLower.includes('cápsula')) {
                return 'orbes';
            }
            return 'hextech';
        }
    }

    const nameLower = (nome || '').toLowerCase();
    if (nameLower.includes('chroma') || nameLower.includes('croma') || (/\((.*?)\)/.test(nameLower) && tipoFiltro !== 'skins')) {
        return 'cromas';
    }
    if (nameLower.includes('eterno') || nameLower.includes('eternal') || nameLower.includes('series') || nameLower.includes('série') || nameLower.includes('statstone')) {
        return 'eternos';
    }
    if (nameLower.includes('pass') || nameLower.includes('passe')) {
        return 'passes';
    }
    if (nameLower.includes('orb') || nameLower.includes('capsule') || nameLower.includes('orbe') || nameLower.includes('cápsula')) {
        return 'orbes';
    }
    if (nameLower.includes('chest') || nameLower.includes('key') || nameLower.includes('baú') || nameLower.includes('chave') || nameLower.includes('espolio') || nameLower.includes('espólio')) {
        return 'hextech';
    }
    if (nameLower.includes('emote')) {
        return 'emotes';
    }
    if (nameLower.includes('icon')) {
        return 'icones';
    }
    if (nameLower.includes('ward')) {
        return 'wards';
    }
    if (nameLower.includes('boost') || nameLower.includes('xp') || nameLower.includes('ip')) {
        return 'boosts';
    }
    if (nameLower.includes('little legend') || nameLower.includes('lenda lendária') || nameLower.includes('chibi')) {
        return 'little_legends';
    }
    if (nameLower.includes('arena') || nameLower.includes('board') || nameLower.includes('tabuleiro')) {
        return 'tft_arena';
    }

    return tipoFiltro || 'skins';
}

function obterDetalhesItem(nome, tipoFiltro, loja, precoPadrao, rawItem = null, lang = 'pt') {
    const emjRp = '💎';
    const emjDinheiro = '💶';

    let calcRp = getItemRpValue(nome, tipoFiltro, rawItem);

    const actualTipo = getActualItemType(nome, tipoFiltro, rawItem);
    const precoReal = getCatalogPrice(calcRp, loja, 'select', lang, actualTipo);

    const formatarStr = (prefixo, emoji) => {
        const isOff = (rawItem?.is_available === false) || (rawItem?.status === 'off');
        const statusBadge = isOff ? ' [🔴 Ausente]' : '';
        return { desc: `${prefixo}${statusBadge} | ${emjRp} ${calcRp} RP | ${emjDinheiro} ${precoReal}`, emoji };
    };

    if (tipoFiltro === 'skins') {
        if (rawItem && (rawItem.inventoryType === 'BUNDLES' || rawItem.inventoryType === 'BUNDLE') && nome.toLowerCase().includes('signature edition')) {
            let bundleIcon = (customEmojis?.skins?.transcendent || '🌟').trim();
            return formatarStr('Signature Edition', bundleIcon);
        }

        const nomeLower = nome.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
        let rarityCode = rawItem?.rarity || skinsRarityMap[nomeLower];
        if (!rarityCode) {
            if (calcRp === 3250) rarityCode = 'kUltimate';
            else if (calcRp === 1820) rarityCode = 'kLegendary';
            else if (calcRp <= 975) rarityCode = 'kRare';
            else rarityCode = 'kEpic';
        }
        if (nome.toLowerCase().includes('prestige')) rarityCode = 'kMythic';

        switch (rarityCode) {
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
    else if (tipoFiltro === 'passes' || tipoFiltro === 'orbes' || tipoFiltro === 'hextech') {
        let lootIcon = (customEmojis?.loot?.pass || '🎫').trim();
        let prefix = tipoFiltro === 'passes' ? 'Pass' : (tipoFiltro === 'hextech' ? 'Hextech' : 'Orb & Capsule');
        const nameLower = nome.toLowerCase();

        if (nameLower.includes('pass') || nameLower.includes('passe')) {
            prefix = 'Pass';
            lootIcon = (customEmojis?.loot?.pass || '🎫').trim();
        } else {
            prefix = tipoFiltro === 'hextech' ? 'Hextech' : 'Orb & Capsule';
            if (nameLower.includes('mega') && nameLower.includes('orb')) lootIcon = (customEmojis?.loot?.megaorb || '🔮').trim();
            else if (nameLower.includes('deluxe') && nameLower.includes('orb')) lootIcon = (customEmojis?.loot?.deluxe || '🔮').trim();
            else if (nameLower.includes('premium') && nameLower.includes('orb')) lootIcon = (customEmojis?.loot?.premium || '🔮').trim();
            else if (nameLower.includes('orb') || nameLower.includes('orbe')) lootIcon = (customEmojis?.loot?.orb || '🔮').trim();
            else if (nameLower.includes('capsule') || nameLower.includes('cápsula')) lootIcon = (customEmojis?.loot?.capsule || '💊').trim();
            else if (nameLower.includes('masterwork') && nameLower.includes('chest')) lootIcon = (customEmojis?.loot?.masterwork_chest || '🎁').trim();
            else if (nameLower.includes('chest') && nameLower.includes('key')) lootIcon = (customEmojis?.loot?.chestkey || '📦').trim();
            else if (nameLower.includes('chest') || nameLower.includes('baú')) lootIcon = (customEmojis?.loot?.chest || '🔑').trim();
            else if (nameLower.includes('key') || nameLower.includes('chave')) lootIcon = (customEmojis?.loot?.key || '🔑').trim();
            else if (nameLower.includes('pack') || nameLower.includes('pacote')) lootIcon = (customEmojis?.loot?.pack || '📦').trim();
            else lootIcon = (customEmojis?.loot?.orb || '🔮').trim();
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

            switch (rarityCode) {
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

        let bundleIcon = (customEmojis?.bundles?.bundle || customEmojis?.menu_principal?.highlights_bundles || '🌟').trim();
        let prefix = 'Highlight';
        if (nome.toLowerCase().includes('signature edition')) { prefix = 'Signature Edition'; bundleIcon = (customEmojis?.skins?.transcendent || '🌟').trim(); }
        else if (nome.toLowerCase().includes('chroma pack') || nome.toLowerCase().includes('chroma bundle')) { prefix = 'Chroma Bundle'; bundleIcon = (customEmojis?.bundles?.chroma || '🎨').trim(); }
        else if (nome.toLowerCase().includes('set')) { prefix = 'Set'; bundleIcon = (customEmojis?.bundles?.set || '✨').trim(); }
        return formatarStr(prefix, bundleIcon);
    }
    else if (tipoFiltro === 'sales') {
        const disc = rawItem?.discount_percent ? `-${rawItem.discount_percent}% OFF` : 'On Sale';
        return formatarStr(disc, '🏷️');
    }
    else if (tipoFiltro === 'most_popular') {
        return formatarStr('Most Popular', (customEmojis?.bundles?.most_popular || customEmojis?.bundles?.exclusive_pack || '<:lol_exclusive_pack:1544591088084590636>').trim());
    }
    else if (tipoFiltro === 'champions') {
        return formatarStr('Champion', (customEmojis?.skins?.champion || '⚔️').trim());
    }
    else if (tipoFiltro === 'emotes') {
        return formatarStr('Emote', (customEmojis?.acessorios?.emotes || customEmojis?.utilidades?.emotes || '😃').trim());
    }
    else if (tipoFiltro === 'icones') {
        return formatarStr('Icon', (customEmojis?.acessorios?.icones || customEmojis?.utilidades?.icones || '🖼️').trim());
    }
    else if (tipoFiltro === 'wards') {
        return formatarStr('Ward', (customEmojis?.acessorios?.wards || customEmojis?.utilidades?.wards || '👁️').trim());
    }
    else if (tipoFiltro === 'little_legends') {
        return formatarStr('Little Legend', (customEmojis?.acessorios?.lendas || customEmojis?.utilidades?.lendas || '🐥').trim());
    }
    else if (tipoFiltro === 'tft_arena') {
        return formatarStr('TFT Arena', (customEmojis?.acessorios?.arenas || customEmojis?.utilidades?.arenas || '<:lol_tft_arena:1544591074100645948>').trim());
    }
    else if (tipoFiltro === 'boosts') {
        return formatarStr('Boost', (customEmojis?.acessorios?.boosts || customEmojis?.utilidades?.boosts || '⚡').trim());
    }
    else if (tipoFiltro === 'misterio') {
        return formatarStr('Mystery Gift', (customEmojis?.skins?.mystery || customEmojis?.loot?.mystery || '🎁').trim());
    }


    return formatarStr('Item', '📦');
}

function isPrestigeOrMythic(item) {
    if (!item) return false;
    const name = (item.nome || item.name || '').toLowerCase();
    const raw = item.rawItem || item || {};
    const t = (raw.inventoryType || raw.inventory_type || item.tipo || '').toUpperCase();
    if (t === 'MYTHIC') return true;

    // Verificar se o item tem preço de RP válido e está ativo na Riot Store
    const priceRp = item.price_rp || raw.price_rp || 0;
    if (priceRp <= 0) return true; // Itens sem custo de RP são não-presenteáveis (ex: prestígio de ME)

    // Bloquear apenas skins genuinamente míticas, prestígio ou de gacha não-presenteáveis
    if (name.includes('prestige') || name.includes('prestígio') || name.includes('prestigio')) return true;
    if (name.includes('quantum') || name.includes('quântico') || name.includes('quântica')) return true;
    if (name.includes('erasure') || name.includes('erradicação')) return true;
    if (name.includes('breakout') || name.includes('destemido')) return true;
    if (name.includes('divine heavenscale') || name.includes('escamas celestiais divino')) return true;
    if (name.includes('peacemaker') || name.includes('pacificador')) return true;
    if (name.includes('admiral battle') || name.includes('almirante coelha')) return true;
    if (name.includes('immortalized') || name.includes('imortalizada')) return true;
    if (name.includes('risen legend') || name.includes('lenda ascendente')) return true;
    if (name.includes('transcendent') || name.includes('transcendente')) return true;
    if (name.includes('exalted') || name.includes('exaltado') || name.includes('exaltada')) return true;
    if (name.includes('sanctum') || name.includes('santuário')) return true;
    if (name.includes('mythic variant') || name.includes('variante mítica')) return true;
    if (name.includes('faker')) return true;
    if (name.includes('signature edition') || name.includes('edição de assinatura') || name.includes('edicao de assinatura')) return true;

    // Verificar se o item está inativo ou expirado na Riot
    if (raw.active === false || raw.is_available === false) return true;
    if (raw.inactiveDate && new Date(raw.inactiveDate) <= new Date()) return true;

    // Edições limitadas históricas impossíveis de comprar
    if (name.includes('pax ') || name.includes('neo pax') || name.includes('black alistar') || name.includes('silver kayle') || name.includes('young ryze') || name.includes('human ryze') || name.includes('ufo corki') || name.includes('king rammus') || name.includes('judgement kayle') || name.includes('urf the manatee') || name.includes('triumphant ryze') || name.includes('championship riven 2012') || name.includes('riot squad singed')) return true;
    return false;
}

async function enviarPaginaCatalogo(interaction, tipoFiltro, pagina = 0, isUpdate = false) {
    try {
        const cor = '#F43F5E';
        const ITEMS_PER_PAGE = 25;

        const session = userStoreSessions.get(interaction.user.id);
        const userRegiao = (session?.regiao || 'BR').toUpperCase();
        const lang = 'en'; // Catálogo do bot 100% em inglês
        const currentCatalog = loadFullRiotCatalog(lang);

        let results = [];
        let titulo = '';
        let customId = '';

        if (tipoFiltro === 'skins') {
            results = currentCatalog.filter(x => {
                const t = (x.tipo || '').toUpperCase();
                if (isPrestigeOrMythic(x)) return false; // NUNCA EXIBIR SKINS MÍTICAS / PRESTÍGIO NÃO-PRESENTEEÁVEIS
                return (t === 'CHAMPION_SKIN' || t === 'SKIN') && !isChroma(x) && x.rawItem?.active !== false;
            });
            titulo = lang === 'pt' ? `👕 ${results.length} Skins de Campeões` : `👕 ${results.length} Champion Skins`;
            customId = 'selecionar_skin_menu';
        } else if (tipoFiltro === 'cromas') {
            results = currentCatalog.filter(x => {
                const t = (x.tipo || '').toUpperCase();
                if (isPrestigeOrMythic(x)) return false;
                return (t === 'CHAMPION_SKIN' || t === 'SKIN' || t === 'CHROMA' || t === 'BUNDLES' || t === 'BUNDLE') && isChroma(x) && x.rawItem?.active !== false;
            });
            titulo = lang === 'pt' ? `🎨 ${results.length} Cromas` : `🎨 ${results.length} Chromas`;
            customId = 'selecionar_chroma_menu';
        } else if (tipoFiltro === 'highlights') {
            const featBundlesPath = path.join(__dirname, 'config', 'featured_bundles.json');
            let featList = [];
            try {
                featList = JSON.parse(fs.readFileSync(featBundlesPath, 'utf8'));
            } catch (e) {}

            if (featList.length > 0) {
                results = featList.map(b => {
                    const catItem = currentCatalog.find(c => String(c.id) === String(b.id) || (c.nome && c.nome.toLowerCase() === b.name.toLowerCase()));
                    return {
                        id: b.id,
                        nome: b.name,
                        tipo: 'BUNDLES',
                        iconUrl: b.iconUrl || catItem?.iconUrl || null,
                        price_rp: b.price_rp,
                        rawItem: {
                            ...(catItem?.rawItem || {}),
                            price_rp: b.price_rp,
                            inventoryType: 'BUNDLES'
                        }
                    };
                });
            } else {
                results = currentCatalog.filter(x => {
                    const n = (x.nome || x.name || '').toLowerCase();
                    const t = (x.tipo || x.inventoryType || '').toUpperCase();
                    if (x.rawItem?.active === false) return false;
                    if (isPrestigeOrMythic(x)) return false;
                    if (x.price_rp <= 0) return false;
                    return (t === 'BUNDLES' || t === 'BUNDLE');
                });
            }
            titulo = lang === 'pt' ? `🌟 ${results.length} Pacotes de Lançamento & Destaques` : `🌟 ${results.length} Featured & Launch Bundles`;
            customId = 'selecionar_highlight_menu';
        } else if (tipoFiltro === 'bundles') {
            results = currentCatalog.filter(x => {
                const n = (x.nome || x.name || '').toLowerCase();
                const t = (x.tipo || x.inventoryType || '').toUpperCase();
                if (x.rawItem?.active === false) return false;
                if (isPrestigeOrMythic(x)) return false;
                if (x.price_rp <= 0) return false;
                return (t === 'BUNDLES' || t === 'BUNDLE');
            });
            titulo = lang === 'pt' ? `📦 ${results.length} Pacotes de Skins & Cromas` : `📦 ${results.length} Skin & Chroma Bundles`;
            customId = 'selecionar_bundle_menu';
    } else if (tipoFiltro === 'sales') {
        const catalogSales = currentCatalog.filter(x => {
            const raw = x.rawItem || {};
            const t = (x.tipo || raw.inventoryType || '').toUpperCase();
            if (t !== 'CHAMPION_SKIN' && t !== 'SKIN') return false;
            return (raw.sale_rp > 0 && raw.regular_rp > raw.sale_rp) || (raw.sale && raw.sale.prices && raw.sale.prices.length > 0);
        });

        if (catalogSales.length > 0) {
            results = catalogSales.map(c => {
                const raw = c.rawItem || {};
                const regularRp = raw.regular_rp || c.price_rp;
                const saleRp = raw.sale_rp || (raw.sale?.prices?.find(p => p.currency === 'RP')?.cost) || c.price_rp;
                const discountPercent = raw.discount_percent || Math.round((1 - (saleRp / regularRp)) * 100);
                return {
                    id: c.id,
                    nome: c.nome,
                    tipo: 'CHAMPION_SKIN',
                    iconUrl: c.iconUrl,
                    price_rp: saleRp,
                    rawItem: {
                        ...raw,
                        regular_rp: regularRp,
                        sale_rp: saleRp,
                        discount_percent: discountPercent,
                        inventoryType: 'CHAMPION_SKIN'
                    }
                };
            });
        } else {
            const weeklySalesPath = path.join(__dirname, 'config', 'weekly_sales.json');
            let saleList = [];
            try {
                saleList = JSON.parse(fs.readFileSync(weeklySalesPath, 'utf8'));
            } catch (e) {}

            results = saleList.map(s => {
                const catItem = currentCatalog.find(c => String(c.id) === String(s.id) || (c.nome && c.nome.toLowerCase() === s.name.toLowerCase()));
                return {
                    id: s.id,
                    nome: s.name,
                    tipo: 'CHAMPION_SKIN',
                    iconUrl: s.iconUrl || catItem?.iconUrl || null,
                    price_rp: s.sale_rp,
                    rawItem: {
                        ...(catItem?.rawItem || {}),
                        regular_rp: s.regular_rp,
                        sale_rp: s.sale_rp,
                        discount_percent: s.discount_percent,
                        inventoryType: 'CHAMPION_SKIN'
                    }
                };
            });
        }
        titulo = lang === 'pt' ? `🏷️ ${results.length} Promoções da Semana (On Sale)` : `🏷️ ${results.length} Weekly Sales (On Sale)`;
        customId = 'selecionar_skin_menu';
    } else if (tipoFiltro === 'most_popular') {
        const popItems = [
            { name: '10 Hextech Chests & Keys + Bonus Set!', search: '10 Hextech Chests & Keys', defaultRp: 1950, tipo: 'HEXTECH' },
            { name: '5 Hextech Chests & Keys + Bonus Essence!', search: '5 Hextech Chests & Keys', defaultRp: 975, tipo: 'HEXTECH' },
            { name: '1 Hextech Chest and Key Bundle', search: '1 Hextech Chest and Key', defaultRp: 195, tipo: 'HEXTECH' },
            { name: 'Hextech Chest', search: 'Hextech Chest', defaultRp: 125, tipo: 'HEXTECH' },
            { name: 'Hextech Key', search: 'Hextech Key', defaultRp: 125, tipo: 'HEXTECH' },
            { name: 'Season 3: Act I Pass', search: 'Season 3: Act I Pass', defaultRp: 1650, tipo: 'EVENT_PASS' },
            { name: 'Season 3: Act I Pass Bundle', search: 'Season 3: Act I Pass Bundle', defaultRp: 2650, tipo: 'EVENT_PASS' },
            { name: 'Season 3: Act I Premium Pass Bundle', search: 'Season 3: Act I Premium Pass Bundle', defaultRp: 3650, tipo: 'EVENT_PASS' },
            { name: "Summoner's Mega Orb Bundle", search: "Summoner's Mega Orb Bundle", defaultRp: 12500, tipo: 'ORB' },
            { name: "Summoner's Premium Orb Bundle", search: "Summoner's Premium Orb Bundle", defaultRp: 6250, tipo: 'ORB' },
            { name: "Summoner's Deluxe Orb Bundle", search: "Summoner's Deluxe Orb Bundle", defaultRp: 2500, tipo: 'ORB' },
            { name: "Summoner's Orb", search: "Summoner's Orb", defaultRp: 250, tipo: 'ORB' },
            { name: 'Mystery Skin Gift', search: 'Mystery Skin', defaultRp: 490, tipo: 'MYSTERY' }
        ];

        results = popItems.map(p => {
            const catItem = currentCatalog.find(c => c.nome && c.nome.toLowerCase().includes(p.search.toLowerCase()));
            return {
                id: catItem ? catItem.id : p.name,
                nome: catItem ? catItem.nome : p.name,
                tipo: catItem ? catItem.tipo : p.tipo,
                iconUrl: catItem ? catItem.iconUrl : null,
                price_rp: catItem ? catItem.price_rp : p.defaultRp,
                rawItem: catItem ? catItem.rawItem : { inventoryType: p.tipo }
            };
        });
        const ePopTitle = (customEmojis?.bundles?.most_popular || customEmojis?.bundles?.exclusive_pack || '<:lol_exclusive_pack:1544591088084590636>').trim();
        titulo = lang === 'pt' ? `${ePopTitle} ${results.length} Itens Mais Populares` : `${ePopTitle} ${results.length} Most Popular Items`;
        customId = 'selecionar_popular_menu';
    } else if (tipoFiltro === 'passes') {
        results = currentCatalog.filter(x => {
            const n = x.nome.toLowerCase();
            const t = (x.tipo || '').toUpperCase();
            if (x.rawItem?.active === false) return false;
            if (x.price_rp <= 0) return false;
            if (isChroma(x) || t === 'CHROMA') return false;
            if (t === 'CHAMPION_SKIN' || t === 'SKIN') return false;
            if (t === 'CHAMPION' || t === 'CHAMPIONS') return false;
            if (t === 'EMOTE' || t === 'SUMMONER_ICON' || t === 'WARD_SKIN' || t === 'COMPANION') return false;
            if (n.includes('fan pass') || n.includes('token bank') || n.includes('level-up')) return false;

            return (
                t === 'EVENT_PASS' || 
                (t === 'BUNDLES' && (n.includes('pass') || n.includes('passe'))) ||
                (n.includes('pass') && (n.includes('act') || n.includes('season') || n.includes('event') || n.includes('passe')))
            );
        });
        titulo = lang === 'pt' ? `🎫 ${results.length} Passes de Temporada` : `🎫 ${results.length} Season Event Passes`;
        customId = 'selecionar_passe_menu';
    } else if (tipoFiltro === 'emotes') {
        results = currentCatalog.filter(x => (x.tipo || '').toUpperCase() === 'EMOTE');
        titulo = `😃 ${results.length} Emotes`;
        customId = 'selecionar_emote_menu';
    } else if (tipoFiltro === 'icones') {
        results = currentCatalog.filter(x => {
            const t = (x.tipo || '').toUpperCase();
            return (t === 'SUMMONER_ICON' || t === 'ICON') && x.nome && x.nome !== 'Null';
        });
        titulo = lang === 'pt' ? `🖼️ ${results.length} Ícones de Invocador` : `🖼️ ${results.length} Summoner Icons`;
        customId = 'selecionar_icone_menu';
    } else if (tipoFiltro === 'wards') {
        results = currentCatalog.filter(x => {
            const t = (x.tipo || '').toUpperCase();
            return t === 'WARD_SKIN' || t === 'WARD';
        });
        titulo = lang === 'pt' ? `👁️ ${results.length} Sentinelas` : `👁️ ${results.length} Ward Skins`;
        customId = 'selecionar_ward_menu';
    } else if (tipoFiltro === 'little_legends') {
        results = currentCatalog.filter(x => {
            const t = (x.tipo || '').toUpperCase();
            return t === 'COMPANION' || t === 'LITTLELEGENDS';
        });
        titulo = lang === 'pt' ? `🐥 ${results.length} Pequenas Lendas & Chibis` : `🐥 ${results.length} Little Legends & Chibis`;
        customId = 'selecionar_lenda_menu';
    } else if (tipoFiltro === 'tft_arena') {
        const tftArenasPath = path.join(__dirname, 'config', 'tft_arenas.json');
        let arenaList = [];
        try {
            arenaList = JSON.parse(fs.readFileSync(tftArenasPath, 'utf8'));
        } catch (e) {}

        if (arenaList.length > 0) {
            results = arenaList.map(a => ({
                id: a.id,
                nome: a.name,
                tipo: 'TFT_MAP_SKIN',
                iconUrl: a.iconUrl || null,
                price_rp: a.price_rp,
                rawItem: a
            }));
        } else {
            results = currentCatalog.filter(x => {
                const t = (x.tipo || '').toUpperCase();
                return t === 'TFT_MAP_SKIN' || t === 'TFTARENA' || t === 'TFT_DAMAGE_SKIN';
            });
        }
        const eArenaTitle = (customEmojis?.acessorios?.arenas || customEmojis?.utilidades?.arenas || '<:lol_tft_arena:1544591074100645948>').trim();
        titulo = lang === 'pt' ? `${eArenaTitle} ${results.length} Tabuleiros & Arenas TFT` : `${eArenaTitle} ${results.length} TFT Arenas`;
        customId = 'selecionar_arena_menu';
    } else if (tipoFiltro === 'boosts') {
        results = currentCatalog.filter(x => (x.tipo || '').toUpperCase() === 'BOOST');
        titulo = `⚡ ${results.length} Boosts`;
        customId = 'selecionar_boost_menu';
    } else if (tipoFiltro === 'misterio') {
        results = currentCatalog.filter(x => {
            if (x.rawItem?.active === false) return false;
            if (x.price_rp <= 0) return false;
            const n = x.nome.toLowerCase();
            const t = (x.tipo || '').toUpperCase();

            return (
                t === 'MYSTERY' || 
                (t === 'GIFT' && (n.includes('mystery') || n.includes('mistério'))) ||
                n.includes('mystery skin') || n.includes('mystery champion') || n.includes('mystery chest') ||
                n.includes('skin misteriosa') || n.includes('campeão misterioso')
            );
        });
        const nameMap = new Map();
        results.forEach(item => {
            const nameLower = item.nome.toLowerCase();
            if (!nameMap.has(nameLower)) {
                nameMap.set(nameLower, item);
            }
        });
        results = Array.from(nameMap.values());
        titulo = lang === 'pt' ? `🎁 ${results.length} Presentes Mistério` : `🎁 ${results.length} Mystery Gifts`;
        customId = 'selecionar_misterio_menu';
    } else if (tipoFiltro === 'hextech') {
        results = currentCatalog.filter(x => {
            if (x.rawItem?.active === false) return false;
            if (x.price_rp <= 0) return false;
            const n = x.nome.toLowerCase();
            const t = (x.tipo || '').toUpperCase();

            if (isChroma(x) || t === 'CHROMA') return false;
            if (t === 'CHAMPION_SKIN' || t === 'SKIN') return false;
            if (t === 'CHAMPION' || t === 'CHAMPIONS') return false;
            if (t === 'EMOTE' || t === 'SUMMONER_ICON' || t === 'WARD_SKIN' || t === 'COMPANION') return false;
            if (t === 'TFT_MAP_SKIN' || t === 'TFTARENA' || t === 'TFT_DAMAGE_SKIN') return false;
            if (n.includes('clash') || n.includes('cup') || n.includes('star') || n.includes('pass') || n.includes('orb')) return false;

            return (
                t === 'HEXTECH_CRAFTING' || 
                (t === 'BUNDLES' && (n.includes('chest') || n.includes('baú') || n.includes('key') || n.includes('chave'))) ||
                (n.includes('hextech') && (n.includes('chest') || n.includes('key') || n.includes('bundle')))
            );
        });
        titulo = lang === 'pt' ? `🔑 ${results.length} Baús Hextec & Chaves` : `🔑 ${results.length} Hextech Chests & Keys`;
        customId = 'selecionar_hextech_menu';
    } else if (tipoFiltro === 'orbes') {
        results = currentCatalog.filter(x => {
            if (x.rawItem?.active === false) return false;
            if (x.price_rp <= 0) return false;
            const n = x.nome.toLowerCase();
            const t = (x.tipo || '').toUpperCase();

            if (isChroma(x) || t === 'CHROMA') return false;
            if (t === 'CHAMPION_SKIN' || t === 'SKIN') return false;
            if (t === 'CHAMPION' || t === 'CHAMPIONS') return false;
            if (t === 'EMOTE' || t === 'SUMMONER_ICON' || t === 'WARD_SKIN' || t === 'COMPANION') return false;
            if (n.includes('orbeeanna') || n.includes('orianna') || n.includes('clash')) return false;

            return (
                (n.includes('orb') || n.includes('orbe') || n.includes('capsule') || n.includes('cápsula')) &&
                (t === 'CHEST' || t === 'BUNDLES' || t === 'LOOT')
            );
        });
        titulo = lang === 'pt' ? `🔮 ${results.length} Orbes & Cápsulas` : `🔮 ${results.length} Orbs & Capsules`;
        customId = 'selecionar_orbes_menu';
    }

    results = results.sort((a, b) => {
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
        let backCustomId = 'voltar_menu_modal';
        if (['skins', 'cromas', 'bundles'].includes(tipoFiltro)) backCustomId = 'voltar_cat_skins';
        else if (['orbes', 'passes', 'hextech', 'misterio'].includes(tipoFiltro)) backCustomId = 'voltar_cat_loot';
        else if (['champions', 'eternos'].includes(tipoFiltro)) backCustomId = 'voltar_cat_champions';
        else if (['emotes', 'wards', 'icones', 'boosts', 'little_legends', 'tft_arena'].includes(tipoFiltro)) backCustomId = 'voltar_cat_accessories';
        else if (['highlights', 'sales', 'most_popular'].includes(tipoFiltro)) backCustomId = 'voltar_cat_highlights';

        const btnRow = new ActionRowBuilder().addComponents(
            buildStoreBackButton(backCustomId, 'Back to Menu')
        );
        const embedEmpty = buildCustomEmbed('store_sales_center', interaction?.client, interaction);
        const msg = '❌ No items found in this category at this moment.';
        if (interaction.replied || interaction.deferred) {
            return await interaction.editReply({ content: msg, embeds: [embedEmpty], components: [btnRow] });
        } else if (isUpdate) {
            return await interaction.update({ content: msg, embeds: [embedEmpty], components: [btnRow] });
        }
        return await interaction.reply({ content: msg, embeds: [embedEmpty], components: [btnRow] });
    }

    // Mantém o embed principal fixo 'Catalog of Gifts' e troca apenas componentes
    let embed = buildCustomEmbed('store_sales_center', interaction?.client, interaction);

    const loja = obterDadosLoja();

    const opcoesMenu = [];
    for (const r of pageItems) {
        const info = obterDetalhesItem(r.nome, tipoFiltro, loja, '0.00', r.rawItem, lang);
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

    let backCustomId = 'voltar_menu_modal';
    if (['skins', 'cromas', 'bundles'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_skins';
    } else if (['orbes', 'passes', 'hextech', 'misterio'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_loot';
    } else if (['champions', 'eternos'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_champions';
    } else if (['emotes', 'wards', 'icones', 'boosts', 'little_legends', 'tft_arena'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_accessories';
    } else if (['highlights', 'sales', 'most_popular'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_highlights';
    }

    btnRow.addComponents(
        buildStoreBackButton(backCustomId, 'Back to Menu'),
        new ButtonBuilder()
            .setCustomId(`btn_search_cat_${tipoFiltro}`)
            .setLabel('Search')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔍')
    );

    if (totalPages > 1) {
        btnRow.addComponents(
            buildStorePrevButton(`pag_${tipoFiltro}_${pagina - 1}`, 'Previous', pagina === 0),
            buildStoreNextButton(`pag_${tipoFiltro}_${pagina + 1}`, 'Next', pagina === totalPages - 1)
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
    } catch (err) {
        console.error(`[enviarPaginaCatalogo Error - ${tipoFiltro}]`, err);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: `❌ Error loading ${tipoFiltro} catalog: ${err.message}`, embeds: [], components: [] });
            } else {
                await interaction.reply({ content: `❌ Error loading ${tipoFiltro} catalog: ${err.message}`, ephemeral: true });
            }
        } catch (e) {}
    }
}

function strike(text) {
    return text.split('').map(char => char + '\u0336').join('');
}

function obterDetalhesCarrinho(cart, loja, lang = 'pt') {
    let totalRP = 0;
    let itemSelecionadoLines = [];
    let valorRPLines = [];
    let valorDinheiroLines = [];
    
    let totalBasePrice = 0;
    let totalFinalPrice = 0;
    
    cart.items.forEach((item, index) => {
        totalRP += item.rp;
        itemSelecionadoLines.push(`${index + 1}. ${item.nome}`);
        valorRPLines.push(`${index + 1}. ${item.rp} RP`);
        
        // Calculate individual prices
        const dummyLoja = { ...loja, promocao_porcentagem: 0 };
        for (const k in dummyLoja) {
            if (k.startsWith('desconto_')) dummyLoja[k] = 0;
        }
        const actualType = getActualItemType(item.nome, item.tipo);
        const basePrice = parseFloat(getCatalogPrice(item.rp, dummyLoja, false, lang, actualType));
        const finalPrice = parseFloat(getCatalogPrice(item.rp, loja, false, lang, actualType));
        
        totalBasePrice += basePrice;
        totalFinalPrice += finalPrice;
        
        let itemPriceStr = '';
        if (basePrice > finalPrice) {
            const itemDiscount = Math.round((1 - (finalPrice / basePrice)) * 100);
            itemPriceStr = `${strike(`€${basePrice.toFixed(2)}`)} 🔥 €${finalPrice.toFixed(2)} (-${itemDiscount}%)`;
        } else {
            itemPriceStr = `€${finalPrice.toFixed(2)}`;
        }
        valorDinheiroLines.push(`${index + 1}. ${itemPriceStr}`);
    });
    
    if (cart.items.length > 1) {
        valorRPLines.push('---');
        valorRPLines.push(`Total: ${totalRP} RP`);
        
        valorDinheiroLines.push('---');
        valorDinheiroLines.push(`💵 Total: €${totalFinalPrice.toFixed(2)}`);
    }
    
    let finalValorDinheiro = '';
    if (cart.items.length > 1) {
        finalValorDinheiro = valorDinheiroLines.join('\n');
    } else {
        if (totalBasePrice > totalFinalPrice) {
            const averageDiscount = Math.round((1 - (totalFinalPrice / totalBasePrice)) * 100);
            finalValorDinheiro = `${strike(`€${totalBasePrice.toFixed(2)}`)} 🔥 €${totalFinalPrice.toFixed(2)} (-${averageDiscount}%)`;
        } else {
            finalValorDinheiro = `€${totalFinalPrice.toFixed(2)}`;
        }
    }
    
    const firstItemRarity = cart.items[0] ? cart.items[0].variacao : 'Unknown';
    
    return {
        itemSelecionado: itemSelecionadoLines.join('\n'),
        variacao: firstItemRarity,
        valorRP: valorRPLines.join('\n'),
        valorDinheiro: finalValorDinheiro
    };
}

async function atualizarEmbedTicket(channel, client) {
    if (!global.ticketCarts) global.ticketCarts = new Map();
    const cart = global.ticketCarts.get(channel.id);
    if (!cart) return;

    const loja = obterDadosLoja();
    const eProduto = (customEmojis?.ticket?.produto || '🛒').trim();
    const eRegiao = (customEmojis?.ticket?.regiao || '🌍').trim();
    const eRiotId = (customEmojis?.ticket?.riot_id || '🎮').trim();
    const eFechar = (customEmojis?.utilidades?.fechar || '🔒').trim();
    const eRP = (customEmojis?.loja_produtos?.moeda || '💎').trim();
    const eVariacao = cart.items[0] ? cart.items[0].eVariacao : (customEmojis?.ticket?.variacao || '🌟').trim();
    const eDinheiro = '<:dinheiro:1527368514057408713>';

    const userRegiao = (cart.regiao || 'BR').toUpperCase();
    const lang = 'en'; // Catálogo do bot 100% em inglês

    const details = obterDetalhesCarrinho(cart, loja, lang);

    const staffRolesArray = (process.env.STAFF_ROLE_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(id => id && channel.guild.roles.cache.has(id));
    const staffRoles = staffRolesArray.length > 0 ? staffRolesArray.map(id => `<@&${id}>`).join(' ') : '';

    const friendshipStatus = cart.friendshipStatus || '> ⏳ Clique em **⏱️ Checar Amizade & 24h** abaixo para verificar se o prazo de 24h já está ativo.';

    const embed = buildCustomEmbed('ticket_order_received', client, null, {
        staffRoles,
        itemSelecionado: details.itemSelecionado,
        variacao: details.variacao,
        valorRP: details.valorRP,
        valorDinheiro: details.valorDinheiro,
        regiao: cart.regiao,
        riotId: cart.riotId,
        friendshipStatus: friendshipStatus,
        eProduto,
        eVariacao,
        eRP,
        eDinheiro,
        eRegiao,
        eRiotId
    });

    const embedsArray = [embed];

    try {
        const champMap = require('./data/championMap.json');
        cart.items.forEach((item, index) => {
            let ddragonUrl = null;
            const catItemEncontrado = findCatalogItem(item.itemId, item.nome);
            
            const nomeLower = (item.nome || '').toLowerCase();
            
            // 1. Orbes Oficiais e Mega Orbe
            if (nomeLower.includes('mega orb') || nomeLower.includes('12500')) {
                ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901070.png';
            } else if (nomeLower.includes('premium orb') || nomeLower.includes('6250')) {
                ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901069.png';
            } else if (nomeLower.includes('deluxe orb') || nomeLower.includes('2500')) {
                ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901068.png';
            } else if (nomeLower.includes('summoner\'s orb') || (item.tipo === 'orbes' && nomeLower.includes('orb'))) {
                ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901067.png';
            }
            // 2. Passes de Temporada
            else if (nomeLower.includes('premium pass') || nomeLower.includes('3650')) {
                ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901073.png';
            } else if (nomeLower.includes('pass bundle') || nomeLower.includes('2650')) {
                ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901072.png';
            } else if (nomeLower.includes('pass') || nomeLower.includes('passe')) {
                ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901071.png';
            }
            // 3. Hextec, Baús e Chaves
            else if (nomeLower.includes('chest') || nomeLower.includes('baú') || nomeLower.includes('hextech') || nomeLower.includes('key') || nomeLower.includes('chave')) {
                if (nomeLower.includes('key') && !nomeLower.includes('chest') && !nomeLower.includes('baú')) {
                    ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/en/live-banners/2017-06-01_VSAssets/HextechKey_190x190%20%281%29.png';
                } else if (nomeLower.includes('bundle') || nomeLower.includes('set') || nomeLower.includes('conjunto') || nomeLower.includes('195') || nomeLower.includes('975') || nomeLower.includes('1950')) {
                    ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/en/live-banners/2017-06-01_VSAssets/HextechChestSet_190x190.png';
                } else {
                    ddragonUrl = 'https://d392eissrffsyf.cloudfront.net/en/live-banners/2017-06-01_VSAssets/HextechChest_190x190.png';
                }
            }
            // 4. Presentes Mistério
            else if (nomeLower.includes('mystery') || nomeLower.includes('mistério') || nomeLower.includes('misterio')) {
                if (nomeLower.includes('champion') || nomeLower.includes('campeão')) {
                    ddragonUrl = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/hextech-items/2.png';
                } else if (nomeLower.includes('chest') || nomeLower.includes('baú')) {
                    ddragonUrl = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/hextech-items/4.png';
                } else {
                    ddragonUrl = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/hextech-items/1.png';
                }
            }
            // 5. Skins & Cromas
            else if (item.tipo === 'skins' || item.tipo === 'cromas') {
                if (catItemEncontrado) {
                    let skinId = parseInt(catItemEncontrado.id, 10);
                    if (item.tipo === 'cromas' && catItemEncontrado.parent_id) {
                        skinId = parseInt(catItemEncontrado.parent_id, 10);
                    }
                    if (skinId && !isNaN(skinId)) {
                        const champId = Math.floor(skinId / 1000);
                        const champKey = champMap[champId];
                        if (champKey) {
                            const skinNum = skinId % 1000;
                            ddragonUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champKey}_${skinNum}.jpg`;
                        }
                    }
                }
                if (!ddragonUrl && catItemEncontrado && catItemEncontrado.iconUrl) {
                    ddragonUrl = catItemEncontrado.iconUrl.startsWith('//') ? 'https:' + catItemEncontrado.iconUrl : catItemEncontrado.iconUrl;
                }
            }
            // 6. Campeões
            else if (item.tipo === 'champions') {
                if (catItemEncontrado) {
                    const champKey = champMap[catItemEncontrado.id];
                    if (champKey) ddragonUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champKey}_0.jpg`;
                }
            }
            // 7. Pacotes e outros itens
            else {
                const itemIdNum = parseInt(item.itemId || catItemEncontrado?.id, 10);
                if (itemIdNum && !isNaN(itemIdNum) && itemIdNum >= 10000) {
                    ddragonUrl = `https://d392eissrffsyf.cloudfront.net/storeImages/bundles/${itemIdNum}.png`;
                }

                if (!ddragonUrl && catItemEncontrado && catItemEncontrado.iconUrl) {
                    ddragonUrl = catItemEncontrado.iconUrl.startsWith('//') ? 'https:' + catItemEncontrado.iconUrl : catItemEncontrado.iconUrl;
                } else if (!ddragonUrl) {
                    const lojaConfig = obterDadosLoja();
                    if (lojaConfig?.banners?.bundles) {
                        ddragonUrl = lojaConfig.banners.bundles;
                    }
                }
            }

            if (ddragonUrl) {
                if (index === 0) {
                    embed.setImage(ddragonUrl);
                    embed.setURL('https://discord.com');
                } else {
                    const extraEmbed = new EmbedBuilder().setURL('https://discord.com').setImage(ddragonUrl);
                    if (embed.data.color) extraEmbed.setColor(embed.data.color);
                    embedsArray.push(extraEmbed);
                }
            }
        });
    } catch (err) {
        console.error("Erro ao buscar imagem no update:", err);
    }

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji(eFechar),
        new ButtonBuilder().setCustomId('btn_payment_methods').setLabel('Payment Methods').setStyle(ButtonStyle.Success).setEmoji(eDinheiro),
        new ButtonBuilder().setCustomId('btn_check_friendship').setLabel('Checar Amizade & 24h').setStyle(ButtonStyle.Primary).setEmoji('⏱️')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('editar_pedido').setLabel('Edit Order').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('btn_add_item_ticket').setLabel('Add Items').setStyle(ButtonStyle.Secondary).setEmoji('➕')
    );

    const messages = await channel.messages.fetch({ limit: 100 });
    const botMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);
    if (botMsg) {
        await botMsg.edit({ embeds: embedsArray, components: [row1, row2] });
    } else {
        await channel.send({ embeds: embedsArray, components: [row1, row2] });
    }
}

async function responderResultadoChecagem(interaction, res, accountName, targetRiotId, region) {
    if (!res.success) {
        return interaction.editReply({ content: `❌ ${res.error}` });
    }

    const embed = new EmbedBuilder().setTimestamp();

    if (!res.found) {
        embed
            .setTitle('❌ Cliente Não Encontrado na Friendlist')
            .setColor('#EF4444')
            .setDescription([
                `O cliente **${targetRiotId}** **NÃO** foi encontrado na lista de amigos da conta **${accountName}**!`,
                '',
                '**Possíveis Motivos:**',
                '• O cliente ainda não enviou solicitação de amizade.',
                '• A solicitação de amizade foi enviada mas ainda está **Pendente** na conta.',
                '• O Riot ID digitado no pedido possui erro de digitação.',
                '',
                '> *Clique no botão verde abaixo para enviar um pedido de amizade pelo bot:*'
            ].join('\n'))
            .addFields(
                { name: '🤖 Conta Verificadora', value: `\`${accountName}\``, inline: true },
                { name: '🌍 Região', value: `\`${res.region || region || 'BR1'}\``, inline: true },
                { name: '👥 Total de Amigos', value: `\`${res.totalFriends} amigos\``, inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`btn_send_friend_req__${encodeURIComponent(accountName)}__${encodeURIComponent(targetRiotId)}`)
                .setLabel('➕ Enviar Pedido de Amizade')
                .setStyle(ButtonStyle.Success)
        );

        if (interaction.channel && global.ticketCarts?.has(interaction.channel.id)) {
            const cart = global.ticketCarts.get(interaction.channel.id);
            cart.friendshipStatus = `❌ Não encontrado na Friendlist de **${accountName}**`;
            await atualizarEmbedTicket(interaction.channel, interaction.client);
        }

        return interaction.editReply({ embeds: [embed], components: [row] });
    }

    // Amigo encontrado!
    const isEligible24h = res.eligible24h;
    const isEligible7d = res.eligible7d;

    const status24hText = isEligible24h
        ? '🟢 **Elegível (Mais de 24h de amizade - Liberado!)**'
        : `⏳ **Faltam ${res.remain24hFormatted}** (Libera em ${res.releaseDate24hFormatted})`;

    const status7dText = isEligible7d
        ? '🟢 **Elegível (Mais de 7 dias de amizade - Liberado!)**'
        : `⏱️ **Faltam ${res.remain7dFormatted}** (Libera em ${res.releaseDate7dFormatted})`;

    embed
        .setTitle(isEligible24h ? '🟢 Elegibilidade de Gifting Confirmada!' : '⏳ Amizade em Período de Cooldown')
        .setColor(isEligible24h ? '#10B981' : '#F59E0B')
        .setDescription([
            `O cliente **${res.friendName}** está adicionado como amigo na conta **${accountName}**!`,
            '',
            `📅 **Amigos desde:** \`${res.sinceDateFormatted || 'Desconhecido'}\``,
            `⏱️ **Tempo decorrido de amizade:** \`${res.timeElapsed}\``,
            ''
        ].join('\n'))
        .addFields(
            { name: '⏱️ Status de 24 Horas (LoL Padrão)', value: status24hText, inline: false },
            { name: '📅 Status de 7 Dias (Eventos Especiais)', value: status7dText, inline: false }
        );

    if (interaction.channel && global.ticketCarts?.has(interaction.channel.id)) {
        const cart = global.ticketCarts.get(interaction.channel.id);
        cart.friendshipStatus = isEligible24h
            ? `🟢 Elegível para presente (Amigos há ${res.timeElapsed} na conta ${accountName})`
            : `⏳ Aguardando prazo (Faltam ${res.remain24hFormatted} em ${accountName})`;

        await atualizarEmbedTicket(interaction.channel, interaction.client);
    }

    return interaction.editReply({ embeds: [embed], components: [] });
}

async function criarCanalTicket(interaction, itemSelecionado, tipoFiltro = 'skins') {
    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
    if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: `${loadEmj} ${getLoadStr('ticket')}`, ephemeral: true }).catch(() => {});
    } else {
        await interaction.editReply({ content: `${loadEmj} ${getLoadStr('ticket')}` }).catch(() => {});
    }

    try {
        const session = userStoreSessions.get(interaction.user.id) || { regiao: 'NA', riotId: 'Unknown' };
        const regiaoStr = (session.regiao || 'NA').toUpperCase();

        const { ChannelType, PermissionFlagsBits } = require('discord.js');
        const staffRolesArray = (process.env.STAFF_ROLE_IDS || '')
            .split(',')
            .map(r => r.trim())
            .filter(r => r && interaction.guild.roles.cache.has(r));

        let category = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toUpperCase() === `TICKETS - ${regiaoStr}`);

        if (!category) {
            try {
                const categoryOverwrites = [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
                ];
                for (const roleId of staffRolesArray) {
                    categoryOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
                }
                category = await interaction.guild.channels.create({
                    name: `TICKETS - ${regiaoStr}`,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: categoryOverwrites
                });
            } catch (catErr) {
                console.error('[Ticket Error] Não foi possível criar categoria, criando canal solto:', catErr.message);
                category = null;
            }
        }

        const ticketOverwrites = [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] }
        ];
        for (const roleId of staffRolesArray) {
            ticketOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        }

        const canalOptions = {
            name: `🎫-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
            topic: `Ticket-Owner: ${interaction.user.id}`,
            permissionOverwrites: ticketOverwrites
        };
        if (category) {
            canalOptions.parent = category.id;
        }

        const canal = await interaction.guild.channels.create(canalOptions);

        const staffRolesMention = staffRolesArray.map(id => `<@&${id}>`).join(' ');
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
        const catItemEncontrado = findCatalogItem(itemId, nomeReal);

        if (tipoFiltro === 'champions') {
            variacao = 'Champion';
            eVariacao = (customEmojis?.skins?.champion || '🌟').trim();
        } else {
            const raw = catItemEncontrado ? catItemEncontrado.rawItem : null;
            const lang = (regiaoStr === 'BR' || regiaoStr === 'BR1') ? 'pt' : 'en';
            const detalhes = obterDetalhesItem(nomeReal, tipoFiltro, loja, '0.00', raw, lang);
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
        const lang = (regiaoStr === 'BR' || regiaoStr === 'BR1') ? 'pt' : 'en';
        const actualTipo = getActualItemType(nomeReal, tipoFiltro, catItemEncontrado ? catItemEncontrado.rawItem : null);
        const precoRealStr = getCatalogPrice(calcRp, loja, 'embed', lang, actualTipo);
        const valorDinheiro = precoRealStr.includes('€') ? precoRealStr : `€${precoRealStr}`;

        const eProduto = (customEmojis?.ticket?.produto || '🛒').trim();
        const eRegiao = (customEmojis?.ticket?.regiao || '🌍').trim();
        const eRiotId = (customEmojis?.ticket?.riot_id || '🎮').trim();
        const eFechar = (customEmojis?.utilidades?.fechar || '🔒').trim();
        const eRP = (customEmojis?.loja_produtos?.moeda || '💎').trim();
        const eDinheiro = '<:dinheiro:1527368514057408713>';

        const embed = buildCustomEmbed('ticket_order_received', interaction.client, interaction, {
            staffRoles: staffRolesMention,
            itemSelecionado: nomeReal,
            variacao,
            valorRP,
            valorDinheiro,
            regiao: regiaoStr,
            riotId: session.riotId || 'Unknown',
            eProduto,
            eVariacao,
            eRP,
            eDinheiro,
            eRegiao,
            eRiotId
        });

        if (!global.ticketCarts) global.ticketCarts = new Map();
        global.ticketCarts.set(canal.id, {
            ownerId: interaction.user.id,
            regiao: regiaoStr,
            riotId: session.riotId || 'Unknown',
            items: [
                {
                    nome: nomeReal,
                    itemId: itemId,
                    rp: calcRp,
                    tipo: tipoFiltro,
                    variacao: variacao,
                    eVariacao: eVariacao
                }
            ]
        });

        const initialMention = staffRolesMention ? `${interaction.user} | ${staffRolesMention}` : `${interaction.user}`;
        await canal.send({ content: initialMention });
        await atualizarEmbedTicket(canal, interaction.client);

        await interaction.editReply({ content: `✅ Seu ticket foi criado com sucesso: ${canal}`, embeds: [], components: [] });
    } catch (err) {
        console.error('[Ticket Create Fatal Error]:', err);
        await interaction.editReply({ 
            content: `❌ **Não foi possível criar o canal do ticket.**\nVerifique se o bot possui permissão de **Gerenciar Canais (Manage Channels)** e **Ver Canais** neste servidor.\n\`Detalhes: ${err.message}\``, 
            embeds: [], 
            components: [] 
        }).catch(() => {});
    }
}

function buildStoreMainMenu(customEmojis) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('menu_vendas').setPlaceholder('Select a LoL Store Category').addOptions([
            {
                label: 'Skins & Chromas',
                description: 'Champion Skins & Chromas',
                value: 'cat_skins',
                emoji: (customEmojis?.menu_principal?.skins_chromas || customEmojis?.skins?.legendary || '<:legendary:1342089845559791650>').trim()
            },
            {
                label: 'Loot & Passes',
                description: 'Orbs, Event Passes, Hextech Chests & Mystery',
                value: 'cat_loot',
                emoji: (customEmojis?.menu_principal?.loot_passes || customEmojis?.loot?.orb || '<:orb:1528415461010575511>').trim()
            },
            {
                label: 'Champions & Eternals',
                description: 'All 173 Champions & Statstone Series',
                value: 'cat_champions',
                emoji: (customEmojis?.menu_principal?.champions_eternals || customEmojis?.skins?.champion || '<:mchamp:1342089827071561728>').trim()
            },
            {
                label: 'Accessories',
                description: 'Emotes, Wards, Summoner Icons, XP Boosts & Chibis',
                value: 'cat_accessories',
                emoji: (customEmojis?.menu_principal?.accessories || customEmojis?.acessorios?.menu || '👑').trim()
            },
            {
                label: 'Featured',
                description: 'Launch Bundles, Weekly Sales & Most Popular',
                value: 'cat_highlights',
                emoji: (customEmojis?.menu_principal?.featured || customEmojis?.menu_principal?.highlights_bundles || customEmojis?.bundles?.bundle || '<:lol_bundle_set:1544591078622236763>').trim()
            }
        ])
    );
}

function buildStoreBackButton(customId = 'voltar_menu_modal', defaultLabel = 'Back to Menu') {
    const cfg = customEmbeds?.['global_back_button'] || customEmbeds?.['store_back_button'] || {};
    let label = defaultLabel;
    if (cfg.buttonLabel && cfg.buttonLabel.trim()) {
        label = cfg.buttonLabel.trim();
    }
    const emojiStr = (cfg.buttonEmoji || customEmojis?.utilidades?.arrow_white_left || customEmojis?.utilidades?.left || '<a:l_arrow_white:1545877594170335304>').trim();

    let style = ButtonStyle.Secondary;
    if (cfg.buttonStyle) {
        const s = String(cfg.buttonStyle).toLowerCase().trim();
        if (['primary', 'blue', 'azul', '1'].includes(s)) style = ButtonStyle.Primary;
        else if (['danger', 'red', 'vermelho', '4'].includes(s)) style = ButtonStyle.Danger;
        else if (['success', 'green', 'verde', '3'].includes(s)) style = ButtonStyle.Success;
        else if (['secondary', 'gray', 'grey', 'cinza', '2'].includes(s)) style = ButtonStyle.Secondary;
    }

    const btn = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style);

    if (emojiStr) {
        try {
            btn.setEmoji(emojiStr);
        } catch (e) {
            console.warn('[buildStoreBackButton] Erro ao definir emoji:', emojiStr, e.message);
        }
    }

    return btn;
}

function buildStorePrevButton(customId = 'btn_prev', defaultLabel = 'Previous', disabled = false) {
    const cfg = customEmbeds?.['global_prev_button'] || {};
    const label = cfg.buttonLabel?.trim() || defaultLabel;
    const emojiStr = (cfg.buttonEmoji || customEmojis?.utilidades?.arrow_white_left || customEmojis?.utilidades?.left || '<a:l_arrow_white:1545877594170335304>').trim();

    let style = ButtonStyle.Primary;
    if (cfg.buttonStyle) {
        const s = String(cfg.buttonStyle).toLowerCase().trim();
        if (['secondary', 'gray', 'grey', 'cinza', '2'].includes(s)) style = ButtonStyle.Secondary;
        else if (['danger', 'red', 'vermelho', '4'].includes(s)) style = ButtonStyle.Danger;
        else if (['success', 'green', 'verde', '3'].includes(s)) style = ButtonStyle.Success;
        else if (['primary', 'blue', 'azul', '1'].includes(s)) style = ButtonStyle.Primary;
    }

    const btn = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style)
        .setDisabled(disabled);

    if (emojiStr) {
        try {
            btn.setEmoji(emojiStr);
        } catch (e) {
            console.warn('[buildStorePrevButton] Erro ao definir emoji:', emojiStr, e.message);
        }
    }

    return btn;
}

function buildStoreNextButton(customId = 'btn_next', defaultLabel = 'Next', disabled = false) {
    const cfg = customEmbeds?.['global_next_button'] || {};
    const label = cfg.buttonLabel?.trim() || defaultLabel;
    const emojiStr = (cfg.buttonEmoji || customEmojis?.utilidades?.arrow_white_right || customEmojis?.utilidades?.right || '<a:51047animatedarrowwhite:1545491753002475591>').trim();

    let style = ButtonStyle.Primary;
    if (cfg.buttonStyle) {
        const s = String(cfg.buttonStyle).toLowerCase().trim();
        if (['secondary', 'gray', 'grey', 'cinza', '2'].includes(s)) style = ButtonStyle.Secondary;
        else if (['danger', 'red', 'vermelho', '4'].includes(s)) style = ButtonStyle.Danger;
        else if (['success', 'green', 'verde', '3'].includes(s)) style = ButtonStyle.Success;
        else if (['primary', 'blue', 'azul', '1'].includes(s)) style = ButtonStyle.Primary;
    }

    const btn = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style)
        .setDisabled(disabled);

    if (emojiStr) {
        try {
            btn.setEmoji(emojiStr);
        } catch (e) {
            console.warn('[buildStoreNextButton] Erro ao definir emoji:', emojiStr, e.message);
        }
    }

    return btn;
}

function buildNavButtonsPreviewRow() {
    const backBtn = buildStoreBackButton('preview_back', 'Back to Menu').setDisabled(true);
    const prevBtn = buildStorePrevButton('preview_prev', 'Previous', true);
    const nextBtn = buildStoreNextButton('preview_next', 'Next', true);
    return new ActionRowBuilder().addComponents(backBtn, prevBtn, nextBtn);
}

async function exibirMenuCategoriaLoja(interaction, categoria) {
    const eMystery = (customEmojis?.skins?.mystery || customEmojis?.loot?.mystery || '<:lol_mystery_skin:1544591070204010598>').trim();
    const eEmotes = (customEmojis?.acessorios?.emotes || '<:lol_poro_emote:1544493296879935489>').trim();
    const eWards = (customEmojis?.acessorios?.wards || '<:lol_star_ward:1544493299270680717>').trim();
    const eIcones = (customEmojis?.acessorios?.icones || '<:22icone:1544482040206983241>').trim();
    const eBoosts = (customEmojis?.acessorios?.boosts || '<:16xp:1544482296541749302>').trim();
    const eLendas = (customEmojis?.acessorios?.lendas || '<:lol_chibi_vi:1544493291205173358>').trim();
    const eArenas = (customEmojis?.acessorios?.arenas || '<:lol_tft_arena:1544591074100645948>').trim();

    const btnRow = new ActionRowBuilder().addComponents(
        buildStoreBackButton('voltar_menu_modal')
    );

    // Mantém o embed principal fixo 'Catalog of Gifts' e troca apenas o Select Menu + botão de voltar
    const embed = buildCustomEmbed('store_sales_center', interaction.client, interaction);

    if (categoria === 'cat_skins') {
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('menu_vendas').setPlaceholder('Select a Skins option').addOptions([
                { label: 'Champion Skins', description: 'Browse all giftable champion skins', value: 'compra_skins', emoji: (customEmojis?.skins?.legendary || '👕').trim() },
                { label: 'Chromas', description: 'Browse all champion chromas (290 RP)', value: 'compra_chromas', emoji: (customEmojis?.skins?.croma || '🎨').trim() }
            ])
        );
        return await interaction.update({ content: '', embeds: [embed], components: [menu, btnRow] });
    }

    if (categoria === 'cat_loot') {
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('menu_vendas').setPlaceholder('Select a Loot option').addOptions([
                { label: 'Orbs & Capsules', description: "Summoner's Orb, Deluxe 10x, Premium 25x, Mega 50x", value: 'compra_orbes', emoji: (customEmojis?.loot?.orb || '🔮').trim() },
                { label: 'Season Event Passes', description: 'Season 3: Act I Pass (1650 RP), Bundle (2650 RP), Premium (3650 RP)', value: 'compra_passes', emoji: (customEmojis?.loot?.pass || '🎫').trim() },
                { label: 'Hextech Chests & Keys', description: 'Hextech Chest (125 RP), Keys, 1x, 5x & 10x Bundles', value: 'compra_hextech', emoji: (customEmojis?.loot?.chest || '🔑').trim() },
                { label: 'Mystery Gifts', description: 'Mystery Skin (490 RP), Mystery Champion & Mystery Chest', value: 'compra_misterio', emoji: eMystery }
            ])
        );
        return await interaction.update({ content: '', embeds: [embed], components: [menu, btnRow] });
    }

    if (categoria === 'cat_champions') {
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('menu_vendas').setPlaceholder('Select a Champions option').addOptions([
                { label: 'Champions', description: 'Search among all 173 League of Legends Champions', value: 'compra_champions', emoji: (customEmojis?.skins?.champion || '⚔️').trim() },
                { label: 'Eternals', description: 'Search Series I & II Statstones (600 RP)', value: 'compra_eternos', emoji: (customEmojis?.skins?.eternos || '🏆').trim() }
            ])
        );
        return await interaction.update({ content: '', embeds: [embed], components: [menu, btnRow] });
    }

    if (categoria === 'cat_accessories') {
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('menu_vendas').setPlaceholder('Select an Accessories option').addOptions([
                { label: 'Emotes', description: 'All LoL emotes (350 RP)', value: 'compra_emotes', emoji: eEmotes },
                { label: 'Ward Skins', description: 'Ward Skins (640 RP)', value: 'compra_wards', emoji: eWards },
                { label: 'Summoner Icons', description: 'Summoner icons (250 RP)', value: 'compra_icones', emoji: eIcones },
                { label: 'XP Boosts', description: 'Duration and Win XP Boosts', value: 'compra_boosts', emoji: eBoosts },
                { label: 'Little Legends & Chibis', description: 'TFT Chibis & Little Legends', value: 'compra_little_legends', emoji: eLendas },
                { label: 'TFT Arenas', description: 'Battlefield Map Skins & Arenas', value: 'compra_tft_arena', emoji: eArenas }
            ])
        );
        return await interaction.update({ content: '', embeds: [embed], components: [menu, btnRow] });
    }

    if (categoria === 'cat_highlights') {
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('menu_vendas').setPlaceholder('Select a Featured option').addOptions([
                { label: 'Featured & Launch Bundles', description: 'Browse launch sets, special bundles & signature packages', value: 'compra_highlights', emoji: (customEmojis?.bundles?.bundle || '<:lol_bundle_set:1544591078622236763>').trim() },
                { label: 'Weekly Sales (On Sale)', description: 'Weekly discounted skins with official Riot discounts (-27% to -60%)', value: 'compra_sales', emoji: '🏷️' },
                { label: 'Most Popular', description: 'Best-selling Hextech chests, event passes & summoner orbs', value: 'compra_most_popular', emoji: (customEmojis?.bundles?.most_popular || customEmojis?.bundles?.exclusive_pack || '<:lol_exclusive_pack:1544591088084590636>').trim() }
            ])
        );
        return await interaction.update({ content: '', embeds: [embed], components: [menu, btnRow] });
    }
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
                } catch (e) { /* ignore */ }
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
                } catch (e) {
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

            if (interaction.customId.startsWith('menu_check_friendship_acc__')) {
                const parts = interaction.customId.split('__');
                const channelId = parts[1];
                const targetRiotId = decodeURIComponent(parts[2] || '');
                const targetRegion = decodeURIComponent(parts[3] || 'BR1');
                const selectedAccount = interaction.values[0];

                await interaction.deferReply({ ephemeral: true });

                const { checkFriendshipEligibility } = require('./utils/friendshipChecker.js');
                const res = await checkFriendshipEligibility(selectedAccount, targetRiotId, targetRegion);

                return await responderResultadoChecagem(interaction, res, selectedAccount, targetRiotId, targetRegion);
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
                await interaction.showModal(modal).catch(() => { });
                return;
            }

            if (interaction.customId === 'menu_emojis_categorias') {
                const cat = interaction.values[0];
                const itens = customEmojis[cat];
                if (!itens) return interaction.reply({ content: '❌ Categoria de emojis não encontrada.', ephemeral: true });

                const opcoes = Object.keys(itens).slice(0, 25).map(k => {
                    const emj = (itens[k] || '').trim();
                    let emojiObj = '✏️';
                    const match = emj.match(/<a?:(\w+):(\d+)>/);
                    if (match) {
                        emojiObj = { name: match[1], id: match[2] };
                    } else if (emj) {
                        emojiObj = emj;
                    }
                    return {
                        label: `${k}`.substring(0, 25),
                        description: `Atual: ${emj}`.substring(0, 50),
                        value: `${cat}__${k}`,
                        ...(emojiObj ? { emoji: emojiObj } : {})
                    };
                });

                const previewList = Object.entries(itens).map(([k, v]) => `> \`${k}\`: ${v}`).join('\n');

                const embed = formatEmbed(new EmbedBuilder(), interaction.client)
                    .setTitle(`🦊 Kitsune | Editor de Emojis (${cat.toUpperCase()})`)
                    .setColor('#F43F5E')
                    .setDescription(
                        `Aqui estão os emojis atualmente cadastrados na categoria **${cat}**:\n\n` +
                        `${previewList}\n\n` +
                        `*Selecione abaixo o emoji que você deseja editar ou alterar:*`
                    );

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_emojis_items')
                        .setPlaceholder('Escolha um emoji para alterar...')
                        .addOptions(opcoes)
                );

                const btnVoltar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('voltar_menu_emojis_categorias')
                        .setLabel('Voltar para Categorias')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji((customEmojis?.utilidades?.arrow_white_left || customEmojis?.utilidades?.left || '<a:l_arrow_white:1545877594170335304>').trim())
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

                if (['cat_skins', 'cat_loot', 'cat_champions', 'cat_accessories', 'cat_highlights'].includes(opcao)) {
                    return await exibirMenuCategoriaLoja(interaction, opcao);
                }

                if (opcao === 'compra_highlights') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'highlights', 0, false);
                } else if (opcao === 'compra_sales') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'sales', 0, false);
                } else if (opcao === 'compra_most_popular') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'most_popular', 0, false);
                } else if (opcao === 'compra_skins') {
                    abrirModalBusca(interaction, 'buscar_campeao_modal', '👕 Search Skins', 'Enter the champion\'s name:');
                } else if (opcao === 'compra_chromas') {
                    abrirModalBusca(interaction, 'buscar_campeao_chromas_modal', '🎨 Search Chromas', 'Enter the champion\'s name:');
                } else if (opcao === 'compra_champions') {
                    abrirModalBusca(interaction, 'buscar_compra_campeao_modal', '⚔️ Purchase Champion', 'Enter the champion\'s name:');
                } else if (opcao === 'compra_passes') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'passes', 0, false);
                } else if (opcao === 'compra_bundles') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'bundles', 0, false);
                } else if (opcao === 'compra_eternos') {
                    abrirModalBusca(interaction, 'buscar_campeao_eternos_modal', '🏆 Search Eternals', 'Which champion\'s Eternals do you want to see?');
                } else if (opcao === 'compra_misterio') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'misterio', 0, false);
                } else if (opcao === 'compra_hextech') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'hextech', 0, false);
                } else if (opcao === 'compra_orbes') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'orbes', 0, false);
                } else if (opcao === 'compra_emotes') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'emotes', 0, false);
                } else if (opcao === 'compra_icones') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'icones', 0, false);
                } else if (opcao === 'compra_wards') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'wards', 0, false);
                } else if (opcao === 'compra_little_legends') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'little_legends', 0, false);
                } else if (opcao === 'compra_tft_arena') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'tft_arena', 0, false);
                } else if (opcao === 'compra_boosts') {
                    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                    await interaction.update({ content: `${loadEmj} ${getLoadStr('catalog')}`, embeds: [], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarPaginaCatalogo(interaction, 'boosts', 0, false);
                }
            }

            else if (['selecionar_skin_menu', 'selecionar_chroma_menu', 'selecionar_eterno_menu', 'selecionar_champion_menu', 'selecionar_passe_menu', 'selecionar_highlight_menu', 'selecionar_bundle_menu', 'selecionar_misterio_menu', 'selecionar_hextech_menu', 'selecionar_orbes_menu', 'selecionar_emote_menu', 'selecionar_icone_menu', 'selecionar_ward_menu', 'selecionar_lenda_menu', 'selecionar_arena_menu', 'selecionar_boost_menu', 'selecionar_popular_menu'].includes(interaction.customId)) {
                if (interaction.values[0] === 'nenhum') return interaction.reply({ content: 'Invalid option.', ephemeral: true });
                let tipo = 'skins';
                if (interaction.customId === 'selecionar_chroma_menu') tipo = 'cromas';
                else if (interaction.customId === 'selecionar_eterno_menu') tipo = 'eternos';
                else if (interaction.customId === 'selecionar_champion_menu') tipo = 'champions';
                else if (interaction.customId === 'selecionar_passe_menu') tipo = 'passes';
                else if (interaction.customId === 'selecionar_highlight_menu') tipo = 'highlights';
                else if (interaction.customId === 'selecionar_bundle_menu') tipo = 'bundles';
                else if (interaction.customId === 'selecionar_misterio_menu') tipo = 'misterio';
                else if (interaction.customId === 'selecionar_hextech_menu') tipo = 'hextech';
                else if (interaction.customId === 'selecionar_orbes_menu') tipo = 'orbes';
                else if (interaction.customId === 'selecionar_emote_menu') tipo = 'emotes';
                else if (interaction.customId === 'selecionar_icone_menu') tipo = 'icones';
                else if (interaction.customId === 'selecionar_ward_menu') tipo = 'wards';
                else if (interaction.customId === 'selecionar_lenda_menu') tipo = 'little_legends';
                else if (interaction.customId === 'selecionar_arena_menu') tipo = 'tft_arena';
                else if (interaction.customId === 'selecionar_boost_menu') tipo = 'boosts';
                else if (interaction.customId === 'selecionar_popular_menu') tipo = 'popular';

                let itemSelecionado = interaction.values[0];
                let nomeReal = itemSelecionado;
                let itemId = null;
                if (itemSelecionado.includes('||')) {
                    const p = itemSelecionado.split('||');
                    nomeReal = p[0];
                    itemId = parseInt(p[1], 10);
                }
                const catItemEncontrado = findCatalogItem(itemId, nomeReal);
                if (catItemEncontrado && (catItemEncontrado.rawItem?.is_available === false || catItemEncontrado.rawItem?.status === 'off')) {
                    return interaction.reply({
                        content: `❌ O item **${nomeReal}** está atualmente marcado como **Ausente / Fora da Loja** da Riot Games e não pode ser comprado no momento.`,
                        ephemeral: true
                    });
                }
                tipo = getActualItemType(nomeReal, tipo, catItemEncontrado ? catItemEncontrado.rawItem : null);

                const isInsideTicket = interaction.channel && interaction.channel.topic && interaction.channel.topic.includes('Ticket-Owner:');
                if (isInsideTicket) {
                    await interaction.update({ content: '✅ Item added to cart successfully!', embeds: [], components: [] }).catch(e => {});
                    
                    let variacao = 'Unknown';
                    let eVariacao = (customEmojis?.ticket?.variacao || '🌟').trim();
                    if (tipo === 'champions') {
                        variacao = 'Champion';
                        eVariacao = (customEmojis?.skins?.champion || '⚔️').trim();
                    } else {
                        const raw = catItemEncontrado ? catItemEncontrado.rawItem : null;
                        const userRegiao = interaction.channel.name.split('-')[1] || 'BR';
                        const lang = 'en'; // Catálogo do bot 100% em inglês
                        const details = obterDetalhesItem(nomeReal, tipo, obterDadosLoja(), '0.00', raw, lang);
                        const partes = details.desc.split('|');
                        variacao = partes[0].trim();
                        if (details.emoji) {
                            eVariacao = details.emoji;
                        }
                    }
                    
                    const calcRp = getItemRpValue(nomeReal, tipo, catItemEncontrado ? catItemEncontrado.rawItem : null);
                    
                    if (!global.ticketCarts) global.ticketCarts = new Map();
                    let cart = global.ticketCarts.get(interaction.channel.id);
                    if (!cart) {
                        let ownerId = interaction.channel.topic.split('Ticket-Owner: ')[1].trim();
                        const session = userStoreSessions.get(ownerId) || { regiao: 'BR', riotId: 'Unknown' };
                        cart = {
                            ownerId,
                            regiao: session.regiao.toUpperCase(),
                            riotId: session.riotId,
                            items: []
                        };
                        global.ticketCarts.set(interaction.channel.id, cart);
                    }
                    
                    cart.items.push({
                        nome: nomeReal,
                        itemId: itemId,
                        rp: calcRp,
                        tipo,
                        variacao,
                        eVariacao
                    });
                    
                    await atualizarEmbedTicket(interaction.channel, interaction.client);
                } else {
                    await criarCanalTicket(interaction, itemSelecionado, tipo);
                }
            }

            if (interaction.customId.startsWith('menu_embed_select')) {
                const embedId = interaction.values[0];

                if (embedId.startsWith('subgroup_')) {
                    const subgroupId = embedId.replace('subgroup_', '');
                    let subgroupTitle = 'Categorias & Catálogos';
                    let subgroupOptions = [];

                    if (subgroupId === 'skins') {
                        subgroupTitle = '🎨 Skins, Cromas & Pacotes';
                        subgroupOptions = [
                            { label: 'Menu da Categoria (Skins & Chromas)', description: 'Embed de apresentação com banner e descrição', value: 'category_skins', emoji: '🎨' },
                            { label: 'Catálogo de Skins', description: 'Página do catálogo com lista de skins de campeões', value: 'catalog_skins', emoji: '👕' },
                            { label: 'Catálogo de Cromas', description: 'Página do catálogo com lista de cromas', value: 'catalog_cromas', emoji: '🎨' },
                            { label: 'Catálogo de Bundles & Pacotes', description: 'Página de pacotes cosméticos e conjuntos', value: 'catalog_highlights', emoji: '📦' }
                        ];
                    } else if (subgroupId === 'loot') {
                        subgroupTitle = '🔮 Loot, Passes, Baús & Orbes';
                        subgroupOptions = [
                            { label: 'Menu da Categoria (Loot & Passes)', description: 'Embed de apresentação com banner e descrição', value: 'category_loot', emoji: '📦' },
                            { label: 'Catálogo de Orbes & Cápsulas', description: 'Página de orbes e cápsulas de espólio', value: 'catalog_orbes', emoji: '🔮' },
                            { label: 'Catálogo de Passes de Evento', description: 'Página de passes de temporada e evento', value: 'catalog_passes', emoji: '🎫' },
                            { label: 'Catálogo Hextech (Baús & Chaves)', description: 'Página de baús e chaves hextech', value: 'catalog_hextech', emoji: '🔑' },
                            { label: 'Catálogo de Presentes Mistério', description: 'Página de baús e skins misteriosas', value: 'catalog_misterio', emoji: '🎁' }
                        ];
                    } else if (subgroupId === 'champions') {
                        subgroupTitle = '⚔️ Campeões & Eternos';
                        subgroupOptions = [
                            { label: 'Menu da Categoria (Campeões & Eternos)', description: 'Embed de apresentação com banner e descrição', value: 'category_champions', emoji: '⚔️' },
                            { label: 'Catálogo de Campeões', description: 'Página do catálogo com todos os 173 campeões', value: 'catalog_champions', emoji: '🛡️' },
                            { label: 'Catálogo de Eternos', description: 'Página do catálogo de séries de estatísticas', value: 'catalog_eternos', emoji: '🏆' }
                        ];
                    } else if (subgroupId === 'accessories') {
                        subgroupTitle = '👑 Acessórios, Chibis & Arenas';
                        subgroupOptions = [
                            { label: 'Menu da Categoria (Acessórios)', description: 'Embed de apresentação com banner e descrição', value: 'category_accessories', emoji: '👑' },
                            { label: 'Catálogo de Emotes', description: 'Página de emotes do jogo', value: 'catalog_emotes', emoji: '😃' },
                            { label: 'Catálogo de Sentinelas (Wards)', description: 'Página de skins de sentinela/ward', value: 'catalog_wards', emoji: '👁️' },
                            { label: 'Catálogo de Ícones de Invocador', description: 'Página de ícones de perfil', value: 'catalog_icones', emoji: '🖼️' },
                            { label: 'Catálogo de Boosts de XP', description: 'Página de bônus de XP/IP', value: 'catalog_boosts', emoji: '⚡' },
                            { label: 'Catálogo de Little Legends & Chibis', description: 'Página de Pequenas Lendas e Chibis TFT', value: 'catalog_little_legends', emoji: (customEmojis?.acessorios?.lendas || '🐥').trim() },
                            { label: 'Catálogo de Arenas TFT', description: 'Página de mapas e arenas de batalha TFT', value: 'catalog_tft_arena', emoji: (customEmojis?.acessorios?.arenas || '<:lol_tft_arena:1544591074100645948>').trim() }
                        ];
                    } else if (subgroupId === 'highlights') {
                        subgroupTitle = '🌟 Featured & Ofertas Especiais';
                        subgroupOptions = [
                            { label: 'Menu da Categoria (Featured)', description: 'Embed de apresentação com banner e descrição', value: 'category_highlights', emoji: (customEmojis?.menu_principal?.featured || '<:lol_bundle_set:1544591078622236763>').trim() },
                            { label: 'Catálogo de Featured & Pacotes', description: 'Página de bundles e ofertas em destaque', value: 'catalog_highlights', emoji: (customEmojis?.bundles?.bundle || '📦').trim() },
                            { label: 'Catálogo de Promoções Semanais', description: 'Página de skins em promoção (On Sale)', value: 'catalog_sales', emoji: '🏷️' },
                            { label: 'Catálogo de Mais Populares', description: 'Página de baús, passes e orbes mais populares', value: 'catalog_most_popular', emoji: (customEmojis?.bundles?.most_popular || '<:lol_exclusive_pack:1544591088084590636>').trim() }
                        ];
                    }

                    const subEmbed = formatEmbed(new EmbedBuilder(), interaction.client)
                        .setTitle(`🦊 Kitsune | ${subgroupTitle}`)
                        .setColor('#F43F5E')
                        .setDescription(
                            `Aqui estão todos os templates de embeds configuráveis desta categoria:\n\n` +
                            `*Selecione no menu abaixo qual embed você deseja personalizar:*`
                        );

                    const subMenu = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('menu_embed_select_direct')
                            .setPlaceholder('Selecione uma embed para personalizar...')
                            .addOptions(subgroupOptions)
                    );

                    const btnBack = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('voltar_menu_embeds_inicio')
                            .setLabel('Voltar para Todos os Embeds')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji((customEmojis?.utilidades?.arrow_white_left || customEmojis?.utilidades?.left || '<a:l_arrow_white:1545877594170335304>').trim())
                    );

                    return await interaction.update({ embeds: [subEmbed], components: [subMenu, btnBack] });
                }

                const embed = formatEmbed(new EmbedBuilder(), interaction.client)
                    .setTitle(`🦊 Kitsune | Editor de Embeds`)
                    .setColor('#F43F5E')
                    .setDescription(
                        `Você está personalizando o template: **\`${embedId}\`**.\n\n` +
                        `*Abaixo você pode conferir a **Prévia em Tempo Real** deste embed e selecionar no menu o campo que deseja alterar:*`
                    );

                const isNavButton = ['global_back_button', 'store_back_button', 'global_prev_button', 'global_next_button'].includes(embedId);
                let opts = [];
                if (isNavButton) {
                    let defaultHint = 'Back to Menu';
                    if (embedId === 'global_prev_button') defaultHint = 'Previous';
                    else if (embedId === 'global_next_button') defaultHint = 'Next';

                    opts = [
                        { label: 'Rótulo do Botão (Button Label)', description: `Texto do botão (Ex: ${defaultHint}, Voltar...)`, value: `${embedId}__buttonLabel`, emoji: '🔘' },
                        { label: 'Emoji do Botão', description: 'Emoji do botão (Ex: <a:l_arrow_white:...>, ⬅️)', value: `${embedId}__buttonEmoji`, emoji: '😀' },
                        { label: 'Cor / Estilo do Botão', description: 'Secondary (Cinza), Primary (Azul), Danger (Vermelho), Success (Verde)', value: `${embedId}__buttonStyle`, emoji: '🎨' },
                        { label: 'Título', value: `${embedId}__title`, emoji: '📝' },
                        { label: 'Descrição', value: `${embedId}__description`, emoji: '📄' }
                    ];
                } else {
                    opts = [
                        { label: 'Título', value: `${embedId}__title`, emoji: '📝' },
                        { label: 'Descrição', value: `${embedId}__description`, emoji: '📄' },
                        { label: 'Cor (HEX)', value: `${embedId}__color`, emoji: '🎨' },
                        { label: 'Miniatura (Thumbnail URL)', value: `${embedId}__thumbnail`, emoji: '🖼️' },
                        { label: 'Banner (Image URL)', value: `${embedId}__image`, emoji: '🖼️' },
                        { label: 'Texto do Rodapé (Footer Text)', value: `${embedId}__footerText`, emoji: '📝' },
                        { label: 'Ícone do Rodapé (Footer Icon)', value: `${embedId}__footerIcon`, emoji: '🖼️' },
                        { label: 'Rótulo do Botão (Button Label)', value: `${embedId}__buttonLabel`, emoji: '🔘' },
                        { label: 'Emoji do Botão', value: `${embedId}__buttonEmoji`, emoji: '😀' },
                        { label: 'Cor do Botão (Red/Green/Blue/Gray)', value: `${embedId}__buttonStyle`, emoji: '🎨' },
                        { label: 'Sincronizar Imagem Dinâmica (true/false)', value: `${embedId}__syncImage`, emoji: '🔄' }
                    ];
                }

                const targetCfg = customEmbeds[embedId] || {};
                if (targetCfg.fields && Array.isArray(targetCfg.fields)) {
                    targetCfg.fields.forEach((f, idx) => {
                        opts.push({
                            label: `Campo ${idx + 1}: ${f.name}`.substring(0, 50),
                            value: `${embedId}__field_${idx}_name`,
                            emoji: '🏷️'
                        });
                    });
                }

                if (embedId.startsWith('tabela_')) {
                    opts.push({ label: 'Desconto Global (%)', description: 'Aplica desconto global na tabela', value: `${embedId}__globalDiscount`, emoji: '🎉' });
                }

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_embed_field')
                        .setPlaceholder('Selecione qual campo deseja alterar...')
                        .addOptions(opts.slice(0, 25))
                );

                const btnVoltar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('voltar_menu_embeds_inicio')
                        .setLabel('Voltar para Todos os Embeds')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji((customEmojis?.utilidades?.arrow_white_left || customEmojis?.utilidades?.left || '<a:l_arrow_white:1545877594170335304>').trim())
                );

                let previewEmbed = null;
                try {
                    previewEmbed = buildCustomEmbed(embedId, interaction.client, interaction, {
                        user: interaction.user.tag,
                        staffRoles: '@Staff',
                        itemSelecionado: 'Skin de Exemplo',
                        variacao: 'Épica',
                        valorRP: '1350 RP',
                        valorDinheiro: '€ 4.50',
                        regiao: 'BR',
                        riotId: 'Kitsune#BR1',
                        friendshipStatus: '🟢 Elegível para presente',
                        count: '15',
                        page: '1',
                        totalPages: '3',
                        roleName: 'Viajante',
                        inviter: interaction.user.tag,
                        totalInvites: '12',
                        regular: '10',
                        left: '1',
                        fake: '1',
                        code: 'discord.gg/kitsune',
                        recipient: 'Amigo#BR1',
                        product: 'Skin Lendária',
                        cost: '1820 RP',
                        account: 'KitsuneStore',
                        reason: 'Dados incorretos'
                    });
                } catch(e) {}

                const embedsToSend = [embed];
                if (previewEmbed) embedsToSend.push(previewEmbed);

                const componentsToSend = [menu];
                if (isNavButton) {
                    componentsToSend.push(buildNavButtonsPreviewRow());
                }
                componentsToSend.push(btnVoltar);

                await interaction.update({ embeds: embedsToSend, components: componentsToSend });
                return;
            }

            if (interaction.customId === 'menu_embed_field') {
                const [embedId, field] = interaction.values[0].split('__');

                let currentValue = '';
                if (field.startsWith('field_')) {
                    const parts = field.split('_');
                    const idx = parseInt(parts[1]);
                    currentValue = customEmbeds[embedId]?.fields?.[idx]?.name || '';
                } else {
                    currentValue = customEmbeds[embedId]?.[field] || '';
                }

                if (!currentValue) {
                    if (embedId.startsWith('catalog_') && field === 'description') {
                        currentValue = `Por favor, selecione o item no menu abaixo para prosseguir:\\n(Página {page} de {totalPages})`;
                    } else if (field === 'title') {
                        if (embedId === 'catalog_skins') currentValue = `✨ {campeao} Skins ({count})`;
                        else if (embedId === 'catalog_cromas') currentValue = `✨ {campeao} Cromas ({count})`;
                        else if (embedId === 'catalog_passes') currentValue = `🎫 Passes ({count} itens)`;
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

                let fieldLabel = `New ${field}:`.substring(0, 45);
                let fieldPlaceholder = '';
                if (field === 'buttonLabel') {
                    fieldLabel = 'Rótulo do Botão (Button Label):';
                    fieldPlaceholder = embedId === 'global_prev_button' ? 'Ex: Previous ou Anterior' : (embedId === 'global_next_button' ? 'Ex: Next ou Próxima' : 'Ex: Back to Menu ou Voltar');
                } else if (field === 'buttonEmoji') {
                    fieldLabel = 'Emoji do Botão:';
                    fieldPlaceholder = embedId === 'global_next_button' ? 'Ex: <a:51047animatedarrowwhite:1545491753002475591> ou ▶️' : 'Ex: <a:l_arrow_white:1545877594170335304> ou ⬅️';
                } else if (field === 'buttonStyle') {
                    fieldLabel = 'Cor / Estilo do Botão:';
                    fieldPlaceholder = 'Secondary (Cinza), Primary (Azul), Danger, Success';
                }

                const textInput = new TextInputBuilder()
                    .setCustomId('novo_valor')
                    .setLabel(fieldLabel)
                    .setStyle(style)
                    .setRequired(false)
                    .setValue(currentValue.substring(0, 4000));

                if (fieldPlaceholder) textInput.setPlaceholder(fieldPlaceholder);

                modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                await interaction.showModal(modal);
                return;
            }
        }
        else if (interaction.isButton()) {
            if (interaction.customId === 'btn_check_friendship') {
                const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
                const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
                const isStaff = isAdmin || staffRoles.some(rId => interaction.member.roles.cache.has(rId));

                if (!isStaff) {
                    return interaction.reply({
                        content: '🚫 Apenas a equipe da Loja/Staff pode verificar elegibilidade e friendlist de contas.',
                        ephemeral: true
                    });
                }

                // Recuperar Riot ID e Região do cliente no ticket
                let targetRiotId = null;
                let targetRegion = 'BR1';
                const cart = global.ticketCarts?.get(interaction.channel.id);
                if (cart && cart.riotId && cart.riotId !== 'Unknown') {
                    targetRiotId = cart.riotId;
                    if (cart.regiao) targetRegion = cart.regiao;
                } else if (interaction.message.embeds.length > 0) {
                    const fields = interaction.message.embeds[0].fields || [];
                    const rField = fields.find(f => f.name && (f.name.includes('Riot ID') || f.name.includes('Invocador')));
                    if (rField) targetRiotId = rField.value.replace(/[`*]/g, '').trim();
                    const regField = fields.find(f => f.name && (f.name.includes('Região') || f.name.includes('Region')));
                    if (regField) targetRegion = regField.value.replace(/[`*]/g, '').trim();
                }

                if (!targetRiotId) {
                    return interaction.reply({
                        content: '❌ Não foi possível detectar o Riot ID do cliente neste pedido. Use `/checar-amizade riot_id:Nome#TAG`.',
                        ephemeral: true
                    });
                }

                const { getSavedAccounts, checkFriendshipEligibility } = require('./utils/friendshipChecker.js');
                const accounts = getSavedAccounts();
                const accountKeys = Object.keys(accounts);

                if (accountKeys.length === 0) {
                    return interaction.reply({
                        content: '❌ Nenhuma conta Riot vinculada no bot! Use `/login` ou `/link` para cadastrar suas contas de envio.',
                        ephemeral: true
                    });
                }

                // Se houver apenas 1 conta cadastrada, verifica direto sem precisar perguntar
                if (accountKeys.length === 1) {
                    const singleAcc = accountKeys[0];
                    await interaction.deferReply({ ephemeral: true });

                    const res = await checkFriendshipEligibility(singleAcc, targetRiotId, targetRegion);
                    return await responderResultadoChecagem(interaction, res, singleAcc, targetRiotId, targetRegion);
                }

                // Múltiplas contas: exibir Select Menu para a staff escolher
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`menu_check_friendship_acc__${interaction.channel.id}__${encodeURIComponent(targetRiotId)}__${encodeURIComponent(targetRegion)}`)
                    .setPlaceholder('Selecione qual conta Riot (Alt) deseja usar...')
                    .addOptions(accountKeys.slice(0, 25).map(accName => {
                        const acc = accounts[accName] || {};
                        const statusDot = acc.expired ? '🔴' : '🟢';
                        const rp = typeof acc.rp === 'number' ? `${acc.rp.toLocaleString('pt-BR')} RP` : '';
                        return {
                            label: accName.substring(0, 100),
                            description: `Região: ${acc.region || 'BR1'} • ${rp || 'Conta Ativa'}`.substring(0, 100),
                            value: accName,
                            emoji: statusDot
                        };
                    }));

                return await interaction.reply({
                    content: `⏱️ **Checagem de Amizade & Gifting**\n👤 Cliente: **${targetRiotId}** (Região: \`${targetRegion}\`)\n\nSelecione abaixo qual das suas contas Riot você deseja conectar para consultar:`,
                    components: [new ActionRowBuilder().addComponents(selectMenu)],
                    ephemeral: true
                });
            }

            if (interaction.customId.startsWith('btn_send_friend_req__')) {
                const parts = interaction.customId.split('__');
                const accountName = decodeURIComponent(parts[1] || '');
                const targetRiotId = decodeURIComponent(parts[2] || '');

                await interaction.deferReply({ ephemeral: true });

                const accountsPath = path.join(__dirname, 'config', 'riot_accounts.json');
                let accounts = {};
                if (fs.existsSync(accountsPath)) {
                    try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch (e) {}
                }
                const acc = accounts[accountName];
                if (!acc || !acc.accessToken) {
                    return interaction.editReply({ content: `❌ Conta Riot "${accountName}" não encontrada ou sem token.` });
                }

                // Parse Nome#TAG
                let name = targetRiotId;
                let tag = acc.region || 'BR1';
                if (targetRiotId.includes('#')) {
                    const p = targetRiotId.split('#');
                    name = p[0].trim();
                    tag = p[1].trim();
                }

                // Reauth com SSID se disponível
                if (acc.ssid) {
                    try {
                        const { reauthWithSSID } = require('./utils/riotAuth.js');
                        const renewed = await reauthWithSSID(acc.ssid);
                        if (renewed?.accessToken) acc.accessToken = renewed.accessToken;
                    } catch(e) {}
                }

                const { RiotChatClient } = require('./utils/riotXmpp.js');
                const xmppClient = new RiotChatClient(acc.accessToken, acc.chatDom, acc.chatUri, acc.region);

                let connected = false;
                try {
                    connected = await xmppClient.connect();
                } catch (e) {}

                if (!connected) {
                    xmppClient.disconnect();
                    return interaction.editReply({ content: '❌ Falha ao conectar ao chat da Riot Games. Tente novamente em instantes.' });
                }

                try {
                    const resReq = await xmppClient.sendFriendRequest(name, tag);
                    xmppClient.disconnect();

                    if (resReq === 'User not found') {
                        return interaction.editReply({ content: `❌ O jogador **${name}#${tag}** não foi encontrado nos servidores da Riot.` });
                    }
                    if (resReq === "User's friend list is full") {
                        return interaction.editReply({ content: `⚠️ A lista de amigos da conta **${accountName}** está cheia (limite de 300 amigos atingido).` });
                    }

                    // Atualizar ticket informando que o pedido foi enviado
                    if (interaction.channel && global.ticketCarts?.has(interaction.channel.id)) {
                        const cart = global.ticketCarts.get(interaction.channel.id);
                        cart.friendshipStatus = `📩 Pedido de amizade enviado para **${name}#${tag}** via **${accountName}** (Aguardando cliente aceitar)`;
                        await atualizarEmbedTicket(interaction.channel, interaction.client);
                    }

                    return interaction.editReply({
                        content: `✅ **Pedido de amizade enviado com sucesso!**\n• Cliente: **${name}#${tag}**\n• Enviado a partir de: **${accountName}**\n• *Assim que o cliente aceitar no LoL, clique novamente em '⏱️ Checar Amizade & 24h' para verificar!*`
                    });
                } catch (err) {
                    xmppClient.disconnect();
                    return interaction.editReply({ content: `❌ Erro ao enviar pedido de amizade: ${err.message}` });
                }
            }

            if (interaction.customId.startsWith('btn_search_cat_')) {
                const cat = interaction.customId.replace('btn_search_cat_', '');
                return abrirModalBusca(interaction, `buscar_generico_modal_${cat}`, `🔍 Search in ${cat.toUpperCase()}`, 'Enter item name or champion:');
            }
            if (interaction.customId.startsWith('pag_')) {
                const parts = interaction.customId.split('_');
                const tipoFiltro = parts[1]; // 'bundles' or 'passes' or 'skins' or 'cromas' or 'eternos'
                const pageStr = parts[2];
                const champName = parts[3];
                if (!pageStr) return interaction.deferUpdate().catch(() => null);

                const page = parseInt(pageStr);

                if (champName) {
                    const cor = '#F43F5E';
                    const menuId = `selecionar_${tipoFiltro.slice(0, -1)}_menu`; // e.g. selecionar_skin_menu
                    return await buscarEExibirItens(champName.replace(/-/g, ' '), interaction, cor, menuId, tipoFiltro, page, true);
                }

                return await enviarPaginaCatalogo(interaction, tipoFiltro, page, true);
            }

            if (interaction.customId.startsWith('btn_confirmar_anuncio__')) {
                const jobId = interaction.customId.replace('btn_confirmar_anuncio__', '');
                const job = global.pendingBroadcasts?.get(jobId);
                if (!job) {
                    return interaction.reply({ content: '❌ Sessão de anúncio expirada ou já finalizada.', ephemeral: true });
                }

                await interaction.deferUpdate().catch(() => {});

                // Disparo assíncrono controlado com proteção Anti-Ban (rate limit e delays)
                (async () => {
                    const embedToSend = EmbedBuilder.from(job.embedData);
                    const rowComponents = [];
                    if (job.linkButtonData) {
                        rowComponents.push(new ActionRowBuilder().addComponents(ButtonBuilder.from(job.linkButtonData)));
                    }

                    if (job.destino === 'dm') {
                        // Coletar blacklist permanente + ad-hoc
                        const { getBlacklist } = require('./utils/broadcastBlacklist.js');
                        const blacklistSet = getBlacklist();

                        if (job.ignorarIds) {
                            job.ignorarIds.split(/[\s,]+/).forEach(id => {
                                const clean = id.trim().replace(/[^0-9]/g, '');
                                if (clean) blacklistSet.add(clean);
                            });
                        }

                        const staffRoleIds = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

                        // Coletar membros únicos dos servidores de destino (excluindo bots, blacklist e staff)
                        const uniqueMembers = new Map();
                        let totalBlacklistIgnorados = 0;

                        for (const gId of job.guildIds) {
                            const guild = interaction.client.guilds.cache.get(gId);
                            if (!guild) continue;
                            try {
                                const fetched = await guild.members.fetch();
                                fetched.forEach(m => {
                                    if (m.user.bot) return;
                                    if (blacklistSet.has(m.id)) {
                                        totalBlacklistIgnorados++;
                                        return;
                                    }
                                    if (job.ignorarStaff) {
                                        const isStaff = m.permissions.has(PermissionsBitField.Flags.Administrator) ||
                                            m.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                                            staffRoleIds.some(rId => m.roles.cache.has(rId));
                                        if (isStaff) {
                                            totalBlacklistIgnorados++;
                                            return;
                                        }
                                    }
                                    if (!uniqueMembers.has(m.id)) {
                                        uniqueMembers.set(m.id, m);
                                    }
                                });
                            } catch (e) {
                                guild.members.cache.forEach(m => {
                                    if (m.user.bot) return;
                                    if (blacklistSet.has(m.id)) {
                                        totalBlacklistIgnorados++;
                                        return;
                                    }
                                    if (job.ignorarStaff) {
                                        const isStaff = m.permissions.has(PermissionsBitField.Flags.Administrator) ||
                                            m.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                                            staffRoleIds.some(rId => m.roles.cache.has(rId));
                                        if (isStaff) {
                                            totalBlacklistIgnorados++;
                                            return;
                                        }
                                    }
                                    if (!uniqueMembers.has(m.id)) {
                                        uniqueMembers.set(m.id, m);
                                    }
                                });
                            }
                        }

                        const totalMembros = uniqueMembers.size;
                        let enviados = 0;
                        let bloqueados = 0;
                        let erros = 0;

                        await interaction.editReply({
                            content: `🚀 **Disparo iniciado para ${totalMembros} membros!** (🛡️ ${totalBlacklistIgnorados} ignorados por Blacklist/Staff)\n⏳ *Enviando com intervalo de segurança anti-ban de 3s por membro...*`,
                            components: []
                        }).catch(() => {});

                        let count = 0;
                        for (const member of uniqueMembers.values()) {
                            count++;
                            try {
                                await member.send({ embeds: [embedToSend], components: rowComponents });
                                enviados++;
                            } catch (err) {
                                if (err.code === 50007) {
                                    bloqueados++; // DM privada fechada pelo usuário
                                } else if (err.status === 429) {
                                    // Rate limit da API do Discord: aguardar tempo especificado
                                    const waitSec = Math.ceil((err.rawError?.retry_after || 5000) / 1000);
                                    console.warn(`[Broadcast RateLimit] 429 recebido. Pausando ${waitSec}s...`);
                                    await new Promise(r => setTimeout(r, waitSec * 1000));
                                    erros++;
                                } else {
                                    erros++;
                                }
                            }

                            // Intervalo seguro de 3 segundos
                            await new Promise(r => setTimeout(r, 3000));

                            // Atualizar status do progresso a cada 10 envios ou no final
                            if (count % 10 === 0 || count === totalMembros) {
                                const pct = Math.round((count / totalMembros) * 100);
                                await interaction.editReply({
                                    content: `📢 **Disparo em andamento:** ${count}/${totalMembros} (${pct}%)\n✅ **Enviados:** ${enviados} | 🔒 **DMs Fechadas (Pulados):** ${bloqueados} | 🛡️ **Blacklist/Staff:** ${totalBlacklistIgnorados} | ⚠️ **Erros:** ${erros}`,
                                    components: []
                                }).catch(() => {});
                            }
                        }

                        global.pendingBroadcasts.delete(jobId);
                        await interaction.editReply({
                            content: `🎉 **Disparo de anúncio finalizado com sucesso!**\n\n📊 **Relatório Oficial:**\n• **Total de Membros no Alcance:** ${totalMembros}\n• 🛡️ **Ignorados por Blacklist / Staff:** ${totalBlacklistIgnorados}\n• ✅ **Entregues na DM:** ${enviados}\n• 🔒 **DMs Fechadas (Ignorados com Segurança):** ${bloqueados}\n• ⚠️ **Outros Erros:** ${erros}`,
                            components: []
                        }).catch(() => {});

                    } else {
                        // Envio em canal de texto dos servidores
                        let canaisEnviados = 0;
                        for (const gId of job.guildIds) {
                            const guild = interaction.client.guilds.cache.get(gId);
                            if (!guild) continue;
                            const channel = guild.channels.cache.find(c => 
                                (c.name.includes('anuncio') || c.name.includes('announce') || c.name.includes('avisos') || c.name.includes('geral') || c.name.includes('chat')) && 
                                c.isTextBased() && 
                                c.permissionsFor(guild.members.me)?.has(PermissionsBitField.Flags.SendMessages)
                            );
                            if (channel) {
                                try {
                                    await channel.send({ content: '@everyone', embeds: [embedToSend], components: rowComponents });
                                    canaisEnviados++;
                                } catch (e) {}
                            }
                        }

                        global.pendingBroadcasts.delete(jobId);
                        await interaction.editReply({
                            content: `✅ **Anúncio publicado com sucesso em ${canaisEnviados} canal(is) de texto com menção @everyone!**`,
                            components: []
                        }).catch(() => {});
                    }
                })();

                return;
            }

            if (interaction.customId.startsWith('btn_cancelar_anuncio__')) {
                const jobId = interaction.customId.replace('btn_cancelar_anuncio__', '');
                global.pendingBroadcasts?.delete(jobId);
                return await interaction.update({ content: '❌ Disparo de anúncio cancelado pelo operador.', embeds: [], components: [] });
            }

            if (['btn_rp', 'btn_account', 'btn_friend', 'btn_back', 'btn_accept_all_friends'].includes(interaction.customId) || interaction.customId.startsWith('btn_friend_') || interaction.customId.startsWith('btn_accept_all_now_')) {
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
                        let balance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region);
                        if (balance && balance.error === 401) {
                            const { reauthWithSSID, loginWithRiotCredentials } = require('./utils/riotAuth.js');
                            let renewed = false;
                            if (acc.ssid) {
                                try {
                                    const refreshed = await reauthWithSSID(acc.ssid);
                                    if (refreshed && refreshed.accessToken) {
                                        acc.accessToken = refreshed.accessToken;
                                        if (refreshed.idToken) acc.idToken = refreshed.idToken;
                                        if (refreshed.entitlementsToken) acc.entitlementsToken = refreshed.entitlementsToken;
                                        acc.expired = false;
                                        renewed = true;
                                    }
                                } catch (e) { }
                            }
                            if (!renewed && acc.username && acc.password) {
                                try {
                                    const refreshed = await loginWithRiotCredentials(acc.username, acc.password);
                                    if (refreshed && refreshed.accessToken) {
                                        acc.accessToken = refreshed.accessToken;
                                        if (refreshed.idToken) acc.idToken = refreshed.idToken;
                                        if (refreshed.entitlementsToken) acc.entitlementsToken = refreshed.entitlementsToken;
                                        acc.expired = false;
                                        renewed = true;
                                    }
                                } catch (e) { }
                            }
                            if (renewed) {
                                balance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region);
                            } else {
                                acc.expired = true;
                            }
                        }

                        let rp = (balance && balance.rp !== undefined) ? balance.rp : (acc.rp || 0);
                        let be = (balance && balance.ip !== undefined) ? balance.ip : (acc.be || 0);

                        acc.rp = rp;
                        acc.be = be;
                        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));

                        const rpEmbed = buildCustomEmbed('dashboard_rp', interaction.client, interaction, {
                            accountName: accountName,
                            region: acc.region || 'BR1',
                            rp: rp.toLocaleString('en-US'),
                            be: be.toLocaleString('en-US')
                        });

                        await interaction.editReply({ embeds: [rpEmbed] }).catch(err => console.error('editReply error:', err));
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
                        } catch (e) { }

                        let expMs = null;
                        if (acc.accessToken) {
                            try {
                                const payload = JSON.parse(Buffer.from(acc.accessToken.split('.')[1], 'base64').toString('utf8'));
                                if (payload.exp) expMs = payload.exp * 1000;
                            } catch (e) { }
                        }
                        if (!expMs && acc.idToken) {
                            try {
                                const payload = JSON.parse(Buffer.from(acc.idToken.split('.')[1], 'base64').toString('utf8'));
                                if (payload.exp) expMs = payload.exp * 1000;
                            } catch (e) { }
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

                        // ── Buscar TODOS os amigos via XMPP roster (sem filtro de região) ──
                        const { RiotChatClient } = require('./utils/riotXmpp.js');
                        const { getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri } = require('./utils/riotAuth.js');

                        let friends = [];
                        let usedXmpp = false;

                        // Garantir tokens XMPP disponíveis
                        if (!acc.geopasToken || !acc.chatUri || !acc.chatDom) {
                            try {
                                acc.geopasToken = await getGeopasToken(acc.accessToken);
                                acc.affinity = decodeGeopasAffinity(acc.geopasToken);
                                acc.chatDom = getChatDom(acc.affinity);
                                acc.chatUri = getChatUri(acc.region || 'BR1', acc.affinity);
                                accounts[accountName] = acc;
                                fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
                            } catch (e) {
                                console.warn('[btn_friend] Aviso: não foi possível obter Geopas token:', e.message);
                            }
                        }

                        let storeFriendsMap = new Map();

                        // 1. Buscar da Store API para obter os timestamps de friendsSince
                        try {
                            const storeFriends = await getFriendList(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                            if (Array.isArray(storeFriends)) {
                                for (const sf of storeFriends) {
                                    const key = (sf.name || sf.nick || '').toLowerCase().trim();
                                    storeFriendsMap.set(key, sf);
                                    if (sf.puuid) storeFriendsMap.set(sf.puuid, sf);
                                }
                            }
                        } catch (e) {}

                        // 2. Buscar do XMPP Roster (todos os amigos de todas as regiões)
                        if (acc.chatUri && acc.chatDom && acc.geopasToken) {
                            const xmppClient = new RiotChatClient(acc.chatUri, acc.chatDom);
                            try {
                                const connected = await xmppClient.initializeChat(acc.accessToken, acc.geopasToken);
                                if (connected) {
                                    const roster = await xmppClient.getFriendList();
                                    const mutualFriends = (roster || []).filter(r => r.status === 'both' || !r.status);
                                    friends = mutualFriends.map(f => {
                                        const key = (f.name || '').toLowerCase().trim();
                                        const sf = storeFriendsMap.get(key) || (f.puuid ? storeFriendsMap.get(f.puuid) : null);
                                        return {
                                            name: f.name || sf?.name || 'Amigo',
                                            nick: f.name || sf?.nick || '',
                                            puuid: f.puuid,
                                            friendsSince: sf?.friendsSince || null
                                        };
                                    });
                                }
                            } catch (e) {
                                console.warn('[btn_friend] Aviso: falha no XMPP roster, usando dados da loja:', e.message);
                            } finally {
                                xmppClient.disconnect();
                            }
                        }

                        // 3. Fallback para Store API se XMPP estiver vazio
                        if (friends.length === 0 && storeFriendsMap.size > 0) {
                            const unique = Array.from(new Set(storeFriendsMap.values()));
                            friends = unique.map(f => ({
                                name: f.name || f.nick || 'Amigo',
                                nick: f.nick || '',
                                puuid: f.puuid,
                                friendsSince: f.friendsSince
                            }));
                        }

                        let friendText = 'Nenhum amigo encontrado.';
                        const totalFriends = friends.length;
                        const pageSize = 10;
                        const totalPages = Math.max(1, Math.ceil(totalFriends / pageSize));
                        if (page > totalPages) page = totalPages;
                        if (page < 1) page = 1;

                        if (friends.length > 0) {
                            const startIdx = (page - 1) * pageSize;
                            const pageFriends = friends.slice(startIdx, startIdx + pageSize);
                            friendText = pageFriends.map((f, i) => {
                                let timerStr = ' • 🌍 *Global*';
                                if (f.friendsSince) {
                                    try {
                                        const cleanDate = f.friendsSince.includes('T') ? f.friendsSince : f.friendsSince.replace(' ', 'T') + 'Z';
                                        const since = new Date(cleanDate);
                                        const diffMs = Date.now() - since.getTime();
                                        if (diffMs >= 24 * 3600 * 1000) {
                                            const totalSecs = Math.floor(diffMs / 1000);
                                            const days = Math.floor(totalSecs / 86400);
                                            const hours = Math.floor((totalSecs % 86400) / 3600);
                                            const timePart = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                                            timerStr = ` • ✅ *Elegível (${timePart})*`;
                                        } else {
                                            const remainMs = (24 * 3600 * 1000) - diffMs;
                                            const remainHours = Math.floor(remainMs / 3600000);
                                            const remainMins = Math.floor((remainMs % 3600000) / 60000);
                                            timerStr = ` • ⏱️ *Faltam ${remainHours}h ${remainMins}m*`;
                                        }
                                    } catch (e) {}
                                }
                                const globalNum = startIdx + i + 1;
                                return `**${globalNum}.** \`${f.name || f.nick || 'Amigo'}\`${timerStr}`;
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
                            new ButtonBuilder().setCustomId(`btn_friend_prev_${prevPage}`).setLabel('Anterior').setStyle(ButtonStyle.Secondary).setEmoji((customEmojis?.utilidades?.arrow_white_left || customEmojis?.utilidades?.left || '◀️').trim()).setDisabled(page <= 1),
                            new ButtonBuilder().setCustomId('btn_friend_indicator').setLabel(`Página ${page}/${totalPages} (${totalFriends} amigos)`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                            new ButtonBuilder().setCustomId(`btn_friend_next_${nextPage}`).setLabel('Próxima').setStyle(ButtonStyle.Secondary).setEmoji((customEmojis?.utilidades?.arrow_white_right || customEmojis?.utilidades?.right || '▶️').trim()).setDisabled(page >= totalPages),
                            new ButtonBuilder().setCustomId('btn_accept_all_friends').setLabel('Aceitar Pedidos').setStyle(ButtonStyle.Success).setEmoji('📥')
                        );

                        await interaction.editReply({ embeds: [friendEmbed], components: [row1, row2] }).catch(err => console.error('editReply error:', err));
                    }
                    else if (interaction.customId === 'btn_accept_all_friends' || interaction.customId.startsWith('btn_accept_all_now_')) {
                        const { RiotChatClient } = require('./utils/riotXmpp.js');
                        const { getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri, getFriendList } = require('./utils/riotAuth.js');

                        if (!acc.geopasToken) {
                            acc.geopasToken = await getGeopasToken(acc.accessToken);
                            acc.affinity = decodeGeopasAffinity(acc.geopasToken);
                            acc.chatDom = getChatDom(acc.affinity);
                            acc.chatUri = getChatUri(acc.region || 'BR1', acc.affinity);
                        }

                        if (!acc.chatUri || !acc.chatDom || !acc.geopasToken) {
                            return interaction.followUp({ content: '⚠️ Não foi possível conectar ao chat da Riot para aceitar pedidos no momento.', ephemeral: true });
                        }

                        const client = new RiotChatClient(acc.chatUri, acc.chatDom);
                        let ok = false;
                        try { ok = await client.initializeChat(acc.accessToken, acc.geopasToken); } catch (e) { }

                        if (!ok) {
                            client.disconnect();
                            return interaction.followUp({ content: '❌ Falha ao conectar ao chat da Riot.', ephemeral: true });
                        }

                        const roster = await client.getFriendList();
                        const pendingIn = roster ? roster.filter(r => r.status === 'pending_in') : [];

                        if (pendingIn.length === 0) {
                            client.disconnect();
                            return interaction.followUp({ content: '🟢 Nenhum pedido de amizade pendente para aceitar.', ephemeral: true });
                        }

                        let count = 0;
                        for (const req of pendingIn) {
                            if (req.puuid) {
                                try {
                                    await client.acceptFriendRequest(req.puuid);
                                    count++;
                                } catch (e) { }
                            }
                        }
                        client.disconnect();

                        try {
                            const freshFriends = await getFriendList(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                            if (freshFriends && freshFriends.length > 0) {
                                const { friendlistCacheMap } = require('./commands/loja/gift.js');
                                friendlistCacheMap.set(accountName, { timestamp: Date.now(), friends: freshFriends });
                            }
                        } catch (e) { }

                        await interaction.followUp({ content: `✅ **${count}** pedido(s) de amizade aceito(s) com sucesso na conta **${accountName}**!`, ephemeral: true });
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
                const payRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_notify_paid')
                        .setLabel('I Have Paid / Notificar Pagamento')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📩')
                );
                return await interaction.reply({ embeds: [embedPay], components: [payRow], ephemeral: true }).catch(() => { });
            }

            if (interaction.customId === 'btn_notify_paid') {
                await interaction.deferReply({ ephemeral: true });

                const staffRolesArray = (process.env.STAFF_ROLE_IDS || '')
                    .split(',')
                    .map(id => id.trim())
                    .filter(id => id && interaction.guild.roles.cache.has(id));
                const staffMention = staffRolesArray.length > 0 ? staffRolesArray.map(id => `<@&${id}>`).join(' ') : 'Staff';

                const notifyEmbed = new EmbedBuilder()
                    .setTitle('🔔 Payment Notification | Pagamento Informado')
                    .setColor('#10B981')
                    .setDescription(
                        `<a:whitearrow:1346152146814636032> The customer **${interaction.user}** has marked this order as **PAID**!\n\n` +
                        `> 📸 **Next Step:** Please upload the payment screenshot/receipt in this channel.\n` +
                        `> 🛡️ **Staff:** ${staffMention} has been alerted to verify and deliver your order.`
                    )
                    .setTimestamp();

                await interaction.channel.send({ content: `${interaction.user} | ${staffMention}`, embeds: [notifyEmbed] });
                return await interaction.editReply({ content: '✅ **Payment notified!** Please attach your payment screenshot in this channel.' });
            }

            if (['adicionar_saldo', 'meu_perfil', 'backup'].includes(interaction.customId)) {
                return interaction.reply({ content: '🛠️ **Em breve!** Este sistema está em desenvolvimento.', ephemeral: true }).catch(() => { });
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
                await new Promise(resolve => setTimeout(resolve, 1500));

                const embed = buildCustomEmbed('store_sales_center', interaction.client, interaction);
                const menu = buildStoreMainMenu(customEmojis);

                await interaction.editReply({ content: '', embeds: [embed], components: [menu] });
                return;
            }

            else if (interaction.customId === 'voltar_menu_modal') {
                const embed = buildCustomEmbed('store_sales_center', interaction.client, interaction);
                const menu = buildStoreMainMenu(customEmojis);

                await interaction.update({ content: '', embeds: [embed], components: [menu] });
                return;
            }
            else if (interaction.customId === 'voltar_cat_skins') {
                return await exibirMenuCategoriaLoja(interaction, 'cat_skins');
            }
            else if (interaction.customId === 'voltar_cat_loot') {
                return await exibirMenuCategoriaLoja(interaction, 'cat_loot');
            }
            else if (interaction.customId === 'voltar_cat_champions') {
                return await exibirMenuCategoriaLoja(interaction, 'cat_champions');
            }
            else if (interaction.customId === 'voltar_cat_accessories') {
                return await exibirMenuCategoriaLoja(interaction, 'cat_accessories');
            }
            else if (interaction.customId === 'voltar_cat_highlights') {
                return await exibirMenuCategoriaLoja(interaction, 'cat_highlights');
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
            else if (interaction.customId === 'btn_check_friendship') {
                await interaction.deferReply({ ephemeral: true });
                const cart = global.ticketCarts ? global.ticketCarts.get(interaction.channel.id) : null;
                if (!cart || !cart.riotId || cart.riotId === 'Unknown') {
                    return interaction.editReply({ content: '❌ Informações do pedido não encontradas neste ticket. Use **✏️ Edit Order** para definir o Riot ID.' });
                }

                const accountsPath = path.join(__dirname, 'config', 'riot_accounts.json');
                if (!fs.existsSync(accountsPath)) {
                    return interaction.editReply({ content: '❌ Nenhuma conta Riot vinculada no bot.' });
                }

                const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
                const regUpper = (cart.regiao || 'BR1').toUpperCase();

                // 1. Prioridade: Conta ativa da sessão do usuário que deu /login
                let bestAcc = null;
                const userSession = global.userStoreSessions ? global.userStoreSessions.get(interaction.user.id) : null;
                if (userSession && userSession.tokens && userSession.tokens.accessToken) {
                    bestAcc = userSession.tokens;
                }

                // 2. Fallback: Conta que corresponde à região do ticket ou qualquer conta válida salva
                if (!bestAcc) {
                    bestAcc = Object.values(accounts).find(a => !a.expired && (a.region || '').toUpperCase() === regUpper) ||
                              Object.values(accounts).find(a => !a.expired) ||
                              Object.values(accounts)[0];
                }

                if (!bestAcc || !bestAcc.accessToken) {
                    return interaction.editReply({ content: '❌ Nenhuma conta Riot com sessão ativa para verificar a amizade. Use `/login` para autenticar a conta da loja primeiro.' });
                }

                const { getFriendList } = require('./utils/riotAuth.js');
                let friends = await getFriendList(bestAcc.accessToken, bestAcc.entitlementsToken, bestAcc.region || regUpper).catch(() => []);

                const cleanStr = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const targetClean = cleanStr(cart.riotId);
                const targetBase = cleanStr(cart.riotId.split('#')[0]);

                let matchedFriend = (friends || []).find(f => {
                    if (!f) return false;
                    const fNameClean = cleanStr(f.name);
                    const fNickClean = cleanStr(f.nick);
                    const fGameClean = cleanStr(f.gameName);

                    return fNameClean === targetClean ||
                           fNickClean === targetClean ||
                           fGameClean === targetClean ||
                           fNameClean === targetBase ||
                           fNickClean === targetBase ||
                           fGameClean === targetBase ||
                           (targetClean.length > 2 && (fNameClean.includes(targetClean) || targetClean.includes(fNameClean)));
                });

                if (!matchedFriend) {
                    cart.friendshipStatus = '🔴 **Pendente:** O Riot ID ainda não é amigo da conta da loja.';
                    await atualizarEmbedTicket(interaction.channel, interaction.client);

                    const addRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`btn_send_friend_ticket`)
                            .setLabel(`Enviar Pedido de Amizade (${cart.riotId})`)
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('➕')
                    );

                    return interaction.editReply({
                        content: `⚠️ O Riot ID **${cart.riotId}** **NÃO** foi encontrado na lista de amigos da conta **${bestAcc.accountName || 'Riot Store'}** [${bestAcc.region || regUpper}].\n\nClique no botão abaixo para o bot enviar o pedido de amizade automaticamente agora mesmo!`,
                        components: [addRow]
                    });
                }

                let statusBadge = '';
                let replyMsg = '';

                if (matchedFriend.friendsSince) {
                    try {
                        const cleanDate = matchedFriend.friendsSince.includes('T') ? matchedFriend.friendsSince : matchedFriend.friendsSince.replace(' ', 'T') + 'Z';
                        const since = new Date(cleanDate);
                        const diffMs = Date.now() - since.getTime();
                        if (diffMs >= 24 * 3600 * 1000) {
                            const totalHours = Math.floor(diffMs / 3600000);
                            statusBadge = `🟢 **Elegível:** Amizade ativa há **${totalHours}h** (Presente pronto para envio!)`;
                            replyMsg = `✅ **Tudo pronto!** O cliente **${cart.riotId}** é amigo da conta da loja há mais de 24 horas (${totalHours}h). O presente já pode ser enviado pelo comando \`/gift\`!`;
                        } else {
                            const remainMs = (24 * 3600 * 1000) - diffMs;
                            const remainHours = Math.floor(remainMs / 3600000);
                            const remainMins = Math.floor((remainMs % 3600000) / 60000);
                            statusBadge = `🟡 **Aguardando 24h:** Faltam **${remainHours}h ${remainMins}m** para desbloquear o envio.`;
                            replyMsg = `⏱️ **Aguardando Cooldown:** O cliente **${cart.riotId}** foi adicionado recentemente. Faltam ainda **${remainHours}h ${remainMins}m** para liberar o envio de presentes pela Riot Games.`;
                        }
                    } catch (e) {
                        statusBadge = '🟢 **Amigo Confirmado:** Amizade ativa na conta.';
                        replyMsg = `✅ O cliente **${cart.riotId}** já está na lista de amigos da loja!`;
                    }
                } else {
                    statusBadge = '🟢 **Amigo Confirmado:** Amizade ativa na lista.';
                    replyMsg = `✅ O cliente **${cart.riotId}** já está na lista de amigos da conta da loja!`;
                }

                cart.friendshipStatus = statusBadge;
                await atualizarEmbedTicket(interaction.channel, interaction.client);

                return interaction.editReply({ content: replyMsg });
            }
            else if (interaction.customId === 'btn_send_friend_ticket') {
                await interaction.deferReply({ ephemeral: true });
                const cart = global.ticketCarts ? global.ticketCarts.get(interaction.channel.id) : null;
                if (!cart || !cart.riotId) {
                    return interaction.editReply({ content: '❌ Riot ID não encontrado.' });
                }

                const parts = cart.riotId.split('#');
                if (parts.length !== 2) {
                    return interaction.editReply({ content: '❌ Formato de Riot ID inválido. Use `Nome#TAG` (Ex: `Faker#KR1`).' });
                }

                const accountsPath = path.join(__dirname, 'config', 'riot_accounts.json');
                const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
                const regUpper = (cart.regiao || 'BR1').toUpperCase();

                // 1. Prioridade: Conta da sessão ativa do /login
                let bestAcc = null;
                const userSession = global.userStoreSessions ? global.userStoreSessions.get(interaction.user.id) : null;
                if (userSession && userSession.tokens && userSession.tokens.accessToken) {
                    bestAcc = userSession.tokens;
                }

                // 2. Fallback: Conta por região ou conta salva
                if (!bestAcc) {
                    bestAcc = Object.values(accounts).find(a => !a.expired && (a.region || '').toUpperCase() === regUpper) ||
                              Object.values(accounts).find(a => !a.expired) ||
                              Object.values(accounts)[0];
                }

                if (!bestAcc || !bestAcc.accessToken) {
                    return interaction.editReply({ content: '❌ Nenhuma conta Riot disponível para enviar pedido. Use `/login` primeiro.' });
                }

                const { RiotChatClient } = require('./utils/riotXmpp.js');
                const { getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri } = require('./utils/riotAuth.js');

                let geopasToken = bestAcc.geopasToken || await getGeopasToken(bestAcc.accessToken);
                let affinity = decodeGeopasAffinity(geopasToken);
                let chatDom = getChatDom(affinity);
                let chatUri = getChatUri(bestAcc.region || regUpper, affinity);

                const xmppClient = new RiotChatClient(chatUri, chatDom);
                const connected = await xmppClient.initializeChat(bestAcc.accessToken, geopasToken);
                if (!connected) {
                    return interaction.editReply({ content: '❌ Falha ao conectar ao chat da Riot para enviar pedido de amizade.' });
                }

                const result = await xmppClient.sendFriendRequest(parts[0], parts[1]);
                xmppClient.disconnect();

                if (result.success) {
                    cart.friendshipStatus = '🟡 **Pedido Enviado:** Aguardando o cliente aceitar no LoL.';
                    await atualizarEmbedTicket(interaction.channel, interaction.client);
                    return interaction.editReply({ content: `✅ **Pedido de amizade enviado com sucesso** para **${cart.riotId}** a partir da conta **${bestAcc.accountName || 'Riot'}**! Peça para o cliente aceitar no LoL.` });
                } else {
                    return interaction.editReply({ content: `❌ Falha ao enviar pedido para **${cart.riotId}**: ${result.error || 'Erro desconhecido'}` });
                }
            }
            else if (interaction.customId === 'btn_add_item_ticket') {
                const embed = buildCustomEmbed('store_sales_center', interaction.client, interaction);
                const menu = buildStoreMainMenu(customEmojis);
                await interaction.reply({ content: 'Select a category to add more items to your ticket:', embeds: [embed], components: [menu], ephemeral: true });
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
            else if (interaction.customId === 'btn_member_verify') {
                try {
                    const guild = interaction.guild;
                    const member = interaction.member;

                    if (!guild || !member) return;

                    let cargoNome = 'Viajante';
                    const dbPath = path.join(__dirname, 'database', 'database.json');
                    if (fs.existsSync(dbPath)) {
                        try {
                            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                            if (db?.config?.cargo_verif) cargoNome = db.config.cargo_verif;
                        } catch (e) {}
                    }

                    const role = guild.roles.cache.find(r => r.name.toLowerCase() === cargoNome.toLowerCase());
                    if (!role) {
                        return interaction.reply({
                            content: `⚠️ O cargo de verificação (**${cargoNome}**) não foi encontrado neste servidor. Um administrador deve criá-lo ou configurá-lo no \`/config\`.`,
                            ephemeral: true
                        });
                    }

                    if (member.roles.cache.has(role.id)) {
                        return interaction.reply({
                            content: `ℹ️ Você já está verificado com o cargo **${role.name}**!`,
                            ephemeral: true
                        });
                    }

                    await member.roles.add(role);

                    // Salvar no MongoDB Atlas
                    try {
                        const { recordMemberVerified } = require('./utils/mongoStorage.js');
                        await recordMemberVerified(guild.id, member.id);
                    } catch (e) {}

                    const successEmbed = buildCustomEmbed('verify_success', interaction.client, interaction, {
                        roleName: role.name
                    });

                    return interaction.reply({ embeds: [successEmbed], ephemeral: true });
                } catch (err) {
                    console.error('[Verify Error]', err.message);
                    return interaction.reply({
                        content: '❌ Ocorreu um erro ao tentar verificar sua conta. Peça ajuda a um staff.',
                        ephemeral: true
                    });
                }
            }
            else if (interaction.customId === 'voltar_menu_embeds_inicio') {
                const embed = buildCustomEmbed('embeds_panel', interaction.client, interaction);

                const menu1 = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_embed_select_1')
                        .setPlaceholder('🛒 Loja, Tickets, Pedidos & Pagamento...')
                        .addOptions([
                            { label: 'Painel Boas-Vindas da Loja (/ticket)', description: 'Mensagem inicial do painel fixo da loja no chat', value: 'ticket_welcome', emoji: '✉️' },
                            { label: 'Resumo do Pedido no Ticket', description: 'Embed do pedido gerado dentro do canal do ticket', value: 'ticket_order_received', emoji: '📋' },
                            { label: 'Formas de Pagamento (/ticket)', description: 'Embed com métodos de pagamento aceitos', value: 'ticket_payment_methods', emoji: '💶' },
                            { label: 'Autenticação de Região da Loja', description: 'Menu de escolha de região (BR, NA, EUW, etc.)', value: 'store_authentication', emoji: '🌍' },
                            { label: 'Central de Vendas (Categorias)', description: 'Menu de categorias (Skins, Loots, etc.)', value: 'store_sales_center', emoji: '🛒' },
                            { label: 'Botão Voltar Global (Back / Menu)', description: 'Editar texto, emoji e cor de todos os botões de voltar', value: 'global_back_button', emoji: '⬅️' },
                            { label: 'Botão Anterior Global (Previous)', description: 'Editar texto, emoji e cor de todos os botões Previous', value: 'global_prev_button', emoji: '◀️' },
                            { label: 'Botão Próximo Global (Next)', description: 'Editar texto, emoji e cor de todos os botões Next', value: 'global_next_button', emoji: '▶️' },
                            { label: 'Tabela de Preços de Skins', description: 'Embed da tabela visual de skins', value: 'tabela_skins', emoji: '📊' },
                            { label: 'Tabela de Preços de Loots', description: 'Embed da tabela visual de loots', value: 'tabela_loot', emoji: '📦' },
                            { label: 'Tabela de Preços de Acessórios', description: 'Embed da tabela de acessórios/cromas', value: 'tabela_acessorios', emoji: '👑' },
                            { label: 'Modelo de Anúncio Geral (/anuncio)', description: 'Embed padrão para comunicados e promoções', value: 'broadcast_announcement', emoji: '📢' },
                            { label: 'Painel de Suporte ao Cliente', description: 'Embed do painel de suporte', value: 'support_panel', emoji: '🎫' },
                            { label: 'Painel Administrativo', description: 'Embed do painel admin', value: 'admin_panel', emoji: '⚙️' },
                            { label: 'Painel Principal Emojis Manager', description: 'Embed do comando /emojis', value: 'emojis_panel', emoji: '✨' },
                            { label: 'Painel Principal Embeds Manager', description: 'Embed do comando /embeds', value: 'embeds_panel', emoji: '📝' }
                        ])
                );

                const menu2 = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_embed_select_2')
                        .setPlaceholder('📦 Categorias & Catálogos da Loja...')
                        .addOptions([
                            { label: 'Skins, Cromas & Pacotes', description: 'Menu da Categoria, Skins, Cromas e Bundles', value: 'subgroup_skins', emoji: '🎨' },
                            { label: 'Loot, Passes, Baús & Orbes', description: 'Menu da Categoria, Orbes, Passes, Hextech e Mistério', value: 'subgroup_loot', emoji: '🔮' },
                            { label: 'Campeões & Eternos', description: 'Menu da Categoria, Campeões e Eternos', value: 'subgroup_champions', emoji: '⚔️' },
                            { label: 'Acessórios & TFT', description: 'Menu da Categoria, Emotes, Wards, Ícones, Boosts, Chibis e Arenas', value: 'subgroup_accessories', emoji: '👑' },
                            { label: 'Destaques & Ofertas Especiais', description: 'Menu da Categoria e Catálogo de Destaques', value: 'subgroup_highlights', emoji: '🌟' },
                            { label: 'Botão Voltar Global (Back / Menu)', description: 'Editar texto, emoji e cor de todos os botões de voltar', value: 'global_back_button', emoji: '⬅️' },
                            { label: 'Botão Anterior Global (Previous)', description: 'Editar texto, emoji e cor de todos os botões Previous', value: 'global_prev_button', emoji: '◀️' },
                            { label: 'Botão Próximo Global (Next)', description: 'Editar texto, emoji e cor de todos os botões Next', value: 'global_next_button', emoji: '▶️' }
                        ])
                );

                const menu3 = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_embed_select_3')
                        .setPlaceholder('🛡️ Verificação, Convites & Comandos...')
                        .addOptions([
                            { label: 'Verificação - Painel (/verify-panel)', description: 'Embed do painel de verificação', value: 'verify_panel', emoji: '🛡️' },
                            { label: 'Verificação - Sucesso', description: 'Embed efêmera de verificado com sucesso', value: 'verify_success', emoji: '✅' },
                            { label: 'Boas-Vindas & Convites (Entrada)', description: 'Mensagem de boas-vindas com dados do convite', value: 'welcome_invite', emoji: '👋' },
                            { label: 'Convites - Perfil (/invites)', description: 'Embed do comando /invites', value: 'invites_profile', emoji: '👥' },
                            { label: 'Login - Seleção de Conta', description: 'Embed do menu de escolha de conta no /login', value: 'login_select', emoji: '🔐' },
                            { label: 'Login - Sucesso e Informações', description: 'Embed final de sucesso do /login', value: 'login_success', emoji: '🛡️' },
                            { label: 'Link - Sucesso (/link)', description: 'Embed de sucesso ao vincular conta no /link', value: 'link_success', emoji: '🔗' },
                            { label: 'AddFriend - Envio de Amizade', description: 'Embed enviada ao solicitar amizade no /addfriend', value: 'addfriend_sent', emoji: '➕' },
                            { label: 'Friendlist - Lista Principal', description: 'Embed exibida ao listar amigos no /friendlist', value: 'friendlist_main', emoji: '👥' },
                            { label: 'Friendlist - Pedidos Pendentes', description: 'Embed exibida ao listar pedidos recebidos', value: 'friendlist_requests', emoji: '📥' },
                            { label: 'Friendlist - Pedidos Aceitos', description: 'Embed exibida ao aceitar pedidos em lote', value: 'friendlist_accepted', emoji: '✅' },
                            { label: 'Gift - Envio de Presente', description: 'Embed exibida ao enviar um presente com sucesso', value: 'gift_sent', emoji: '🎁' },
                            { label: 'Gift - Falha no Envio', description: 'Embed exibida ao falhar no envio do presente', value: 'gift_failed', emoji: '❌' },
                            { label: 'Gift - Log de Auditoria (Staff)', description: 'Log de envio de presente enviado à staff', value: 'gift_staff_log', emoji: '📊' },
                            { label: 'Dashboard RP / BE', description: 'Embed de saldo RP/BE no painel', value: 'dashboard_rp', emoji: '🪙' },
                            { label: 'Dashboard Informações da Conta', description: 'Embed de detalhes da conta no painel', value: 'dashboard_account', emoji: 'ℹ️' },
                            { label: 'Dashboard Lista de Amigos', description: 'Embed de amigos no painel', value: 'dashboard_friends', emoji: '🫂' },
                            { label: 'Config - Sucesso (/config)', description: 'Embed de sucesso do comando /config', value: 'config_success', emoji: '⚙️' }
                        ])
                );

                await interaction.update({ embeds: [embed], components: [menu1, menu2, menu3] });
                return;
            }

            else if (interaction.customId === 'voltar_menu_emojis_categorias') {
                const embed = formatEmbed(new EmbedBuilder(), interaction.client)
                    .setTitle('🦊 Kitsune | Gerenciador de Emojis')
                    .setColor('#F43F5E')
                    .setDescription('Selecione uma categoria de emojis abaixo para começar a editar:');

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_emojis_categorias')
                        .setPlaceholder('Selecione uma categoria de emojis')
                        .addOptions([
                            { label: '🏪 Menu Principal da Loja', description: 'Emojis das 5 categorias principais da loja', value: 'menu_principal', emoji: '🏪' },
                            { label: '✨ Skins & Tiers', description: 'Emojis de Ultimate, Lendária, Épica, Cromas, etc.', value: 'skins', emoji: '✨' },
                            { label: '📦 Espólios & Loot', description: 'Emojis de Passes, Orbes, Baús, Chaves, Cápsulas', value: 'loot', emoji: '📦' },
                            { label: '👑 Acessórios & Itens', description: 'Emojis de Emotes, Wards, Ícones, Boosts, Lendas', value: 'acessorios', emoji: '👑' },
                            { label: '🌟 Destaques & Pacotes', description: 'Emojis de Pacotes, Assinaturas, Bundles, Sets', value: 'bundles', emoji: '🌟' },
                            { label: '🛠️ Utilidades Gerais', description: 'Setas, Sucesso, Erro, Fogo, Carregamento, etc.', value: 'utilidades', emoji: '🛠️' },
                            { label: '🛒 Loja & Moedas', description: 'Emojis de RP, Dinheiro, Essências, Carrinho', value: 'loja_produtos', emoji: '🛒' },
                            { label: '📊 Status da Loja', description: 'Estoque, Promoção, Novidade, Entrega Rápida', value: 'loja_status', emoji: '📊' },
                            { label: '🛡️ Staff & Suporte', description: 'Emojis de Dono, Moderador, Ajuda, Suporte', value: 'staff_e_suporte', emoji: '🛡️' },
                            { label: '⚔️ Roles do LoL', description: 'Assassino, Mago, Atirador, Suporte, Tank, Lutador', value: 'lol_roles', emoji: '⚔️' },
                            { label: '🌍 Regiões do LoL', description: 'Bandeiras e ícones de BR, NA, EUW, EUNE, KR, etc.', value: 'lol_regions', emoji: '🌍' },
                            { label: '🎫 Sistema de Tickets', description: 'Emojis exibidos dentro do embed dos tickets', value: 'ticket', emoji: '🎫' }
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

                    if (field === 'buttonStyle') {
                        const s = finalValue.toLowerCase().trim();
                        if (['primary', 'blue', 'azul', '1'].includes(s)) finalValue = 'Primary';
                        else if (['danger', 'red', 'vermelho', '4'].includes(s)) finalValue = 'Danger';
                        else if (['success', 'green', 'verde', '3'].includes(s)) finalValue = 'Success';
                        else if (['secondary', 'gray', 'grey', 'cinza', '2'].includes(s)) finalValue = 'Secondary';
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
                        try {
                            const { saveBotConfigToMongo } = require('./utils/mongoStorage.js');
                            saveBotConfigToMongo('loja', lojaFile);
                        } catch (e) {}
                        const discReply = `✅ Desconto de **${pct}%** aplicado com sucesso a **${targetCategories.join(', ')}**!`;
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp({ content: discReply, ephemeral: true }).catch(() => {});
                        } else {
                            await interaction.reply({ content: discReply, ephemeral: true }).catch(() => {});
                        }
                        return;
                    }

                    const embedsPath = path.join(__dirname, 'config', 'embeds.json');
                    let fileData = {};
                    try {
                        fileData = JSON.parse(fs.readFileSync(embedsPath, 'utf8'));
                    } catch (e) {}

                    if (!fileData[embedId]) fileData[embedId] = {};

                    if (field.startsWith('field_')) {
                        const parts = field.split('_');
                        const idx = parseInt(parts[1]);
                        if (!fileData[embedId].fields) fileData[embedId].fields = [];
                        if (fileData[embedId].fields[idx]) {
                            fileData[embedId].fields[idx].name = finalValue;
                        }
                    } else {
                        fileData[embedId][field] = finalValue;
                    }

                    if (embedId === 'global_back_button' || embedId === 'store_back_button') {
                        if (!fileData['global_back_button']) fileData['global_back_button'] = {};
                        if (!fileData['store_back_button']) fileData['store_back_button'] = {};
                        fileData['global_back_button'][field] = finalValue;
                        fileData['store_back_button'][field] = finalValue;
                    }

                    fs.writeFileSync(embedsPath, JSON.stringify(fileData, null, 2), 'utf8');
                    try {
                        const { saveBotConfigToMongo } = require('./utils/mongoStorage.js');
                        saveBotConfigToMongo('embeds', fileData);
                    } catch (e) {}
                    try { client.emit('reloadEmbeds'); } catch(e) {}

                    let previewEmbed = null;
                    try {
                        previewEmbed = buildCustomEmbed(embedId, interaction.client, interaction, {
                            user: interaction.user.tag,
                            staffRoles: '@Staff',
                            itemSelecionado: 'Skin de Exemplo',
                            variacao: 'Épica',
                            valorRP: '1350 RP',
                            valorDinheiro: '€ 4.50',
                            regiao: 'BR',
                            riotId: 'Kitsune#BR1',
                            friendshipStatus: '🟢 Elegível para presente',
                            count: '15',
                            page: '1',
                            totalPages: '3',
                            roleName: 'Viajante',
                            inviter: interaction.user.tag,
                            totalInvites: '12',
                            regular: '10',
                            left: '1',
                            fake: '1',
                            code: 'discord.gg/kitsune',
                            recipient: 'Amigo#BR1',
                            product: 'Skin Lendária',
                            cost: '1820 RP',
                            account: 'KitsuneStore',
                            reason: 'Dados incorretos'
                        });
                    } catch(e) {}

                    const successMsg = `✅ Template **${embedId}** atualizado com sucesso no campo **${field}**!\n*Veja a nova prévia abaixo:*`;
                    const respData = { content: successMsg, ephemeral: true };
                    if (previewEmbed) respData.embeds = [previewEmbed];

                    if (['global_back_button', 'store_back_button', 'global_prev_button', 'global_next_button'].includes(embedId)) {
                        respData.components = [buildNavButtonsPreviewRow()];
                    }

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(respData).catch(() => {});
                    } else {
                        await interaction.reply(respData).catch(() => {});
                    }
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
                    try {
                        const { saveBotConfigToMongo } = require('./utils/mongoStorage.js');
                        saveBotConfigToMongo('emojis', fileData);
                    } catch (e) {}
                    client.emit('reloadEmojis');

                    await interaction.reply({ content: `✅ Emoji for **${cat} -> ${key}** successfully updated to: ${novoEmoji}`, ephemeral: true });
                } catch (e) {
                    console.error(e);
                    await interaction.reply({ content: `❌ Internal error while updating emojis.json.`, ephemeral: true });
                }
                return;
            }

            if (interaction.customId.startsWith('modal_anuncio__')) {
                const sessionKey = interaction.customId.replace('modal_anuncio__', '');
                const sessionOpts = global[sessionKey] || { destino: 'dm', alcance: 'local', ignorarStaff: true, ignorarIds: '' };
                try { delete global[sessionKey]; } catch(e) {}

                const destino = sessionOpts.destino || 'dm';
                const alcance = sessionOpts.alcance || 'local';
                const ignorarStaff = sessionOpts.ignorarStaff !== false;
                const ignorarIds = sessionOpts.ignorarIds || '';

                const titulo = interaction.fields.getTextInputValue('anuncio_titulo');
                const desc = interaction.fields.getTextInputValue('anuncio_desc');
                const banner = (interaction.fields.getTextInputValue('anuncio_banner') || '').trim();
                const botaoRaw = (interaction.fields.getTextInputValue('anuncio_botao') || '').trim();
                const corInput = (interaction.fields.getTextInputValue('anuncio_cor') || '').trim();
                const cor = (corInput && (corInput.startsWith('#') || /^[0-9A-Fa-f]{6}$/.test(corInput))) 
                    ? (corInput.startsWith('#') ? corInput : '#' + corInput) 
                    : '#F43F5E';

                const embedPreview = new EmbedBuilder()
                    .setTitle(titulo)
                    .setDescription(desc)
                    .setColor(cor)
                    .setThumbnail(interaction.client.user.displayAvatarURL())
                    .setFooter({ text: '© Kitsune - All Rights Reserved', iconURL: interaction.client.user.displayAvatarURL() })
                    .setTimestamp();

                if (banner && (banner.startsWith('http://') || banner.startsWith('https://'))) {
                    embedPreview.setImage(banner);
                }

                const components = [];
                let linkButton = null;
                if (botaoRaw && botaoRaw.includes('|')) {
                    const [bLabel, bUrl] = botaoRaw.split('|').map(s => s.trim());
                    if (bLabel && bUrl && (bUrl.startsWith('http://') || bUrl.startsWith('https://'))) {
                        linkButton = new ButtonBuilder()
                            .setLabel(bLabel.substring(0, 80))
                            .setStyle(ButtonStyle.Link)
                            .setURL(bUrl);
                    }
                }

                // Guardar job pendente
                if (!global.pendingBroadcasts) global.pendingBroadcasts = new Map();
                const jobId = require('crypto').randomUUID();

                const targetGuilds = (alcance === 'global')
                    ? Array.from(interaction.client.guilds.cache.values())
                    : [interaction.guild];

                global.pendingBroadcasts.set(jobId, {
                    destino,
                    alcance,
                    ignorarStaff,
                    ignorarIds,
                    titulo,
                    desc,
                    banner,
                    botaoRaw,
                    cor,
                    embedData: embedPreview.toJSON(),
                    linkButtonData: linkButton ? linkButton.toJSON() : null,
                    guildIds: targetGuilds.map(g => g.id),
                    authorId: interaction.user.id
                });

                const previewRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`btn_confirmar_anuncio__${jobId}`)
                        .setLabel('🚀 Confirmar e Iniciar Disparo')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('📢'),
                    new ButtonBuilder()
                        .setCustomId(`btn_cancelar_anuncio__${jobId}`)
                        .setLabel('❌ Cancelar')
                        .setStyle(ButtonStyle.Secondary)
                );

                if (linkButton) {
                    const btnLinkRow = new ActionRowBuilder().addComponents(linkButton);
                    components.push(btnLinkRow);
                }
                components.push(previewRow);

                const infoText = [
                    '📋 **PRÉVIA DO ANÚNCIO:**',
                    `• **Destino:** \`${destino === 'dm' ? 'Direct Message (DM Privada)' : 'Canal de Anúncios'}\``,
                    `• **Alcance:** \`${alcance === 'global' ? `Todos os Servidores (${targetGuilds.length})` : `Apenas este servidor (${interaction.guild.name})`}\``,
                    '',
                    '⚠️ **Aviso de Segurança Anti-Ban do Discord:**',
                    '> O envio em massa na DM será realizado com **delay inteligente de 3 segundos por membro** para respeitar rigorosamente os limites da API do Discord e impedir qualquer risco de rate limit ou quarentena.',
                    '> Membros com DMs privadas bloqueadas serão ignorados silenciosamente sem travar o processo.',
                    '',
                    'Confira a prévia do visual abaixo e clique em **🚀 Confirmar e Iniciar Disparo** para começar:'
                ].join('\n');

                return await interaction.reply({ content: infoText, embeds: [embedPreview], components, ephemeral: true });
            }

            if (interaction.customId === 'modal_riot_id') {
                try {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferReply({ ephemeral: true });
                    }
                } catch (e) {
                    if (e.code === 10062) return;
                }

                const riotId = interaction.fields.getTextInputValue('ticket_riot');
                const session = userStoreSessions.get(interaction.user.id) || { regiao: 'BR' };
                session.riotId = riotId;
                userStoreSessions.set(interaction.user.id, session);

                const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
                await interaction.editReply({ content: `${loadEmj} ${getLoadStr('sales')}` }).catch(() => { });
                await new Promise(resolve => setTimeout(resolve, 1500));

                const embed = buildCustomEmbed('store_sales_center', interaction.client, interaction);
                const menu = buildStoreMainMenu(customEmojis);
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

            else if (interaction.customId.startsWith('buscar_generico_modal_')) {
                const cat = interaction.customId.replace('buscar_generico_modal_', '');
                const busca = interaction.fields.getTextInputValue('nome_campeao_busca');
                const selectMap = {
                    'skins': 'selecionar_skin_menu',
                    'cromas': 'selecionar_chroma_menu',
                    'highlights': 'selecionar_highlight_menu',
                    'bundles': 'selecionar_bundle_menu',
                    'passes': 'selecionar_passe_menu',
                    'champions': 'selecionar_champion_menu',
                    'emotes': 'selecionar_emote_menu',
                    'icones': 'selecionar_icone_menu',
                    'wards': 'selecionar_ward_menu',
                    'little_legends': 'selecionar_lenda_menu',
                    'tft_arena': 'selecionar_arena_menu',
                    'boosts': 'selecionar_boost_menu',
                    'eternos': 'selecionar_eterno_menu',
                    'misterio': 'selecionar_misterio_menu',
                    'hextech': 'selecionar_hextech_menu',
                    'orbes': 'selecionar_orbes_menu'
                };
                const menuId = selectMap[cat] || 'selecionar_item_menu';
                await buscarEExibirItens(busca, interaction, cor, menuId, cat);
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
                            await owner.send({ embeds: [ratingEmbed], components: [starRow] }).catch(() => { });
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
                const newRegion = interaction.fields.getTextInputValue('new_region').toUpperCase().trim();
                const newRiotId = interaction.fields.getTextInputValue('new_riotid').trim();

                const cart = global.ticketCarts ? global.ticketCarts.get(interaction.channel.id) : null;
                if (cart) {
                    cart.regiao = newRegion;
                    cart.riotId = newRiotId;
                    delete cart.friendshipStatus;
                }

                await atualizarEmbedTicket(interaction.channel, interaction.client);
                return await interaction.reply({ content: `✅ Detalhes do pedido atualizados!\n> 🌐 **Região:** \`${newRegion}\`\n> 🎮 **Riot ID:** \`${newRiotId}\``, ephemeral: true });
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
    interaction.showModal(modal).catch(() => { });
}

async function buscarEExibirItens(busca, interaction, cor, menuId, tipoFiltro = 'skins', pagina = 0, isUpdate = false) {
    const ITEMS_PER_PAGE = 25;
    const loadEmj = (customEmojis?.utilidades?.carregando || '⏳').trim();
    if (!isUpdate) {
        await interaction.reply({ content: `${loadEmj} ${getLoadStr('search')}`, ephemeral: true });
        await new Promise(resolve => setTimeout(resolve, 2500));
    }

    const buscaLimpa = busca.trim().toLowerCase();

    const session = userStoreSessions.get(interaction.user.id);
    const userRegiao = (session?.regiao || 'BR').toUpperCase();
    const lang = 'en'; // Catálogo do bot 100% em inglês
    const currentCatalog = loadFullRiotCatalog(lang);

    const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const buscaNorm = normalize(buscaLimpa);

    let campeaoFinal = currentCatalog.find(x =>
        (x.tipo === 'CHAMPION' || x.tipo === 'CHAMPIONS') &&
        (x.nome.toLowerCase() === buscaLimpa || x.nome.toLowerCase().includes(buscaLimpa) || (buscaNorm.length >= 3 && normalize(x.nome).includes(buscaNorm)))
    );

    if (!campeaoFinal) {
        const skinCamp = currentCatalog.find(x => (x.nome.toLowerCase().includes(buscaLimpa) || (buscaNorm.length >= 3 && normalize(x.nome).includes(buscaNorm))) && x.tipo === 'CHAMPION_SKIN');
        if (skinCamp && skinCamp.parent_id) {
            const champMatch = currentCatalog.find(x => (Number(x.id) === Number(skinCamp.parent_id) || x.id === skinCamp.parent_id) && (x.tipo === 'CHAMPION' || x.tipo === 'CHAMPIONS'));
            if (champMatch) campeaoFinal = champMatch;
        }
    }

    let results = [];
    if (tipoFiltro === 'skins') {
        if (campeaoFinal) {
            const skins = currentCatalog.filter(x => x.parent_id === campeaoFinal.id && (x.tipo === 'CHAMPION_SKIN' || x.tipo === 'SKIN') && !isChroma(x) && !isPrestigeOrMythic(x));
            const signatureBundles = currentCatalog.filter(x =>
                (x.tipo === 'BUNDLES' || x.tipo === 'BUNDLE') &&
                x.nome.toLowerCase().includes('signature edition') &&
                x.nome.toLowerCase().includes(campeaoFinal.nome.toLowerCase()) &&
                !isPrestigeOrMythic(x)
            );
            results = [...skins, ...signatureBundles];
        }
        if (results.length === 0) {
            results = currentCatalog.filter(x => (x.tipo === 'CHAMPION_SKIN' || x.tipo === 'SKIN') && x.nome.toLowerCase().includes(buscaLimpa) && !isChroma(x) && !isPrestigeOrMythic(x));
        }
    } else if (tipoFiltro === 'cromas') {
        if (campeaoFinal) {
            results = currentCatalog.filter(x => x.parent_id === campeaoFinal.id && (x.tipo === 'CHAMPION_SKIN' || x.tipo === 'SKIN' || x.tipo === 'CHROMA' || x.tipo === 'BUNDLES' || x.tipo === 'BUNDLE') && isChroma(x));
        }
        if (results.length === 0) {
            results = currentCatalog.filter(x => x.nome.toLowerCase().includes(buscaLimpa) && isChroma(x));
        }
    } else if (tipoFiltro === 'eternos') {
        if (campeaoFinal) {
            const champIdNum = Number(campeaoFinal.id);
            const champNameLower = campeaoFinal.nome.toLowerCase();
            const champNorm = normalize(campeaoFinal.nome);
            results = currentCatalog.filter(x => {
                const t = (x.tipo || x.inventory_type || '').toUpperCase();
                const n = (x.nome || '').toLowerCase();
                const isStat = (t === 'STATSTONE' || n.includes('statstone') || n.includes('eternal') || n.includes('series') || n.includes('série'));
                if (!isStat) return false;
                const parentMatch = x.parent_id && (Number(x.parent_id) === champIdNum || String(x.parent_id) === String(campeaoFinal.id));
                const nameMatch = n.startsWith(champNameLower + ' -') || n.startsWith(champNameLower + ' –') || n.includes(champNameLower) || normalize(n).startsWith(champNorm);
                return parentMatch || nameMatch;
            });
        }
        if (results.length === 0) {
            results = currentCatalog.filter(x => {
                const n = (x.nome || '').toLowerCase();
                const t = (x.tipo || x.inventory_type || '').toUpperCase();
                const isStat = (t === 'STATSTONE' || n.includes('eterno') || n.includes('eternal') || n.includes('statstone') || n.includes('series') || n.includes('série'));
                return isStat && (n.includes(buscaLimpa) || (buscaNorm.length >= 3 && normalize(n).includes(buscaNorm)));
            });
        }
        // Ordenar: Series 1, Series 2, Starter Series
        results.sort((a, b) => {
            const getOrder = n => {
                const nl = (n || '').toLowerCase();
                if (nl.includes('series 1') || nl.includes('série 1')) return 1;
                if (nl.includes('series 2') || nl.includes('série 2')) return 2;
                if (nl.includes('starter') || nl.includes('inicial')) return 3;
                return 4;
            };
            return getOrder(a.nome) - getOrder(b.nome);
        });
    } else if (tipoFiltro === 'champions') {
        if (campeaoFinal) {
            const c = currentCatalog.find(x => x.id === campeaoFinal.id && (x.tipo === 'CHAMPION' || x.tipo === 'CHAMPIONS'));
            if (c) results = [c];
        }
        if (results.length === 0) {
            results = currentCatalog.filter(x => (x.tipo === 'CHAMPION' || x.tipo === 'CHAMPIONS') && x.nome.toLowerCase().includes(buscaLimpa));
        }
    } else if (tipoFiltro === 'emotes') {
        results = currentCatalog.filter(x => (x.tipo || '').toUpperCase() === 'EMOTE' && x.nome.toLowerCase().includes(buscaLimpa));
    } else if (tipoFiltro === 'icones') {
        results = currentCatalog.filter(x => ((x.tipo || '').toUpperCase() === 'SUMMONER_ICON' || (x.tipo || '').toUpperCase() === 'ICON') && x.nome.toLowerCase().includes(buscaLimpa));
    } else if (tipoFiltro === 'wards') {
        results = currentCatalog.filter(x => ((x.tipo || '').toUpperCase() === 'WARD_SKIN' || (x.tipo || '').toUpperCase() === 'WARD') && x.nome.toLowerCase().includes(buscaLimpa));
    } else if (tipoFiltro === 'little_legends') {
        results = currentCatalog.filter(x => ((x.tipo || '').toUpperCase() === 'COMPANION' || (x.tipo || '').toUpperCase() === 'LITTLELEGENDS') && x.nome.toLowerCase().includes(buscaLimpa));
    } else if (tipoFiltro === 'tft_arena') {
        results = currentCatalog.filter(x => ((x.tipo || '').toUpperCase() === 'TFT_MAP_SKIN' || (x.tipo || '').toUpperCase() === 'TFTARENA' || (x.tipo || '').toUpperCase() === 'TFT_DAMAGE_SKIN') && x.nome.toLowerCase().includes(buscaLimpa));
    } else if (tipoFiltro === 'boosts') {
        results = currentCatalog.filter(x => (x.tipo || '').toUpperCase() === 'BOOST' && x.nome.toLowerCase().includes(buscaLimpa));
    } else if (tipoFiltro === 'misterio') {
        results = currentCatalog.filter(x => ((x.tipo || '').toUpperCase() === 'MYSTERY' || x.nome.toLowerCase().includes('mystery') || x.nome.toLowerCase().includes('mistério')) && x.nome.toLowerCase().includes(buscaLimpa));
    } else if (tipoFiltro === 'hextech') {
        results = currentCatalog.filter(x => {
            const n = x.nome.toLowerCase();
            const t = (x.tipo || '').toUpperCase();
            
            const matchesHextech = (
                t === 'HEXTECH_CRAFTING' || 
                t === 'HEXTECH' || 
                n.includes('hextech') || 
                n.includes('baú') || 
                n.includes('chest') || 
                n.includes('chave') || 
                (n.includes('key') && !n.includes('monkey') && !n.includes('okey'))
            );

            if (!matchesHextech) return false;

            if (t === 'CHAMPION_SKIN' || t === 'SKIN' || isChroma(x)) return false;
            if (t === 'CHAMPION' || t === 'CHAMPIONS') return false;
            if (t === 'EMOTE') return false;
            if (t === 'SUMMONER_ICON' || t === 'ICON') return false;
            if (t === 'WARD_SKIN' || t === 'WARD') return false;
            if (t === 'COMPANION' || t === 'LITTLELEGENDS') return false;
            if (t === 'TFT_MAP_SKIN' || t === 'TFTARENA' || t === 'TFT_DAMAGE_SKIN') return false;
            
            if (n.includes('1 star') || n.includes('2 star') || n.includes('3 star')) return false;

            return n.includes(buscaLimpa);
        });
    } else if (tipoFiltro === 'orbes') {
        results = currentCatalog.filter(x => {
            const n = x.nome.toLowerCase();
            const t = (x.tipo || '').toUpperCase();
            
            const matchesOrbs = (
                (n.includes('orb') && !n.includes('orbeeanna') && !n.includes('orianna')) ||
                n.includes('orbe') || 
                n.includes('capsule') ||
                n.includes('cápsula')
            );

            if (!matchesOrbs) return false;

            if (t === 'CHAMPION_SKIN' || t === 'SKIN' || isChroma(x)) return false;
            if (t === 'CHAMPION' || t === 'CHAMPIONS') return false;
            if (t === 'EMOTE') return false;
            if (t === 'SUMMONER_ICON' || t === 'ICON') return false;
            if (t === 'WARD_SKIN' || t === 'WARD') return false;
            if (t === 'COMPANION' || t === 'LITTLELEGENDS') return false;
            if (t === 'TFT_MAP_SKIN' || t === 'TFTARENA' || t === 'TFT_DAMAGE_SKIN') return false;
            
            if (n.includes('1 star') || n.includes('2 star') || n.includes('3 star')) return false;

            return n.includes(buscaLimpa);
        });
    } else if (tipoFiltro === 'passes') {
        results = currentCatalog.filter(x => {
            const n = x.nome.toLowerCase();
            const t = (x.tipo || '').toUpperCase();
            return (t === 'EVENT_PASS' || t === 'PASS' || n.includes('pass') || n.includes('passe')) &&
                !n.includes('chest') && !n.includes('baú') && !n.includes('key') && !n.includes('chave') && !n.includes('hextech') &&
                !n.includes('clash') && !n.includes('new player') && !n.includes('mystery') && !n.includes('misterio') &&
                !n.includes('three-peat') && !n.includes('banner') && !n.includes('chroma') && !n.includes('signature') &&
                !n.includes('missions token bank pass') &&
                !n.includes('orb') && !n.includes('orbe') && !n.includes('capsule') &&
                !n.includes('eterno') && !n.includes('eternal') && !n.includes('statstone') && !n.includes('series') && !n.includes('série') &&
                t !== 'STATSTONE' &&
                n.includes(buscaLimpa);
        });
    } else if (tipoFiltro === 'highlights' || tipoFiltro === 'bundles') {
        results = currentCatalog.filter(x => ((x.tipo || '').toUpperCase() === 'BUNDLES' || (x.tipo || '').toUpperCase() === 'BUNDLE') && !isChroma(x) && x.nome.toLowerCase().includes(buscaLimpa));
    } else {
        results = currentCatalog.filter(x => x.nome.toLowerCase().includes(buscaLimpa));
    }

    if (results.length === 0) {
        const btnTentar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`tentar_novamente_${tipoFiltro}`).setLabel('Try Again').setStyle(ButtonStyle.Primary).setEmoji('🔄')
        );
        const msg = `❌ Could not find any item matching **"${busca.trim()}"** in **${tipoFiltro}**.`;
        if (interaction.replied || interaction.deferred) return interaction.editReply({ content: msg, embeds: [], components: [btnTentar] });
        if (isUpdate) return interaction.update({ content: msg, embeds: [], components: [btnTentar] });
        return interaction.reply({ content: msg, embeds: [], components: [btnTentar], ephemeral: true });
    }

    // Sort active ones first, then by ID descending
    results = results.sort((a, b) => {
        const aActive = (a.is_available !== false && a.rawItem?.active !== false) ? 1 : 0;
        const bActive = (b.is_available !== false && b.rawItem?.active !== false) ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return (b.id || 0) - (a.id || 0);
    });

    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE) || 1;
    if (pagina < 0) pagina = 0;
    if (pagina >= totalPages) pagina = totalPages - 1;

    const pageItems = results.slice(pagina * ITEMS_PER_PAGE, (pagina + 1) * ITEMS_PER_PAGE);

    const champNome = campeaoFinal ? campeaoFinal.nome : busca.trim();

    // Mantém o embed principal fixo 'Catalog of Gifts' e troca apenas componentes
    let embedConfirmacao = buildCustomEmbed('store_sales_center', interaction?.client, interaction);

    const loja = obterDadosLoja();
    const opcoesMenu = [];

    for (const row of pageItems) {
        const info = obterDetalhesItem(row.nome, tipoFiltro, loja, '0.00', row.rawItem, lang);
        const baseName = row.nome.length > 90 ? row.nome.substring(0, 90) : row.nome;
        opcoesMenu.push({
            label: row.nome.substring(0, 100),
            description: info.desc,
            value: `${baseName}||${row.id}`,
            emoji: info.emoji
        });
    }

    const actionRows = [];

    let placeholderText = `Select a ${tipoFiltro}`;
    if (tipoFiltro === 'skins') placeholderText = 'Select a Champion Skin';
    else if (tipoFiltro === 'cromas') placeholderText = 'Select a Chroma (290 RP)';
    else if (tipoFiltro === 'eternos') placeholderText = 'Select an Eternal Series (600 RP)';
    else if (tipoFiltro === 'champions') placeholderText = 'Select a Champion';
    else if (tipoFiltro === 'passes') placeholderText = 'Select a Season Pass';
    else if (tipoFiltro === 'orbes') placeholderText = 'Select an Orb or Capsule';
    else if (tipoFiltro === 'hextech') placeholderText = 'Select Hextech Chests or Keys';
    else if (tipoFiltro === 'emotes') placeholderText = 'Select an Emote (350 RP)';
    else if (tipoFiltro === 'wards') placeholderText = 'Select a Ward Skin (640 RP)';
    else if (tipoFiltro === 'icones') placeholderText = 'Select a Summoner Icon (250 RP)';
    else if (tipoFiltro === 'little_legends') placeholderText = 'Select a Little Legend / Chibi';
    else if (tipoFiltro === 'tft_arena') placeholderText = 'Select a TFT Arena';
    else if (tipoFiltro === 'boosts') placeholderText = 'Select an XP Boost';
    else if (tipoFiltro === 'misterio') placeholderText = 'Select a Mystery Gift';

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(menuId)
            .setPlaceholder(placeholderText)
            .setOptions(opcoesMenu)
    );
    actionRows.push(menu);

    const btnRow = new ActionRowBuilder();

    let backCustomId = 'voltar_menu_modal';
    if (['skins', 'cromas', 'bundles'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_skins';
    } else if (['orbes', 'passes', 'hextech', 'misterio'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_loot';
    } else if (['champions', 'eternos'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_champions';
    } else if (['emotes', 'wards', 'icones', 'boosts', 'little_legends', 'tft_arena'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_accessories';
    } else if (['highlights', 'sales', 'most_popular'].includes(tipoFiltro)) {
        backCustomId = 'voltar_cat_highlights';
    }

    btnRow.addComponents(
        buildStoreBackButton(backCustomId, 'Back to Menu')
    );

    if (totalPages > 1) {
        const queryTerm = (campeaoFinal ? campeaoFinal.nome : busca.trim()).replace(/\s+/g, '-');
        btnRow.addComponents(
            buildStorePrevButton(`pag_${tipoFiltro}_${pagina - 1}_${queryTerm}`, 'Previous', pagina === 0),
            buildStoreNextButton(`pag_${tipoFiltro}_${pagina + 1}_${queryTerm}`, 'Next', pagina === totalPages - 1)
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

// Background loop to refresh accounts and check tokens
async function refreshAccountsTask() {
    const fs = require('fs');
    const path = require('path');
    const { getGeopasToken, decodeGeopasAffinity, getChatDom, getChatUri, getStoreBalance, getEntitlements, getFriendList, reauthWithSSID, loginWithRiotCredentials } = require('./utils/riotAuth.js');
    const { friendlistCacheMap } = require('./commands/loja/gift.js');

    const accountsPath = path.join(__dirname, 'config', 'riot_accounts.json');
    if (!fs.existsSync(accountsPath)) return;

    let accounts;
    try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch (e) { return; }

    let updated = false;
    for (const [name, acc] of Object.entries(accounts)) {
        if (!acc.accessToken && !acc.ssid && !acc.username) continue;

        try {
            // 1. Auto re-authenticate via SSID if available
            if (acc.ssid) {
                try {
                    const freshTokens = await reauthWithSSID(acc.ssid);
                    if (freshTokens && freshTokens.accessToken) {
                        acc.accessToken = freshTokens.accessToken;
                        if (freshTokens.idToken) acc.idToken = freshTokens.idToken;
                        acc.expired = false;
                        updated = true;
                    }
                } catch (ssidErr) { }
            }

            // 2. Fallback to Username/Password if configured
            if ((acc.expired || !acc.accessToken) && acc.username && acc.password) {
                try {
                    const freshTokens = await loginWithRiotCredentials(acc.username, acc.password);
                    if (freshTokens && freshTokens.accessToken) {
                        acc.accessToken = freshTokens.accessToken;
                        if (freshTokens.idToken) acc.idToken = freshTokens.idToken;
                        if (freshTokens.ssid) acc.ssid = freshTokens.ssid;
                        acc.expired = false;
                        updated = true;
                    }
                } catch (passErr) { }
            }

            // 3. Refresh entitlements token
            if (acc.accessToken) {
                try {
                    const freshEntitlements = await getEntitlements(acc.accessToken);
                    if (freshEntitlements) {
                        acc.entitlementsToken = freshEntitlements;
                        acc.expired = false;
                        updated = true;
                    }
                } catch (e) { }
            }

            // 4. Check store balance (RP Ping Heartbeat)
            let balance = null;
            if (acc.accessToken && acc.entitlementsToken) {
                balance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
            }

            // Handle 401 token expiration: RETRY WITH SSID IMMEDIATELY!
            if ((!balance || balance.error === 401) && acc.ssid) {
                try {
                    const retryTokens = await reauthWithSSID(acc.ssid);
                    if (retryTokens && retryTokens.accessToken) {
                        acc.accessToken = retryTokens.accessToken;
                        if (retryTokens.idToken) acc.idToken = retryTokens.idToken;
                        acc.expired = false;
                        updated = true;
                        
                        try {
                            acc.entitlementsToken = await getEntitlements(acc.accessToken);
                        } catch(e) {}

                        balance = await getStoreBalance(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                        console.log(`[RiotAuth] 🟢 Sessão renovada 24/7 com sucesso via SSID para ${name}!`);
                    } else {
                        acc.expired = true;
                        updated = true;
                    }
                } catch(retryErr) {
                    acc.expired = true;
                    updated = true;
                }
            } else if (!balance || balance.error === 401) {
                acc.expired = true;
                updated = true;
            }

            if (balance && balance.rp !== undefined) {
                acc.rp = balance.rp;
                acc.be = balance.ip;
                acc.expired = false;
                updated = true;
            }

            // Refresh Geopas token
            if (acc.accessToken && !acc.expired) {
                const geopas = await getGeopasToken(acc.accessToken);
                if (geopas) {
                    acc.geopasToken = geopas;
                    acc.affinity = decodeGeopasAffinity(geopas);
                    acc.chatDom = getChatDom(acc.affinity);
                    acc.chatUri = getChatUri(acc.region, acc.affinity);
                    acc.updatedAt = new Date().toISOString();
                    updated = true;
                }
            }

            // Preload & Cache Friendlist in memory for instant /gift autocomplete
            if (acc.accessToken && !acc.expired) {
                try {
                    const friends = await getFriendList(acc.accessToken, acc.entitlementsToken, acc.region || 'BR1');
                    if (friends && friends.length > 0) {
                        friendlistCacheMap.set(name, { timestamp: Date.now(), friends });
                        if (acc.accessToken) friendlistCacheMap.set(acc.accessToken, { timestamp: Date.now(), friends });
                    }
                } catch (fErr) { }
            }

        } catch (e) {
            console.error(`[Background Task] Erro ao atualizar conta ${name}:`, e.message);
        }
    }

    const timeStr = new Date().toLocaleTimeString('pt-BR');
    let summaryList = [];
    for (const [name, acc] of Object.entries(accounts)) {
        const status = acc.banned ? '🔴 BANIDA' : (acc.expired ? '🔴 EXPIRADA' : '🟢 ATIVA');
        summaryList.push(`${name}: ${(acc.rp || 0).toLocaleString('pt-BR')} RP (${status})`);
    }
    console.log(`[${timeStr}] 💓 [RP Ping Heartbeat] Contas Atualizadas: ${summaryList.join(' | ')}`);

    if (updated) {
        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
        try {
            const { saveAllAccountsToMongo } = require('./utils/mongoStorage.js');
            saveAllAccountsToMongo(accounts);
        } catch (e) {}
    }
}

// Run active RP Balance Keepalive Store Heartbeat every 60 seconds (1 min)
setTimeout(() => {
    refreshAccountsTask();
    setInterval(refreshAccountsTask, 60 * 1000);
}, 5000);
