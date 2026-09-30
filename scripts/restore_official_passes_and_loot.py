import os
import json
import shutil

# Official image mapping
IMAGES = {
    # Hall of Legends 2026
    69901079: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901079_1.png',
    69901075: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901075.png',
    69901076: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901076.png',
    69901077: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901077.png',
    69901078: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901078.png',
    # Season 3: Act I
    69901071: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901071.png',
    69901072: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901072.png',
    69901073: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901073.png',
    # Invocador
    69901067: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901067.png',
    69901068: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901068.png',
    69901069: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901069.png',
    69901070: 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901070.png'
}

PASSES_PT = {
    "Passe Hall of Legends 2026": {
        "offer_id": "1a335511-a661-4d91-8522-abd3bc4f466c",
        "item_id": 69901079,
        "price_rp": 1950,
        "regular_rp": 1950,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901079],
        "is_available": True,
        "status": "available"
    },
    "Passe da 3ª Temporada – Ato I": {
        "offer_id": "3c93e239-7195-4682-ac56-cb3510a8314f",
        "item_id": 69901071,
        "price_rp": 1650,
        "regular_rp": 1650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901071],
        "is_available": True,
        "status": "available"
    },
    "Pacote Passe da 3ª Temporada – Ato I": {
        "offer_id": "33115367-9c70-4074-8a67-fa72271ac2d0",
        "item_id": 69901072,
        "price_rp": 2650,
        "regular_rp": 2650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901072],
        "is_available": True,
        "status": "available"
    },
    "Pacote Passe Premium da 3ª Temporada – Ato I": {
        "offer_id": "6c82f475-023d-4968-a56c-e689c52b97ff",
        "item_id": 69901073,
        "price_rp": 3650,
        "regular_rp": 3650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901073],
        "is_available": True,
        "status": "available"
    }
}

PASSES_EN = {
    "Hall of Legends 2026 Pass": {
        "offer_id": "1a335511-a661-4d91-8522-abd3bc4f466c",
        "item_id": 69901079,
        "price_rp": 1950,
        "regular_rp": 1950,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901079],
        "is_available": True,
        "status": "available"
    },
    "Season 3: Act I Pass": {
        "offer_id": "3c93e239-7195-4682-ac56-cb3510a8314f",
        "item_id": 69901071,
        "price_rp": 1650,
        "regular_rp": 1650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901071],
        "is_available": True,
        "status": "available"
    },
    "Season 3: Act I Pass Bundle": {
        "offer_id": "33115367-9c70-4074-8a67-fa72271ac2d0",
        "item_id": 69901072,
        "price_rp": 2650,
        "regular_rp": 2650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901072],
        "is_available": True,
        "status": "available"
    },
    "Season 3: Act I Premium Pass Bundle": {
        "offer_id": "6c82f475-023d-4968-a56c-e689c52b97ff",
        "item_id": 69901073,
        "price_rp": 3650,
        "regular_rp": 3650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901073],
        "is_available": True,
        "status": "available"
    }
}

LOOT_PT = {
    "Orbe Hall of Legends 2026": {
        "offer_id": "e5104b4f-1caa-4390-8268-064458af8ec3",
        "item_id": 69901075,
        "price_rp": 250,
        "regular_rp": 250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901075],
        "is_available": True,
        "status": "available"
    },
    "Pacote de Orbes Deluxe Hall of Legends 2026": {
        "offer_id": "5c4f967b-a28d-440e-abca-e6be04a5c530",
        "item_id": 69901076,
        "price_rp": 2500,
        "regular_rp": 2500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901076],
        "is_available": True,
        "status": "available"
    },
    "Pacote de Orbes Premium Hall of Legends 2026": {
        "offer_id": "ee0ff019-d562-4eef-af94-1412bdc58159",
        "item_id": 69901077,
        "price_rp": 6250,
        "regular_rp": 6250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901077],
        "is_available": True,
        "status": "available"
    },
    "Pacote de Orbes Mega Hall of Legends 2026": {
        "offer_id": "a7c18a88-9322-4ec1-81a0-45174f7db480",
        "item_id": 69901078,
        "price_rp": 12500,
        "regular_rp": 12500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901078],
        "is_available": True,
        "status": "available"
    },
    "Orbe do Invocador": {
        "offer_id": "71bc5ad9-abce-4dea-953e-cfb908475802",
        "item_id": 69901067,
        "price_rp": 250,
        "regular_rp": 250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901067],
        "is_available": True,
        "status": "available"
    },
    "Pacote de Orbes Deluxe do Invocador": {
        "offer_id": "95056487-39ef-447c-a513-97b9e4ce1f26",
        "item_id": 69901068,
        "price_rp": 2500,
        "regular_rp": 2500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901068],
        "is_available": True,
        "status": "available"
    },
    "Pacote de Orbes Premium do Invocador": {
        "offer_id": "a57e075b-f79b-4c1a-a74b-5a12bb64bb8d",
        "item_id": 69901069,
        "price_rp": 6250,
        "regular_rp": 6250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901069],
        "is_available": True,
        "status": "available"
    },
    "Pacote de Orbes Mega do Invocador": {
        "offer_id": "7e1a069f-024d-45ae-851e-7a6d8444762c",
        "item_id": 69901070,
        "price_rp": 12500,
        "regular_rp": 12500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901070],
        "is_available": True,
        "status": "available"
    },
    "Baú Hextec": {
        "offer_id": "3a24fd7a-1fcc-4861-a146-e0c2ec5ff646",
        "item_id": 1,
        "parent_id": None,
        "price_rp": 125,
        "regular_rp": 125,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "HEXTECH_CRAFTING",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    },
    "Chave Hextec": {
        "offer_id": "f60cd2c5-4d55-49ef-b9fb-4bb1f196dd80",
        "item_id": 3,
        "parent_id": None,
        "price_rp": 125,
        "regular_rp": 125,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "HEXTECH_CRAFTING",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/hexkitkat_key_490px.png",
        "is_available": True,
        "status": "available"
    },
    "Presente - Skin Misteriosa": {
        "offer_id": "79b0d3cc-5fd0-4cbd-a986-54d2d1e5c9e2",
        "item_id": 1,
        "parent_id": None,
        "price_rp": 490,
        "regular_rp": 490,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "MYSTERY",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/season3_2026_act1_mysteryskin.png",
        "is_available": True,
        "status": "available"
    },
    "Presente - Campeão Misterioso": {
        "offer_id": "526ee5a2-9c99-4f68-b65d-1b7c81c0d6b4",
        "item_id": 3,
        "parent_id": None,
        "price_rp": 490,
        "regular_rp": 490,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "MYSTERY",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/championpermanent_490x490.png",
        "is_available": True,
        "status": "available"
    },
    "Presente - Baú Misterioso": {
        "offer_id": "1dac545d-6ba1-472e-b800-83f936ec5da9",
        "item_id": 4,
        "parent_id": None,
        "price_rp": 790,
        "regular_rp": 790,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "MYSTERY",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    }
}

LOOT_EN = {
    "Hall of Legends 2026 Orb": {
        "offer_id": "e5104b4f-1caa-4390-8268-064458af8ec3",
        "item_id": 69901075,
        "price_rp": 250,
        "regular_rp": 250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901075],
        "is_available": True,
        "status": "available"
    },
    "Hall of Legends 2026 Deluxe Orb Bundle": {
        "offer_id": "5c4f967b-a28d-440e-abca-e6be04a5c530",
        "item_id": 69901076,
        "price_rp": 2500,
        "regular_rp": 2500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901076],
        "is_available": True,
        "status": "available"
    },
    "Hall of Legends 2026 Premium Orb Bundle": {
        "offer_id": "ee0ff019-d562-4eef-af94-1412bdc58159",
        "item_id": 69901077,
        "price_rp": 6250,
        "regular_rp": 6250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901077],
        "is_available": True,
        "status": "available"
    },
    "Hall of Legends 2026 Mega Orb Bundle": {
        "offer_id": "a7c18a88-9322-4ec1-81a0-45174f7db480",
        "item_id": 69901078,
        "price_rp": 12500,
        "regular_rp": 12500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901078],
        "is_available": True,
        "status": "available"
    },
    "Summoner's Orb": {
        "offer_id": "71bc5ad9-abce-4dea-953e-cfb908475802",
        "item_id": 69901067,
        "price_rp": 250,
        "regular_rp": 250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901067],
        "is_available": True,
        "status": "available"
    },
    "Summoner's Deluxe Orb Bundle": {
        "offer_id": "95056487-39ef-447c-a513-97b9e4ce1f26",
        "item_id": 69901068,
        "price_rp": 2500,
        "regular_rp": 2500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901068],
        "is_available": True,
        "status": "available"
    },
    "Summoner's Premium Orb Bundle": {
        "offer_id": "a57e075b-f79b-4c1a-a74b-5a12bb64bb8d",
        "item_id": 69901069,
        "price_rp": 6250,
        "regular_rp": 6250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901069],
        "is_available": True,
        "status": "available"
    },
    "Summoner's Mega Orb Bundle": {
        "offer_id": "7e1a069f-024d-45ae-851e-7a6d8444762c",
        "item_id": 69901070,
        "price_rp": 12500,
        "regular_rp": 12500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": IMAGES[69901070],
        "is_available": True,
        "status": "available"
    },
    "Hextech Chest": {
        "offer_id": "3a24fd7a-1fcc-4861-a146-e0c2ec5ff646",
        "item_id": 1,
        "parent_id": None,
        "price_rp": 125,
        "regular_rp": 125,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "HEXTECH_CRAFTING",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    },
    "Hextech Key": {
        "offer_id": "f60cd2c5-4d55-49ef-b9fb-4bb1f196dd80",
        "item_id": 3,
        "parent_id": None,
        "price_rp": 125,
        "regular_rp": 125,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "HEXTECH_CRAFTING",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/hexkitkat_key_490px.png",
        "is_available": True,
        "status": "available"
    },
    "Mystery Skin Gift": {
        "offer_id": "79b0d3cc-5fd0-4cbd-a986-54d2d1e5c9e2",
        "item_id": 1,
        "parent_id": None,
        "price_rp": 490,
        "regular_rp": 490,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "MYSTERY",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/season3_2026_act1_mysteryskin.png",
        "is_available": True,
        "status": "available"
    },
    "Mystery Champion Gift": {
        "offer_id": "526ee5a2-9c99-4f68-b65d-1b7c81c0d6b4",
        "item_id": 3,
        "parent_id": None,
        "price_rp": 490,
        "regular_rp": 490,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "MYSTERY",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/championpermanent_490x490.png",
        "is_available": True,
        "status": "available"
    },
    "Mystery Chest Gift": {
        "offer_id": "1dac545d-6ba1-472e-b800-83f936ec5da9",
        "item_id": 4,
        "parent_id": None,
        "price_rp": 790,
        "regular_rp": 790,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "MYSTERY",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    }
}

paths_to_update = [
    ('config/catalog_cache_pt.json', PASSES_PT, LOOT_PT),
    ('config/catalog_cache_en.json', PASSES_EN, LOOT_EN),
    ('python_backend/catalog_cache_pt.json', PASSES_PT, LOOT_PT),
    ('python_backend/catalog_cache_en.json', PASSES_EN, LOOT_EN),
    ('python_backend/api_files/catalog_cache_pt.json', PASSES_PT, LOOT_PT),
    ('python_backend/api_files/catalog_cache_en.json', PASSES_EN, LOOT_EN),
    (r'C:\Users\jeff\Documents\lol_giftapi-main\catalog_cache_pt.json', PASSES_PT, LOOT_PT),
    (r'C:\Users\jeff\Documents\lol_giftapi-main\catalog_cache_en.json', PASSES_EN, LOOT_EN),
    (r'C:\Users\jeff\Documents\lol_giftapi-main\python_backend\catalog_cache_pt.json', PASSES_PT, LOOT_PT),
    (r'C:\Users\jeff\Documents\lol_giftapi-main\python_backend\catalog_cache_en.json', PASSES_EN, LOOT_EN)
]

for p, passes, loot in paths_to_update:
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            cat = json.load(f)
        cat['Passes'] = passes
        cat['Loot'] = loot
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(cat, f, indent=2, ensure_ascii=False)
        print(f"Updated {p} ({len(passes)} passes, {len(loot)} loot)")

# Also sync featured_bundles.json
src_feat = 'config/featured_bundles.json'
feat_dests = [
    'python_backend/featured_bundles.json',
    r'C:\Users\jeff\Documents\lol_giftapi-main\featured_bundles.json',
    r'C:\Users\jeff\Documents\lol_giftapi-main\config\featured_bundles.json',
    r'C:\Users\jeff\Documents\lol_giftapi-main\python_backend\featured_bundles.json'
]
for dst in feat_dests:
    if os.path.exists(os.path.dirname(dst)):
        shutil.copy2(src_feat, dst)
        print(f"Synced {src_feat} -> {dst}")

print("\nDone restoring official passes and loot!")
