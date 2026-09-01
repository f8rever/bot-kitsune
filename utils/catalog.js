const fs = require('fs');
const path = require('path');

let catalogPtCache = null;
let catalogEnCache = null;

function normalizeStr(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function loadCatalog(lang = 'pt') {
    const fileName = lang === 'en' ? 'catalog_cache_en.json' : 'catalog_cache_pt.json';
    let filePath = path.join(__dirname, '../config', fileName);
    if (!fs.existsSync(filePath) && lang === 'en') {
        filePath = path.join(__dirname, '../config/catalog_cache_pt.json');
    }

    let rawData = {};
    try {
        if (fs.existsSync(filePath)) {
            rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch(e) {
        console.error('[Catalog] Error reading catalog:', e.message);
    }

    let items = [];
    if (Array.isArray(rawData)) {
        items = rawData.map(item => {
            const subItem = item.subItems ? item.subItems[0] : null;
            const price = subItem && subItem.prices ? (subItem.prices.find(p => p.currency === "RP")?.cost || 0) : 0;
            return {
                name: item.name,
                itemId: item.itemId || subItem?.itemId,
                inventoryType: item.inventoryType || subItem?.inventoryType || 'DEFAULT',
                price: price
            };
        });
    } else if (typeof rawData === 'object' && rawData !== null) {
        for (const catName in rawData) {
            const catObj = rawData[catName];
            if (typeof catObj === 'object' && catObj !== null) {
                for (const itemName in catObj) {
                    const info = catObj[itemName];
                    let price = info.price_rp;
                    if (price === 'Null' || price === null || price === undefined) price = 0;
                    items.push({
                        name: itemName,
                        itemId: info.offer_id || itemName,
                        inventoryType: info.inventory_type || catName.toUpperCase(),
                        price: Number(price) || 0,
                        iconUrl: info.icon_url || null
                    });
                }
            }
        }
    }
    return items;
}

function searchItems(query = '', limit = 25, lang = 'pt') {
    const items = loadCatalog(lang);
    const q = normalizeStr(query);

    if (!q) {
        return items.filter(i => i.inventoryType === 'CHAMPION_SKIN').slice(0, limit);
    }

    const matches = items.filter(item => {
        const normName = normalizeStr(item.name);
        return normName.includes(q);
    });

    // Ordenação inteligente para dar prioridade a Skins principais
    matches.sort((a, b) => {
        const normA = normalizeStr(a.name);
        const normB = normalizeStr(b.name);

        const aStarts = normA.startsWith(q);
        const bStarts = normB.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        const aIsSkin = a.inventoryType === 'CHAMPION_SKIN';
        const bIsSkin = b.inventoryType === 'CHAMPION_SKIN';
        if (aIsSkin && !bIsSkin) return -1;
        if (!aIsSkin && bIsSkin) return 1;

        return 0;
    });

    return matches.slice(0, limit);
}

function getItemByName(name, lang = 'pt') {
    const items = loadCatalog(lang);
    if (!name) return null;
    const targetNorm = normalizeStr(name);
    return items.find(i => normalizeStr(i.name) === targetNorm) || null;
}

module.exports = {
    loadCatalog,
    searchItems,
    getItemByName
};
