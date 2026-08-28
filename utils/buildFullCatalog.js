const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function buildFullCatalog() {
    console.log('[Catalog Builder] 🚀 Iniciando sincronização completa do catálogo com a Riot Games...');
    const startTime = Date.now();

    // 1. Obter a versão mais recente do LoL
    const verRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
    const version = verRes.data[0];
    console.log(`[Catalog Builder] 📦 Versão ativa da Riot: ${version}`);

    // 2. Baixar todos os campeões e skins (PT e EN)
    const [ptRes, enRes] = await Promise.all([
        axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/championFull.json`),
        axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/championFull.json`)
    ]);

    const ptChamps = ptRes.data.data;
    const enChamps = enRes.data.data;

    // 3. Ler catalog.json bruto existente se houver para mapear preços de RP e passes/orbes
    let rawStoreItems = {};
    const rawCatalogPath = path.join(__dirname, '../lol_giftapi-main/catalog.json');
    if (fs.existsSync(rawCatalogPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(rawCatalogPath, 'utf8'));
            if (Array.isArray(raw)) {
                raw.forEach(item => {
                    const offerId = item.offerId;
                    const itemId = item.itemId;
                    let priceRp = null;
                    if (item.prices) {
                        const rpObj = item.prices.find(p => p.currency === 'RP');
                        if (rpObj) priceRp = rpObj.cost;
                    }
                    if (item.sale && item.sale.prices) {
                        const saleRp = item.sale.prices.find(p => p.currency === 'RP');
                        if (saleRp) priceRp = saleRp.cost;
                    }

                    const ptLoc = item.localizations?.pt_BR?.name || item.name;
                    const enLoc = item.localizations?.en_US?.name || item.name;

                    if (ptLoc) rawStoreItems[ptLoc.toLowerCase().trim()] = { offerId, itemId, priceRp, inventoryType: item.inventoryType };
                    if (enLoc) rawStoreItems[enLoc.toLowerCase().trim()] = { offerId, itemId, priceRp, inventoryType: item.inventoryType };
                });
            }
        } catch(e) {}
    }

    const catalogPt = {
        Skins: {},
        Chromas: {},
        Champions: {},
        Passes: {},
        Loot: {},
        Emotes: {},
        Icons: {},
        Wards: {},
        Others: {}
    };

    const catalogEn = {
        Skins: {},
        Chromas: {},
        Champions: {},
        Passes: {},
        Loot: {},
        Emotes: {},
        Icons: {},
        Wards: {},
        Others: {}
    };

    // 4. Processar todos os campeões e skins do Data Dragon
    for (const champKey in ptChamps) {
        const ptC = ptChamps[champKey];
        const enC = enChamps[champKey] || ptC;

        // Adicionar Campeão
        const champPtName = ptC.name;
        const champEnName = enC.name;
        const champId = Number(ptC.key);

        catalogPt.Champions[champPtName] = {
            offer_id: `champ_${champId}`,
            item_id: champId,
            price_rp: 975,
            inventory_type: 'CHAMPION'
        };
        catalogEn.Champions[champEnName] = {
            offer_id: `champ_${champId}`,
            item_id: champId,
            price_rp: 975,
            inventory_type: 'CHAMPION'
        };

        // Processar Skins & Cromas do campeão
        if (ptC.skins && Array.isArray(ptC.skins)) {
            ptC.skins.forEach((skinPt, idx) => {
                if (skinPt.num === 0) return; // Pular skin padrão (default)
                const skinEn = enC.skins ? enC.skins[idx] || skinPt : skinPt;

                const namePt = skinPt.name === 'default' ? `${champPtName} Padrão` : skinPt.name;
                const nameEn = skinEn.name === 'default' ? `${champEnName} Default` : skinEn.name;
                const skinId = skinPt.id;

                const isChroma = namePt.includes('(') && namePt.includes(')');
                const storeMatchPt = rawStoreItems[namePt.toLowerCase().trim()];
                const storeMatchEn = rawStoreItems[nameEn.toLowerCase().trim()];

                let priceRp = isChroma ? 290 : 1350;
                let offerId = (storeMatchPt && storeMatchPt.offerId) || (storeMatchEn && storeMatchEn.offerId) || `skin_${skinId}`;

                if (storeMatchPt && storeMatchPt.priceRp) priceRp = storeMatchPt.priceRp;
                else if (storeMatchEn && storeMatchEn.priceRp) priceRp = storeMatchEn.priceRp;

                const itemDataPt = {
                    offer_id: offerId,
                    item_id: skinId,
                    price_rp: priceRp,
                    inventory_type: isChroma ? 'CHROMA' : 'CHAMPION_SKIN'
                };

                const itemDataEn = {
                    offer_id: offerId,
                    item_id: skinId,
                    price_rp: priceRp,
                    inventory_type: isChroma ? 'CHROMA' : 'CHAMPION_SKIN'
                };

                if (isChroma) {
                    catalogPt.Chromas[namePt] = itemDataPt;
                    catalogEn.Chromas[nameEn] = itemDataEn;
                } else {
                    catalogPt.Skins[namePt] = itemDataPt;
                    catalogEn.Skins[nameEn] = itemDataEn;
                }
            });
        }
    }

    // 5. Adicionar Passes, Espólios (Orbes, Baús) e Acessórios Oficiais
    const defaultLootPt = {
        "Passe de Evento": { offer_id: "pass_1650", item_id: 1650, price_rp: 1650, inventory_type: "EVENT_PASS" },
        "Pacote Passe de Evento + Skin": { offer_id: "pass_2650", item_id: 2650, price_rp: 2650, inventory_type: "BUNDLES" },
        "Pacote Premium Passe de Evento": { offer_id: "pass_3650", item_id: 3650, price_rp: 3650, inventory_type: "BUNDLES" },
        "Orbe de Evento": { offer_id: "orb_250", item_id: 250, price_rp: 250, inventory_type: "CHEST" },
        "Pacote 10 Orbes + 1 Orbe Bônus": { offer_id: "orb_2500", item_id: 2500, price_rp: 2500, inventory_type: "BUNDLES" },
        "Pacote 25 Orbes + Sacola Exclusiva": { offer_id: "orb_6250", item_id: 6250, price_rp: 6250, inventory_type: "BUNDLES" },
        "Pacote 50 Orbes + 2 Sacolas + Pacote Exclusivo": { offer_id: "orb_12500", item_id: 12500, price_rp: 12500, inventory_type: "BUNDLES" },
        "Baú do Mestre-Artesão + Chave": { offer_id: "chest_masterwork_225", item_id: 225, price_rp: 225, inventory_type: "CHEST" },
        "10 Baús do Mestre-Artesão + Chaves": { offer_id: "chest_masterwork_2250", item_id: 2250, price_rp: 2250, inventory_type: "BUNDLES" },
        "Baú Hextec + Chave": { offer_id: "chest_hextech_195", item_id: 195, price_rp: 195, inventory_type: "CHEST" },
        "Cápsula de Campeão": { offer_id: "capsule_champ_750", item_id: 750, price_rp: 750, inventory_type: "CHEST" },
        "Skin Mistério (Mystery Skin)": { offer_id: "mystery_skin_490", item_id: 490, price_rp: 490, inventory_type: "GIFT" },
        "Campeão Mistério (Mystery Champion)": { offer_id: "mystery_champ_490", item_id: 490, price_rp: 490, inventory_type: "GIFT" }
    };

    const defaultLootEn = {
        "Event Pass": { offer_id: "pass_1650", item_id: 1650, price_rp: 1650, inventory_type: "EVENT_PASS" },
        "Event Pass Bundle + Skin": { offer_id: "pass_2650", item_id: 2650, price_rp: 2650, inventory_type: "BUNDLES" },
        "Premium Event Pass Bundle": { offer_id: "pass_3650", item_id: 3650, price_rp: 3650, inventory_type: "BUNDLES" },
        "Event Orb": { offer_id: "orb_250", item_id: 250, price_rp: 250, inventory_type: "CHEST" },
        "10 Orbs + 1 Bonus Orb Bundle": { offer_id: "orb_2500", item_id: 2500, price_rp: 2500, inventory_type: "BUNDLES" },
        "25 Orbs + Exclusive Grab Bag": { offer_id: "orb_6250", item_id: 6250, price_rp: 6250, inventory_type: "BUNDLES" },
        "50 Orbs + 2 Grab Bags + Exclusive Pack": { offer_id: "orb_12500", item_id: 12500, price_rp: 12500, inventory_type: "BUNDLES" },
        "Masterwork Chest + Key": { offer_id: "chest_masterwork_225", item_id: 225, price_rp: 225, inventory_type: "CHEST" },
        "10 Masterwork Chests + Keys Bundle": { offer_id: "chest_masterwork_2250", item_id: 2250, price_rp: 2250, inventory_type: "BUNDLES" },
        "Hextech Chest + Key": { offer_id: "chest_hextech_195", item_id: 195, price_rp: 195, inventory_type: "CHEST" },
        "Champion Capsule": { offer_id: "capsule_champ_750", item_id: 750, price_rp: 750, inventory_type: "CHEST" },
        "Mystery Skin": { offer_id: "mystery_skin_490", item_id: 490, price_rp: 490, inventory_type: "GIFT" },
        "Mystery Champion": { offer_id: "mystery_champ_490", item_id: 490, price_rp: 490, inventory_type: "GIFT" }
    };

    catalogPt.Loot = defaultLootPt;
    catalogEn.Loot = defaultLootEn;

    // 6. Salvar arquivos nos caminhos do bot e do backend Python
    const botConfigDir = path.join(__dirname, '../config');
    const pyDir = path.join(__dirname, '../lol_giftapi-main');

    const ptPathBot = path.join(botConfigDir, 'catalog_cache_pt.json');
    const enPathBot = path.join(botConfigDir, 'catalog_cache_en.json');
    const ptPathPy = path.join(pyDir, 'catalog_cache_pt.json');
    const enPathPy = path.join(pyDir, 'catalog_cache_en.json');

    fs.writeFileSync(ptPathBot, JSON.stringify(catalogPt, null, 2), 'utf8');
    fs.writeFileSync(enPathBot, JSON.stringify(catalogEn, null, 2), 'utf8');

    if (fs.existsSync(pyDir)) {
        fs.writeFileSync(ptPathPy, JSON.stringify(catalogPt, null, 2), 'utf8');
        fs.writeFileSync(enPathPy, JSON.stringify(catalogEn, null, 2), 'utf8');
    }

    const totalSkins = Object.keys(catalogPt.Skins).length;
    const totalChromas = Object.keys(catalogPt.Chromas).length;
    const totalChamps = Object.keys(catalogPt.Champions).length;
    const totalAll = totalSkins + totalChromas + totalChamps + Object.keys(catalogPt.Loot).length;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Catalog Builder] ✅ Sincronização concluída em ${elapsed}s!`);
    console.log(`[Catalog Builder] 📊 Totais: ${totalSkins} Skins, ${totalChromas} Cromas, ${totalChamps} Campeões (${totalAll} itens no total).`);

    return {
        version,
        totalSkins,
        totalChromas,
        totalChamps,
        totalAll,
        elapsed,
        catalogPt,
        catalogEn
    };
}

module.exports = { buildFullCatalog };

if (require.main === module) {
    buildFullCatalog();
}
