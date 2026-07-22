const fs = require('fs');
const path = require('path');

let catalog = null;

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
                        inventoryType: catName.toUpperCase(),
                        price: Number(price) || 0
                    });
                }
            }
        }
    }
    return items;
}

function searchItems(query = '', limit = 25, lang = 'pt') {
    const items = loadCatalog(lang);
    const q = (query || '').toLowerCase().trim();
    
    if (!q) return items.slice(0, limit);
    
    return items
        .filter(item => item.name.toLowerCase().includes(q))
        .slice(0, limit);
}

function getItemByName(name, lang = 'pt') {
    const items = loadCatalog(lang);
    if (!name) return null;
    return items.find(i => i.name.toLowerCase() === name.toLowerCase()) || null;
}

module.exports = {
    loadCatalog,
    searchItems,
    getItemByName
};
