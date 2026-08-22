const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configure limits for each category to keep download sizes reasonable.
// You can increase these limits if you want to download more items!
const DOWNLOAD_LIMITS = {
    orbes: 999,          // Download all
    hextech: 999,        // Download all
    passes: 999,         // Download all
    misterio: 999,       // Download all
    boosts: 999,         // Download all
    emotes: 100,         // Limit to 100 items
    icones: 100,         // Limit to 100 items
    wards: 100,          // Limit to 100 items
    little_legends: 100, // Limit to 100 items
    tft_arena: 50,       // Limit to 50 items
    skins: 50,           // Limit to 50 items (larger images)
    cromas: 50           // Limit to 50 items (larger images)
};

const TARGET_DIR = path.join(__dirname, '../pngs_catalogos');
const CATALOG_FILE = path.join(__dirname, '../config/catalog_cache_en.json');

// Champion ID to Name mapping for skins splash images
const champMap = {
    "266": "Aatrox", "103": "Ahri", "84": "Akali", "12": "Alistar", "32": "Amumu", "34": "Anivia", "1": "Annie",
    "22": "Ashe", "136": "AurelionSol", "268": "Azir", "432": "Bard", "53": "Blitzcrank", "63": "Brand", "201": "Braum",
    "51": "Caitlyn", "164": "Camille", "69": "Cassiopeia", "31": "ChoGath", "42": "Corki", "122": "Darius", "131": "Diana",
    "119": "Draven", "36": "DrMundo", "245": "Ekko", "60": "Elise", "28": "Evelynn", "81": "Ezreal", "9": "Fiddlesticks",
    "114": "Fiora", "105": "Fizz", "3": "Galio", "41": "Gangplank", "86": "Garen", "150": "Gnar", "79": "Gragas",
    "104": "Graves", "120": "Hecarim", "74": "Heimerdinger", "420": "Illaoi", "39": "Irelia", "427": "Ivern", "40": "Janna",
    "59": "JarvanIV", "24": "Jax", "126": "Jayce", "202": "Jhin", "222": "Jinx", "145": "KaiSa", "429": "Kalista",
    "43": "Karma", "30": "Karthus", "38": "Kassadin", "55": "Katarina", "10": "Kayle", "141": "Kayn", "85": "Kennen",
    "121": "KhaZix", "203": "Kindred", "240": "Kled", "96": "KogMaw", "7": "LeBlanc", "64": "LeeSin", "89": "Leona",
    "127": "Lissandra", "236": "Lucian", "117": "Lulu", "99": "Lux", "54": "Malphite", "90": "Malzahar", "57": "Maokai",
    "11": "MasterYi", "21": "MissFortune", "62": "Wukong", "82": "Mordekaiser", "25": "Morgana", "267": "Nami",
    "75": "Nasus", "111": "Nautilus", "518": "Neeko", "76": "Nidalee", "56": "Nocturne", "20": "Nunu", "2": "Olaf",
    "61": "Orianna", "516": "Ornn", "80": "Pantheon", "78": "Poppy", "555": "Pyke", "246": "Qiyana", "133": "Quinn",
    "497": "Rakan", "33": "Rammus", "421": "RekSai", "58": "Renekton", "107": "Rengar", "92": "Riven", "68": "Rumble",
    "13": "Ryze", "360": "Samira", "113": "Sejuani", "235": "Senna", "147": "Seraphine", "875": "Sett", "35": "Shaco",
    "98": "Shen", "102": "Shyvana", "27": "Singed", "14": "Sion", "15": "Sivir", "72": "Skarner", "37": "Sona",
    "16": "Soraka", "50": "Swain", "517": "Sylas", "134": "Syndra", "223": "TahmKench", "163": "Taliyah", "91": "Talon",
    "44": "Taric", "17": "Teemo", "412": "Thresh", "18": "Tristana", "48": "Trundle", "23": "Tryndamere", "4": "TwistedFate",
    "29": "Twitch", "77": "Udyr", "6": "Urgot", "110": "Varus", "67": "Vayne", "45": "Veigar", "161": "VelKoz",
    "718": "Vex", "254": "Vi", "234": "Viego", "112": "Viktor", "8": "Vladimir", "106": "Volibear", "19": "Warwick",
    "498": "Xayah", "101": "Xerath", "5": "XinZhao", "83": "Yorick", "157": "Yasuo", "777": "Yone", "83": "Yorick",
    "154": "Zac", "238": "Zed", "221": "Zeri", "115": "Ziggs", "26": "Zilean", "142": "Zoe", "143": "Zyra"
};

function isChroma(x) {
    if (!x) return false;
    const t = (x.tipo || x.inventoryType || x.inventory_type || '').toUpperCase();
    if (t !== 'CHAMPION_SKIN' && t !== 'SKIN' && t !== 'CHROMA' && t !== 'BUNDLES' && t !== 'BUNDLE') return false;
    const raw = x.rawItem || x;
    const sub = (raw.subInventoryType || raw.sub_inventory_type || x.subInventoryType || '').toUpperCase();
    if (sub === 'RECOLOR' || sub.includes('CHROMA')) return true;
    if (x.parent_id || raw.parent_id || raw.parentId) {
        if (t === 'CHAMPION_SKIN' || t === 'SKIN' || t === 'CHROMA') return true;
    }
    const name = (x.nome || x.name || '').toLowerCase();
    if (name.includes('chroma') || name.includes('croma')) return true;
    if (name.includes('(') && name.includes(')')) {
        const inside = name.substring(name.lastIndexOf('(') + 1, name.lastIndexOf(')'));
        if (inside.includes('chroma') || inside.includes('croma')) return true;
    }
    return false;
}

function loadFullRiotCatalog() {
    if (!fs.existsSync(CATALOG_FILE)) {
        console.error("Catalog cache file not found. Run bot once to generate it.");
        process.exit(1);
    }
    
    const raw = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
    let items = [];

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
                    rawItem: info
                });
            }
        }
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
    
    // Fallbacks
    const n = (nome || '').toLowerCase();
    const t = (rawItem?.inventory_type || tipoFiltro || '').toUpperCase();

    if (t === 'CHAMPION_SKIN' || t === 'SKIN') {
        const sub = (rawItem?.sub_inventory_type || '').toUpperCase();
        if (sub === 'RECOLOR' || n.includes('chroma') || n.includes('croma')) return 'cromas';
        return 'skins';
    }
    if (t === 'CHROMA') return 'cromas';
    if (t === 'BUNDLES' || t === 'BUNDLE') {
        if (n.includes('chroma') || n.includes('croma')) return 'cromas';
        return 'bundles';
    }
    if (t === 'EVENT_PASS' || t === 'PASS' || n.includes('pass') || n.includes('passe')) {
        if (n.includes('eternal') || n.includes('eterno') || n.includes('série') || n.includes('series')) return 'eternos';
        return 'passes';
    }
    if (t === 'HEXTECH_CRAFTING' || t === 'HEXTECH') return 'hextech';
    if (t === 'MYSTERY' || n.includes('mystery') || n.includes('mistério')) return 'misterio';
    if (t === 'SUMMONER_ICON' || t === 'ICON') return 'icones';
    if (t === 'WARD_SKIN' || t === 'WARD') return 'wards';
    if (t === 'COMPANION' || t === 'LITTLELEGENDS') return 'little_legends';
    if (t === 'TFT_MAP_SKIN' || t === 'TFTARENA' || t === 'TFT_DAMAGE_SKIN') return 'tft_arena';
    if (t === 'EMOTE') return 'emotes';
    if (t === 'BOOST') return 'boosts';
    
    if (n.includes('orb') || n.includes('orbe') || n.includes('capsule') || n.includes('cápsula')) return 'orbes';
    if (n.includes('eterno') || n.includes('eternal') || n.includes('statstone')) return 'eternos';

    return tipoFiltro;
}

function getImageUrl(item, category) {
    const itemIdNum = parseInt(item.id, 10);
    
    if (category === 'orbes' || category === 'hextech' || category === 'passes' || category === 'bundles') {
        if (!isNaN(itemIdNum)) {
            return `https://d392eissrffsyf.cloudfront.net/storeImages/bundles/${itemIdNum}.png`;
        }
    }
    
    if (category === 'skins') {
        if (!isNaN(itemIdNum)) {
            const skinNum = itemIdNum % 1000;
            const champId = Math.floor(itemIdNum / 1000).toString();
            const champKey = champMap[champId];
            if (champKey) {
                return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champKey}_${skinNum}.jpg`;
            }
        }
    }

    if (item.iconUrl) {
        return item.iconUrl.startsWith('//') ? 'https:' + item.iconUrl : item.iconUrl;
    }

    return null;
}

function cleanFileName(name) {
    return name
        .replace(/[^a-zA-Z0-9\s-_()]/g, '') // remove special characters
        .trim()
        .replace(/\s+/g, '_'); // replace spaces with underscores
}

async function downloadFile(url, destPath) {
    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://riotgames.com/'
            }
        });
        
        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(destPath);
            response.data.pipe(writer);
            writer.on('finish', () => resolve(true));
            writer.on('error', (err) => {
                writer.close();
                reject(err);
            });
        });
    } catch (err) {
        throw new Error(err.message);
    }
}

async function main() {
    console.log("=== KITSUNE CATALOG IMAGE DOWNLOADER ===");
    console.log("Loading catalog cache...");
    const catalog = loadFullRiotCatalog();
    console.log(`Loaded ${catalog.length} items from cache.`);

    // Group items by category
    const categorized = {};
    for (const key in DOWNLOAD_LIMITS) {
        categorized[key] = [];
    }

    for (const item of catalog) {
        const actualCat = getActualItemType(item.nome, item.tipo.toLowerCase(), item.rawItem);
        if (categorized[actualCat]) {
            categorized[actualCat].push(item);
        }
    }

    // Create target folders
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    for (const catName of Object.keys(DOWNLOAD_LIMITS)) {
        const catDir = path.join(TARGET_DIR, catName);
        if (!fs.existsSync(catDir)) {
            fs.mkdirSync(catDir, { recursive: true });
        }
        
        const limit = DOWNLOAD_LIMITS[catName];
        const items = categorized[catName].slice(0, limit);
        console.log(`\n📂 Category [${catName.toUpperCase()}]: Found ${categorized[catName].length} items. Downloading top ${items.length} items...`);
        
        let downloadedCount = 0;
        let failedCount = 0;
        
        for (const item of items) {
            const url = getImageUrl(item, catName);
            if (!url) {
                continue;
            }
            
            const ext = url.toLowerCase().endsWith('.jpg') ? '.jpg' : '.png';
            const fileName = cleanFileName(item.nome) + ext;
            const destPath = path.join(catDir, fileName);
            
            if (fs.existsSync(destPath)) {
                // Skip if already exists
                downloadedCount++;
                continue;
            }
            
            try {
                process.stdout.write(`⏳ Downloading [${item.nome}]... `);
                await downloadFile(url, destPath);
                console.log(`✅ Success!`);
                downloadedCount++;
                // Add a small delay between downloads to prevent rate limit issues
                await new Promise(r => setTimeout(r, 200));
            } catch (err) {
                console.log(`❌ Failed! (Error: ${err.message})`);
                failedCount++;
            }
        }
        
        console.log(`🏁 Category [${catName.toUpperCase()}] Complete! Successfully saved: ${downloadedCount}, Failed: ${failedCount}`);
    }

    console.log("\n✨ All downloads complete! PNG files saved under target directory 'pngs_catalogos'.");
}

main().catch(err => {
    console.error("Fatal Error:", err);
});
