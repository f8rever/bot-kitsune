const fs = require('fs');
const path = require('path');
const { fetchStoreCatalogFromRiot } = require('./riotAuth.js');
const { saveBotConfigToMongo } = require('./mongoStorage.js');

const weeklySalesFilePath = path.join(__dirname, '..', 'config', 'weekly_sales.json');

/**
 * Lê a lista atual de Weekly Sales do disco com fallback seguro
 */
function getWeeklySalesList() {
    try {
        if (fs.existsSync(weeklySalesFilePath)) {
            const data = JSON.parse(fs.readFileSync(weeklySalesFilePath, 'utf8'));
            if (Array.isArray(data)) return data;
        }
    } catch (e) {
        console.error('[WeeklySales] Erro ao ler weekly_sales.json:', e.message);
    }
    return [];
}

/**
 * Salva a lista de Weekly Sales tanto no disco local quanto na nuvem (MongoDB Atlas)
 */
async function saveWeeklySales(salesList) {
    try {
        fs.writeFileSync(weeklySalesFilePath, JSON.stringify(salesList, null, 2), 'utf8');
        await saveBotConfigToMongo('weekly_sales', salesList).catch(() => {});
        return true;
    } catch (e) {
        console.error('[WeeklySales] Erro ao salvar weekly_sales.json:', e.message);
        return false;
    }
}

/**
 * Sincroniza automaticamente as promoções semanais direto da Storefront API da Riot Games
 * @param {string} accessToken Token de acesso de uma conta Riot ativa
 * @param {string} region Região da conta (padrão: BR1)
 */
async function syncWeeklySalesFromRiot(accessToken, region = 'BR1') {
    if (!accessToken) return { success: false, error: 'No access token provided' };

    try {
        console.log(`[WeeklySales] 🔄 Consultando loja da Riot (${region}) para obter rotação de promoções...`);
        const rawCatalog = await fetchStoreCatalogFromRiot(accessToken, region, 'en_US');

        if (!rawCatalog || !Array.isArray(rawCatalog)) {
            return { success: false, error: 'Storefront catalog empty or inaccessible' };
        }

        const now = new Date();
        const salesFound = [];

        for (const item of rawCatalog) {
            const sale = item.sale;
            if (!sale || !sale.prices || !Array.isArray(sale.prices) || sale.prices.length === 0) continue;

            // Verificar validade da data se presente
            if (sale.startDate && new Date(sale.startDate) > now) continue;
            if (sale.endDate && new Date(sale.endDate) < now) continue;

            const invType = (item.inventoryType || '').toUpperCase();
            if (invType !== 'CHAMPION_SKIN' && invType !== 'CHAMPION') continue;

            const name = item.localizations?.en_US?.name || item.name;
            if (!name) continue;

            const regularRp = item.prices?.find(p => p.currency === 'RP')?.cost || 1350;
            const salePriceObj = sale.prices.find(p => p.currency === 'RP');
            if (!salePriceObj || !salePriceObj.cost) continue;

            const saleRp = salePriceObj.cost;
            let discountPercent = salePriceObj.discount ? Math.round(salePriceObj.discount * 100) : 0;
            if (!discountPercent && regularRp > saleRp) {
                discountPercent = Math.round((1 - (saleRp / regularRp)) * 100);
            }

            let iconUrl = item.iconUrl || null;
            if (iconUrl && !iconUrl.startsWith('http')) {
                iconUrl = 'https:' + iconUrl;
            }

            salesFound.push({
                id: String(item.itemId || item.id),
                name: name.trim(),
                regular_rp: regularRp,
                sale_rp: saleRp,
                discount_percent: discountPercent,
                iconUrl: iconUrl,
                inventoryType: invType
            });
        }

        if (salesFound.length > 0) {
            await saveWeeklySales(salesFound);
            console.log(`[WeeklySales] 🌟 Sucesso! ${salesFound.length} promoções oficiais sincronizadas direto da Riot Games!`);
            return { success: true, count: salesFound.length, sales: salesFound };
        } else {
            console.log('[WeeklySales] ⚠️ Nenhuma promoção com tag de venda encontrada no catálogo bruto retornado.');
            return { success: false, error: 'No sales found in returned catalog' };
        }
    } catch (err) {
        console.error('[WeeklySales Error]', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Monta os 25 itens que compõem exatamente a vitrine "MOST POPULAR" do League of Legends:
 * 1. Os 5 itens de Loot Hextech (Baú, Chave, 1x, 5x, 10x)
 * 2. As 15 Skins em promoção ativa na semana
 * 3. Os 5 Campeões em promoção ativa na semana
 * @param {Array} currentCatalog Catálogo indexado carregado pelo bot
 */
function getLoLMostPopularItems(currentCatalog = []) {
    // 1. Os 5 itens fixos de Loot Hextech do LoL
    const hextechSpecs = [
        { name: 'Hextech Chest', search: 'Hextech Chest', defaultRp: 125, tipo: 'HEXTECH' },
        { name: 'Hextech Key', search: 'Hextech Key', defaultRp: 125, tipo: 'HEXTECH' },
        { name: '1 Hextech Chest and Key Bundle', search: '1 Hextech Chest and Key', defaultRp: 195, tipo: 'HEXTECH' },
        { name: '5 Hextech Chests & Keys + Bonus Essence!', search: '5 Hextech Chests & Keys', defaultRp: 975, tipo: 'HEXTECH' },
        { name: '10 Hextech Chests & Keys + Bonus Set!', search: '10 Hextech Chests & Keys', defaultRp: 1950, tipo: 'HEXTECH' }
    ];

    const hexResults = hextechSpecs.map(p => {
        const catItem = currentCatalog.find(c => {
            const n = (c.nome || '').toLowerCase();
            return n.includes(p.search.toLowerCase()) && !n.includes('masterwork');
        });
        return {
            id: catItem ? catItem.id : p.name,
            nome: catItem ? catItem.nome : p.name,
            tipo: catItem ? catItem.tipo : p.tipo,
            iconUrl: catItem ? catItem.iconUrl : null,
            price_rp: catItem ? catItem.price_rp : p.defaultRp,
            rawItem: catItem ? catItem.rawItem : { inventoryType: p.tipo }
        };
    });

    // 2. Skins e Campeões da Semana (Weekly Sales oficiais)
    const saleList = getWeeklySalesList();
    const salesResults = saleList.map(s => {
        const catItem = currentCatalog.find(c => String(c.id) === String(s.id) || (c.nome && c.nome.toLowerCase() === s.name.toLowerCase()));
        return {
            id: s.id,
            nome: s.name,
            tipo: s.inventoryType || 'CHAMPION_SKIN',
            iconUrl: s.iconUrl || catItem?.iconUrl || null,
            price_rp: s.sale_rp,
            rawItem: {
                ...(catItem?.rawItem || {}),
                regular_rp: s.regular_rp,
                sale_rp: s.sale_rp,
                discount_percent: s.discount_percent,
                inventoryType: s.inventoryType || 'CHAMPION_SKIN'
            }
        };
    });

    // Concatena: 5 Hextech + promoções (skins e campeões)
    return [...hexResults, ...salesResults];
}

module.exports = {
    getWeeklySalesList,
    saveWeeklySales,
    syncWeeklySalesFromRiot,
    getLoLMostPopularItems
};
