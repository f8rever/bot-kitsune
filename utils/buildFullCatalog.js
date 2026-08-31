const axios = require('axios');
const fs = require('fs');
const path = require('path');

function isUnpurchasableOrMythic(name) {
    const n = (name || '').toLowerCase();
    // 1. Prestígio
    if (n.includes('prestige') || n.includes('prestígio') || n.includes('prestigio')) return true;
    
    // 2. Gacha / Variantes Míticas / Sanctum / Hall of Legends
    if (n.includes('quantum') || n.includes('quântico') || n.includes('quântica')) return true;
    if (n.includes('erasure') || n.includes('erradicação')) return true;
    if (n.includes('breakout') || n.includes('destemido')) return true;
    if (n.includes('divine heavenscale') || n.includes('escamas celestiais divino')) return true;
    if (n.includes('peacemaker') || n.includes('pacificador')) return true;
    if (n.includes('admiral battle') || n.includes('almirante coelha')) return true;
    if (n.includes('immortalized') || n.includes('imortalizada')) return true;
    if (n.includes('risen legend') || n.includes('lenda ascendente')) return true;
    if (n.includes('transcendent') || n.includes('transcendente')) return true;
    if (n.includes('exalted') || n.includes('exaltado') || n.includes('exaltada')) return true;
    if (n.includes('sanctum') || n.includes('santuário')) return true;
    if (n.includes('mythic variant') || n.includes('variante mítica')) return true;
    if (n.includes('faker')) return true;

    // 3. Hextec antigas de Essência Mítica
    if (n.includes('hextech') && (
        n.includes('annie') || n.includes('poppy') || n.includes('alistar') ||
        n.includes('jarvan') || n.includes('kassadin') || n.includes('kog\'maw') ||
        n.includes('malzahar') || n.includes('rammus') || n.includes('renekton') ||
        n.includes('sejuani') || n.includes('swain') || n.includes('tristana') ||
        n.includes('vayne') || n.includes('ziggs') || n.includes('amumu') || n.includes('nocturne')
    )) return true;

    // 4. Linhas de Essência Mítica (Cinzas, Cristalis, Vitoriosas)
    if (n.includes('ashen') || n.includes('das cinzas') || n.includes('crystalis') || n.includes('cristalis')) return true;
    if (n.includes('victorious') || n.includes('vitoriosa')) return true;
    if (n.includes('soulstealer') || n.includes('ladra de almas') || n.includes('dreadnova darius') || n.includes('darius nova do pavor')) return true;

    // 5. Limitadas / PAX
    if (n.includes('pax ') || n.includes('neo pax') || n.includes('black alistar') || n.includes('silver kayle') || n.includes('young ryze') || n.includes('human ryze') || n.includes('ufo corki') || n.includes('king rammus') || n.includes('judgement kayle') || n.includes('urf the manatee') || n.includes('triumphant ryze') || n.includes('championship riven 2012') || n.includes('riot squad singed')) return true;

    return false;
}

// Map of known Legendary (1820 RP) and Ultimate (3250 RP) skins
const knownLegendaries = new Set([
    'battle dove seraphine', 'seraphine ave de batalha',
    'heartsong seraphine', 'seraphine hino ao amor',
    'project: vane', 'projeto: vayne',
    'project: mordekaiser', 'projeto: mordekaiser',
    'project: pyke', 'projeto: pyke',
    'project: renekton', 'projeto: renekton',
    'project: ashe', 'projeto: ashe',
    'nightbringer yasuo', 'yasuo emissário da escuridão',
    'god fist lee sin', 'lee sin punhos divinos',
    'storm dragon lee sin', 'lee sin dragão da tormenta',
    'spirit blossom ahri', 'ahri florescer espiritual',
    'star guardian ahri', 'ahri guardiã estelar',
    'star guardian jinx', 'jinx guardiã estelar',
    'star guardian kaisa', 'kai\'sa guardiã estelar',
    'star guardian akali', 'akali guardiã estelar',
    'cosmic lux', 'lux cósmica',
    'dark cosmic lux', 'lux estrela negra',
    'dark cosmic jhin', 'jhin estrela negra',
    'dark star thresh', 'thresh estrela negra',
    'spirit blossom thresh', 'thresh florescer espiritual',
    'battle academia ezreal', 'ezreal academia de batalha',
    'pulsefire caitlyn', 'caitlyn curtindo o verão',
    'battle queen katarina', 'katarina rainha de batalha',
    'coven evelynn', 'evelynn congregação das bruxas',
    'coven morgana', 'morgana congregação das bruxas',
    'dawnbringer riven', 'riven emissária da luz',
    'broken covenant vladimir', 'vladimir pacto quebrado',
    'mecha kingdoms jax', 'jax reinos mecha',
    'high noon lucian', 'lucian velho oeste',
    'high noon senna', 'senna velho oeste',
    'high noon ashe', 'ashe velho oeste',
    'high noon leona', 'leona velho oeste',
    'high noon yone', 'yone velho oeste',
    'soul fighter viego', 'viego lutador espiritual',
    'soul fighter samira', 'samira lutadora espiritual',
    'empyrean pyke', 'pyke empíreo',
    'empyrean varus', 'varus empíreo',
    'winterblessed diana', 'diana bênção do inverno',
    'winterblessed senna', 'senna bênção do inverno',
    'aether wing kayle', 'kayle asas etéreas',
    'galaxy slayer zed', 'zed dizimador de galáxias',
    'odyssey kayn', 'kayn odisseia',
    'blood lord vladimir', 'vladimir lorde do sangue',
    'dunkmaster darius', 'darius mestre da enterrada',
    'god-king garen', 'garen rei do trovão', 'garen deus-rei',
    'god-king darius', 'darius deus-rei',
    'elementalist lux', 'dj sona', 'spirit guard udyr', 'pulsefire ezreal', 'gun goddess miss fortune',
    'k/da all out seraphine', 'k/da all out seraphine indie', 'k/da all out seraphine superstar', 'k/da all out seraphine rising star'
]);

const knownUltimates = new Set([
    'elementalist lux', 'lux elementalista',
    'dj sona',
    'spirit guard udyr', 'udyr guardião espiritual',
    'pulsefire ezreal', 'ezreal pulsefire',
    'gun goddess miss fortune', 'miss fortune vingadora exocósmica',
    'k/da all out seraphine', 'seraphine k/da all out'
]);

async function buildFullCatalog() {
    console.log('[Catalog Builder] 🚀 Sincronizando catálogo completo oficial da Riot Games...');
    const startTime = Date.now();

    // 1. Obter a versão mais recente do LoL
    const verRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
    const version = verRes.data[0];

    // 2. Baixar todos os campeões e skins (PT e EN)
    const [ptRes, enRes] = await Promise.all([
        axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/championFull.json`),
        axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/championFull.json`)
    ]);

    const ptChamps = ptRes.data.data;
    const enChamps = enRes.data.data;

    // 3. Ler catalog.json bruto da Storefront API da Riot para preços exatos
    let rawStoreItems = {};
    let rawCatalog = [];
    const rawCatalogPath = path.join(__dirname, '../lol_giftapi-main/catalog.json');
    if (fs.existsSync(rawCatalogPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(rawCatalogPath, 'utf8'));
            if (Array.isArray(raw)) {
                rawCatalog = raw;
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

    const catalogPt = { Skins: {}, Chromas: {}, Champions: {}, Passes: {}, Loot: {}, Emotes: {}, Icons: {}, Wards: {}, Others: {} };
    const catalogEn = { Skins: {}, Chromas: {}, Champions: {}, Passes: {}, Loot: {}, Emotes: {}, Icons: {}, Wards: {}, Others: {} };

    // 4. Processar todos os campeões e skins do Data Dragon
    for (const champKey in ptChamps) {
        const ptC = ptChamps[champKey];
        const enC = enChamps[champKey] || ptC;

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

        if (ptC.skins && Array.isArray(ptC.skins)) {
            ptC.skins.forEach((skinPt, idx) => {
                if (skinPt.num === 0) return; // Pular skin padrão (default)
                const skinEn = enC.skins ? enC.skins[idx] || skinPt : skinPt;

                const namePt = skinPt.name === 'default' ? `${champPtName} Padrão` : skinPt.name;
                const nameEn = skinEn.name === 'default' ? `${champEnName} Default` : skinEn.name;
                const skinId = skinPt.id;

                // FILTRAR SKINS MÍTICAS / PRESTÍGIO / LIMITADAS (NÃO PRESENTEEÁVEIS VIA RP)
                if (isUnpurchasableOrMythic(namePt) || isUnpurchasableOrMythic(nameEn)) {
                    return; // NÃO ADICIONAR NO CATÁLOGO!
                }

                const isChroma = namePt.includes('(') && namePt.includes(')');
                const storeMatchPt = rawStoreItems[namePt.toLowerCase().trim()];
                const storeMatchEn = rawStoreItems[nameEn.toLowerCase().trim()];

                let priceRp = isChroma ? 290 : 1350;
                let offerId = (storeMatchPt && storeMatchPt.offerId) || (storeMatchEn && storeMatchEn.offerId) || `skin_${skinId}`;

                if (storeMatchPt && storeMatchPt.priceRp) {
                    priceRp = storeMatchPt.priceRp;
                } else if (storeMatchEn && storeMatchEn.priceRp) {
                    priceRp = storeMatchEn.priceRp;
                } else {
                    // Preço de acordo com categoria
                    const cleanEn = nameEn.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
                    const cleanPt = namePt.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
                    if (isChroma) {
                        priceRp = 290;
                    } else if (knownUltimates.has(cleanEn) || knownUltimates.has(cleanPt) || cleanEn.includes('ultimate')) {
                        priceRp = 3250;
                    } else if (knownLegendaries.has(cleanEn) || knownLegendaries.has(cleanPt)) {
                        priceRp = 1820;
                    } else {
                        priceRp = 1350; // Epic default
                    }
                }

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

    // 5. Adicionar Skin e Chroma Bundles da Riot Storefront
    const skinBundlesPt = {};
    const skinBundlesEn = {};

    rawCatalog.forEach(item => {
        const t = (item.inventoryType || '').toUpperCase();
        if (t !== 'BUNDLES' && t !== 'BUNDLE') return;

        const nameEn = item.localizations?.en_US?.name || item.localizations?.pt_BR?.name;
        if (!nameEn) return;
        const namePt = item.localizations?.pt_BR?.name || nameEn;
        const n = nameEn.toLowerCase();

        // Excluir espólios, passes, hextec, baús, chaves, clash, tft, etc.
        if (n.includes('pass') || n.includes('orb') || n.includes('capsule') || n.includes('chest') || n.includes('key') || n.includes('hextech') || n.includes('clash') || n.includes('starter') || n.includes('tft') || n.includes('mystery') || n.includes('arena') || n.includes('choncc') || n.includes('boba') || n.includes('sanctum') || n.includes('tribe bundle') || n.includes('starship bundle') || n.includes('planet bundle')) return;
        if (isUnpurchasableOrMythic(nameEn) || isUnpurchasableOrMythic(namePt)) return;

        const price = item.prices?.[0]?.cost || 0;
        skinBundlesPt[namePt] = {
            offer_id: item.offerId || `bundle_${item.itemId}`,
            item_id: item.itemId,
            price_rp: price,
            inventory_type: 'BUNDLES'
        };
        skinBundlesEn[nameEn] = {
            offer_id: item.offerId || `bundle_${item.itemId}`,
            item_id: item.itemId,
            price_rp: price,
            inventory_type: 'BUNDLES'
        };
    });

    catalogPt.Bundles = skinBundlesPt;
    catalogEn.Bundles = skinBundlesEn;

    // 6. Adicionar Passes e Espólios Presenteáveis
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

    // 7. Salvar arquivos
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
    const totalBundles = Object.keys(catalogPt.Bundles || {}).length;
    const totalChamps = Object.keys(catalogPt.Champions).length;
    const totalAll = totalSkins + totalChromas + totalBundles + totalChamps + Object.keys(catalogPt.Loot).length;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Catalog Builder] ✅ Sincronização concluída em ${elapsed}s!`);
    console.log(`[Catalog Builder] 📊 Totais: ${totalSkins} Skins (Míticas/Prestígio Removidas), ${totalChromas} Cromas, ${totalBundles} Pacotes de Skins/Cromas, ${totalChamps} Campeões.`);

    return {
        version,
        totalSkins,
        totalChromas,
        totalChamps,
        totalAll,
        elapsed
    };
}

module.exports = { buildFullCatalog };

if (require.main === module) {
    buildFullCatalog();
}
