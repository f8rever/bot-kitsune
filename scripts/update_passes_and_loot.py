import json
import os
import shutil

# Paths
ROOT_DIR = r"c:\Users\jeff\Documents\KITSUNE V2 BOT"
CONFIG_PT = os.path.join(ROOT_DIR, "config", "catalog_cache_pt.json")
CONFIG_EN = os.path.join(ROOT_DIR, "config", "catalog_cache_en.json")
BACKEND_PT = os.path.join(ROOT_DIR, "python_backend", "catalog_cache_pt.json")
BACKEND_EN = os.path.join(ROOT_DIR, "python_backend", "catalog_cache_en.json")
FEAT_BUNDLES = os.path.join(ROOT_DIR, "config", "featured_bundles.json")

# 1. Definições Oficiais dos Passes Ativos
PASSES_PT = {
    "Passe do Mundial 2024": {
        "offer_id": "3c93e239-7195-4682-ac56-cb3510a8314f",
        "item_id": 69901071,
        "price_rp": 1650,
        "regular_rp": 1650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_37.jpg",
        "is_available": True,
        "status": "available"
    },
    "Pacote Passe do Mundial 2024": {
        "offer_id": "33115367-9c70-4074-8a67-fa72271ac2d0",
        "item_id": 69901072,
        "price_rp": 2650,
        "regular_rp": 2650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_37.jpg",
        "is_available": True,
        "status": "available"
    },
    "Pacote Passe Premium do Mundial 2024": {
        "offer_id": "6c82f475-023d-4968-a56c-e689c52b97ff",
        "item_id": 69901073,
        "price_rp": 3650,
        "regular_rp": 3650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_37.jpg",
        "is_available": True,
        "status": "available"
    },
    "Passe da Temporada – Ato I": {
        "offer_id": "e7a87fea-67a2-4693-b63e-563cb9136717",
        "item_id": 69901063,
        "price_rp": 1650,
        "regular_rp": 1650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_40.jpg",
        "is_available": True,
        "status": "available"
    },
    "Pacote Passe da Temporada – Ato I": {
        "offer_id": "8ec9e08f-6396-4787-a759-19568538e435",
        "item_id": 69901064,
        "price_rp": 2650,
        "regular_rp": 2650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_40.jpg",
        "is_available": True,
        "status": "available"
    },
    "Pacote Passe Premium da Temporada – Ato I": {
        "offer_id": "5a7908ac-9731-46a2-8c7a-cf294afc1a44",
        "item_id": 69901065,
        "price_rp": 3650,
        "regular_rp": 3650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Tristana_79.jpg",
        "is_available": True,
        "status": "available"
    }
}

PASSES_EN = {
    "Worlds 2024 Pass": {
        "offer_id": "3c93e239-7195-4682-ac56-cb3510a8314f",
        "item_id": 69901071,
        "price_rp": 1650,
        "regular_rp": 1650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_37.jpg",
        "is_available": True,
        "status": "available"
    },
    "Worlds 2024 Pass Bundle": {
        "offer_id": "33115367-9c70-4074-8a67-fa72271ac2d0",
        "item_id": 69901072,
        "price_rp": 2650,
        "regular_rp": 2650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_37.jpg",
        "is_available": True,
        "status": "available"
    },
    "Worlds 2024 Premium Pass Bundle": {
        "offer_id": "6c82f475-023d-4968-a56c-e689c52b97ff",
        "item_id": 69901073,
        "price_rp": 3650,
        "regular_rp": 3650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_37.jpg",
        "is_available": True,
        "status": "available"
    },
    "Season Pass: Act I": {
        "offer_id": "e7a87fea-67a2-4693-b63e-563cb9136717",
        "item_id": 69901063,
        "price_rp": 1650,
        "regular_rp": 1650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_40.jpg",
        "is_available": True,
        "status": "available"
    },
    "Season Pass Bundle: Act I": {
        "offer_id": "8ec9e08f-6396-4787-a759-19568538e435",
        "item_id": 69901064,
        "price_rp": 2650,
        "regular_rp": 2650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_40.jpg",
        "is_available": True,
        "status": "available"
    },
    "Season Premium Pass Bundle: Act I": {
        "offer_id": "5a7908ac-9731-46a2-8c7a-cf294afc1a44",
        "item_id": 69901065,
        "price_rp": 3650,
        "regular_rp": 3650,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Tristana_79.jpg",
        "is_available": True,
        "status": "available"
    }
}

# 2. Definições Oficiais de Loot / Orbes
LOOT_PT = {
    "Orbe do Mundial 2024": {
        "offer_id": "71bc5ad9-abce-4dea-953e-cfb908475802",
        "item_id": 69901067,
        "price_rp": 250,
        "regular_rp": 250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png",
        "is_available": True,
        "status": "available"
    },
    "Pacote de 10 Orbes do Mundial 2024 + 1 Grátis": {
        "offer_id": "95056487-39ef-447c-a513-97b9e4ce1f26",
        "item_id": 69901068,
        "price_rp": 2500,
        "regular_rp": 2500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png",
        "is_available": True,
        "status": "available"
    },
    "Pacote de 25 Orbes do Mundial 2024 + 1 Sacola": {
        "offer_id": "a57e075b-f79b-4c1a-a74b-5a12bb64bb8d",
        "item_id": 69901069,
        "price_rp": 6250,
        "regular_rp": 6250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png",
        "is_available": True,
        "status": "available"
    },
    "Pacote de 50 Orbes do Mundial 2024 + 2 Sacolas": {
        "offer_id": "7e1a069f-024d-45ae-851e-7a6d8444762c",
        "item_id": 69901070,
        "price_rp": 12500,
        "regular_rp": 12500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png",
        "is_available": True,
        "status": "available"
    },
    "Cápsula Esports 2024": {
        "offer_id": "42617dfb-d09f-4318-971c-4382bfdb8371",
        "item_id": 676,
        "price_rp": 750,
        "regular_rp": 750,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/loot_esports2024_capsule_final_490px.png",
        "is_available": True,
        "status": "available"
    },
    "Baú Hextec": {
        "offer_id": "3a24fd7a-1fcc-4861-a146-e0c2ec5ff646",
        "item_id": 1,
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
        "price_rp": 125,
        "regular_rp": 125,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "HEXTECH_CRAFTING",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/hexkitkat_key_490px.png",
        "is_available": True,
        "status": "available"
    },
    "Baú do Mestre Artesão": {
        "offer_id": "84d720ea-d2f1-4f18-bc1c-529a65c97ea1",
        "item_id": 688,
        "price_rp": 165,
        "regular_rp": 165,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "HEXTECH_CRAFTING",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/masterwork_chest_224.png",
        "is_available": True,
        "status": "available"
    },
    "Presente - Skin Misteriosa": {
        "offer_id": "79b0d3cc-5fd0-4cbd-a986-54d2d1e5c9e2",
        "item_id": 1,
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
    "Worlds 2024 Orb": {
        "offer_id": "71bc5ad9-abce-4dea-953e-cfb908475802",
        "item_id": 69901067,
        "price_rp": 250,
        "regular_rp": 250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png",
        "is_available": True,
        "status": "available"
    },
    "10 Worlds 2024 Orbs + 1 Bonus": {
        "offer_id": "95056487-39ef-447c-a513-97b9e4ce1f26",
        "item_id": 69901068,
        "price_rp": 2500,
        "regular_rp": 2500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png",
        "is_available": True,
        "status": "available"
    },
    "25 Worlds 2024 Orbs + 1 Exclusive Bag": {
        "offer_id": "a57e075b-f79b-4c1a-a74b-5a12bb64bb8d",
        "item_id": 69901069,
        "price_rp": 6250,
        "regular_rp": 6250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png",
        "is_available": True,
        "status": "available"
    },
    "50 Worlds 2024 Orbs + 2 Bags": {
        "offer_id": "7e1a069f-024d-45ae-851e-7a6d8444762c",
        "item_id": 69901070,
        "price_rp": 12500,
        "regular_rp": 12500,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png",
        "is_available": True,
        "status": "available"
    },
    "Esports 2024 Capsule": {
        "offer_id": "42617dfb-d09f-4318-971c-4382bfdb8371",
        "item_id": 676,
        "price_rp": 750,
        "regular_rp": 750,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/loot_esports2024_capsule_final_490px.png",
        "is_available": True,
        "status": "available"
    },
    "Hextech Chest": {
        "offer_id": "3a24fd7a-1fcc-4861-a146-e0c2ec5ff646",
        "item_id": 1,
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
        "price_rp": 125,
        "regular_rp": 125,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "HEXTECH_CRAFTING",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/hexkitkat_key_490px.png",
        "is_available": True,
        "status": "available"
    },
    "Masterwork Chest": {
        "offer_id": "84d720ea-d2f1-4f18-bc1c-529a65c97ea1",
        "item_id": 688,
        "price_rp": 165,
        "regular_rp": 165,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "HEXTECH_CRAFTING",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/masterwork_chest_224.png",
        "is_available": True,
        "status": "available"
    },
    "Mystery Skin": {
        "offer_id": "79b0d3cc-5fd0-4cbd-a986-54d2d1e5c9e2",
        "item_id": 1,
        "price_rp": 490,
        "regular_rp": 490,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "MYSTERY",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/season3_2026_act1_mysteryskin.png",
        "is_available": True,
        "status": "available"
    },
    "Mystery Champion": {
        "offer_id": "526ee5a2-9c99-4f68-b65d-1b7c81c0d6b4",
        "item_id": 3,
        "price_rp": 490,
        "regular_rp": 490,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "MYSTERY",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/championpermanent_490x490.png",
        "is_available": True,
        "status": "available"
    },
    "Mystery Chest": {
        "offer_id": "1dac545d-6ba1-472e-b800-83f936ec5da9",
        "item_id": 4,
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

# 3. Pacotes adicionais de Baús e Orbes para a categoria Bundles
BUNDLE_CHESTS_PT = {
    "Pacote de 10 Orbes do Mundial 2024 + 1 Grátis": LOOT_PT["Pacote de 10 Orbes do Mundial 2024 + 1 Grátis"],
    "Pacote de 25 Orbes do Mundial 2024 + 1 Sacola": LOOT_PT["Pacote de 25 Orbes do Mundial 2024 + 1 Sacola"],
    "Pacote de 50 Orbes do Mundial 2024 + 2 Sacolas": LOOT_PT["Pacote de 50 Orbes do Mundial 2024 + 2 Sacolas"],
    "Pacote - 1 Baú Hextec e Chave": {
        "offer_id": "a1a8ecb2-32b0-4598-a56f-876bf5bcfbb1",
        "item_id": 69900001,
        "price_rp": 195,
        "regular_rp": 195,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    },
    "5 Baús e Chaves Hextec + Essência adicional!": {
        "offer_id": "b2b9fdb3-43c1-4609-b670-987cf6cd0cc2",
        "item_id": 69900002,
        "price_rp": 975,
        "regular_rp": 975,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    },
    "10 Baús e Chaves Hextec + 1 conjunto adicional!": {
        "offer_id": "c3ca0ec4-54d2-471a-c781-a98de7de1dd3",
        "item_id": 69900003,
        "price_rp": 1950,
        "regular_rp": 1950,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    },
    "Pacote - 1 Baú do Mestre Artesão e Chave": {
        "offer_id": "d4db1fd5-65e3-482b-d892-ba9ef8ef2ee4",
        "item_id": 69900004,
        "price_rp": 225,
        "regular_rp": 225,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/masterwork_chest_224.png",
        "is_available": True,
        "status": "available"
    },
    "5 Baús do Mestre Artesão e Chaves + Essência!": {
        "offer_id": "e5ec2fe6-76f4-493c-e903-cb0fa9fa3ff5",
        "item_id": 69900005,
        "price_rp": 1125,
        "regular_rp": 1125,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/masterwork_chest_224.png",
        "is_available": True,
        "status": "available"
    },
    "10 Baús do Mestre Artesão e Chaves + 1 conjunto adicional!": {
        "offer_id": "f6fd30f7-8705-4a4d-fa14-dc10ba0b4006",
        "item_id": 69900006,
        "price_rp": 2250,
        "regular_rp": 2250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/masterwork_chest_224.png",
        "is_available": True,
        "status": "available"
    }
}

BUNDLE_CHESTS_EN = {
    "10 Worlds 2024 Orbs + 1 Bonus": LOOT_EN["10 Worlds 2024 Orbs + 1 Bonus"],
    "25 Worlds 2024 Orbs + 1 Exclusive Bag": LOOT_EN["25 Worlds 2024 Orbs + 1 Exclusive Bag"],
    "50 Worlds 2024 Orbs + 2 Bags": LOOT_EN["50 Worlds 2024 Orbs + 2 Bags"],
    "1 Hextech Chest & Key Bundle": {
        "offer_id": "a1a8ecb2-32b0-4598-a56f-876bf5bcfbb1",
        "item_id": 69900001,
        "price_rp": 195,
        "regular_rp": 195,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    },
    "5 Hextech Chests & Keys + Bonus Essence!": {
        "offer_id": "b2b9fdb3-43c1-4609-b670-987cf6cd0cc2",
        "item_id": 69900002,
        "price_rp": 975,
        "regular_rp": 975,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    },
    "10 Hextech Chests & Keys + Bonus Set!": {
        "offer_id": "c3ca0ec4-54d2-471a-c781-a98de7de1dd3",
        "item_id": 69900003,
        "price_rp": 1950,
        "regular_rp": 1950,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png",
        "is_available": True,
        "status": "available"
    },
    "1 Masterwork Chest & Key Bundle": {
        "offer_id": "d4db1fd5-65e3-482b-d892-ba9ef8ef2ee4",
        "item_id": 69900004,
        "price_rp": 225,
        "regular_rp": 225,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/masterwork_chest_224.png",
        "is_available": True,
        "status": "available"
    },
    "5 Masterwork Chests & Keys + Bonus Essence!": {
        "offer_id": "e5ec2fe6-76f4-493c-e903-cb0fa9fa3ff5",
        "item_id": 69900005,
        "price_rp": 1125,
        "regular_rp": 1125,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/masterwork_chest_224.png",
        "is_available": True,
        "status": "available"
    },
    "10 Masterwork Chests & Keys + Bonus Set!": {
        "offer_id": "f6fd30f7-8705-4a4d-fa14-dc10ba0b4006",
        "item_id": 69900006,
        "price_rp": 2250,
        "regular_rp": 2250,
        "sale_rp": None,
        "discount_percent": None,
        "inventory_type": "BUNDLES",
        "icon_url": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/masterwork_chest_224.png",
        "is_available": True,
        "status": "available"
    }
}

# 4. Featured Bundles limpos (Sem o Passe antigo do Faker de 2 anos atrás)
NEW_FEATURED_BUNDLES = [
    {
        "id": 69901071,
        "itemId": 69901071,
        "offerId": "3c93e239-7195-4682-ac56-cb3510a8314f",
        "name": "Passe do Mundial 2024",
        "name_en": "Worlds 2024 Pass",
        "price_rp": 1650,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_37.jpg"
    },
    {
        "id": 69901072,
        "itemId": 69901072,
        "offerId": "33115367-9c70-4074-8a67-fa72271ac2d0",
        "name": "Pacote Passe do Mundial 2024",
        "name_en": "Worlds 2024 Pass Bundle",
        "price_rp": 2650,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_37.jpg"
    },
    {
        "id": 69901073,
        "itemId": 69901073,
        "offerId": "6c82f475-023d-4968-a56c-e689c52b97ff",
        "name": "Pacote Passe Premium do Mundial 2024",
        "name_en": "Worlds 2024 Premium Pass Bundle",
        "price_rp": 3650,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_37.jpg"
    },
    {
        "id": 69901068,
        "itemId": 69901068,
        "offerId": "95056487-39ef-447c-a513-97b9e4ce1f26",
        "name": "Pacote de 10 Orbes do Mundial 2024 + 1 Grátis",
        "name_en": "10 Worlds 2024 Orbs + 1 Bonus",
        "price_rp": 2500,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png"
    },
    {
        "id": 69901069,
        "itemId": 69901069,
        "offerId": "a57e075b-f79b-4c1a-a74b-5a12bb64bb8d",
        "name": "Pacote de 25 Orbes do Mundial 2024 + 1 Sacola",
        "name_en": "25 Worlds 2024 Orbs + 1 Exclusive Bag",
        "price_rp": 6250,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png"
    },
    {
        "id": 69901070,
        "itemId": 69901070,
        "offerId": "7e1a069f-024d-45ae-851e-7a6d8444762c",
        "name": "Pacote de 50 Orbes do Mundial 2024 + 2 Sacolas",
        "name_en": "50 Worlds 2024 Orbs + 2 Bags",
        "price_rp": 12500,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/worlds2024_orb.png"
    },
    {
        "id": 69900003,
        "itemId": 69900003,
        "offerId": "c3ca0ec4-54d2-471a-c781-a98de7de1dd3",
        "name": "10 Baús e Chaves Hextec + 1 conjunto adicional!",
        "name_en": "10 Hextech Chests & Keys + Bonus Set!",
        "price_rp": 1950,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/chest_generic.png"
    },
    {
        "id": 69900006,
        "itemId": 69900006,
        "offerId": "f6fd30f7-8705-4a4d-fa14-dc10ba0b4006",
        "name": "10 Baús do Mestre Artesão e Chaves + 1 conjunto adicional!",
        "name_en": "10 Masterwork Chests & Keys + Bonus Set!",
        "price_rp": 2250,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/masterwork_chest_224.png"
    },
    {
        "id": 99901657,
        "itemId": 99901657,
        "offerId": "247c9f4f-eb89-453f-9725-68f0b190e7ce",
        "name": "Heartsong Seraphine Border Set",
        "name_en": "Heartsong Seraphine Border Set",
        "price_rp": 2720,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Seraphine_69.jpg"
    },
    {
        "id": 79900916,
        "itemId": 79900916,
        "offerId": "bba11048-c7c5-485c-911b-c2fd1fe86bdf",
        "name": "Heartsong Seraphine Chroma Bundle",
        "name_en": "Heartsong Seraphine Chroma Bundle",
        "price_rp": 3035,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Seraphine_69.jpg"
    },
    {
        "id": 79900914,
        "itemId": 79900914,
        "offerId": "4c88ef8b-c17a-4a38-ae16-7435558d58ce",
        "name": "Ocean Song Soraka Chroma Bundle",
        "name_en": "Ocean Song Soraka Chroma Bundle",
        "price_rp": 2795,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Soraka_21.jpg"
    },
    {
        "id": 79900915,
        "itemId": 79900915,
        "offerId": "62981d1c-65df-4795-8fe3-46bdb7ef80e7",
        "name": "Ocean Song Jinx Chroma Bundle",
        "name_en": "Ocean Song Jinx Chroma Bundle",
        "price_rp": 2795,
        "inventoryType": "BUNDLES",
        "iconUrl": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jinx_37.jpg"
    }
]

def update_catalog(file_path, is_en=False):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Substituir Passes
    passes_dict = PASSES_EN if is_en else PASSES_PT
    data["Passes"] = passes_dict

    # 2. Substituir Loot
    loot_dict = LOOT_EN if is_en else LOOT_PT
    data["Loot"] = loot_dict

    # 3. Limpar Bundles de itens obsoletos de Hall of Legends e adicionar os pacotes de orbes/baús
    bundles_to_add = BUNDLE_CHESTS_EN if is_en else BUNDLE_CHESTS_PT
    bundles = data.get("Bundles", {})
    # Remover coleções obsoletas do Faker
    obsolete_keys = [k for k in bundles.keys() if any(w in k.lower() for w in ["lenda ascendida", "lenda imortalizada", "risen legend", "immortalized legend", "hall of legends"])]
    for ok in obsolete_keys:
        del bundles[ok]
    # Injetar pacotes de orbes e baús
    for bk, bv in bundles_to_add.items():
        bundles[bk] = bv
    data["Bundles"] = bundles

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Updated: {file_path}")

# Atualizar todos os catálogos
update_catalog(CONFIG_PT, is_en=False)
update_catalog(CONFIG_EN, is_en=True)
update_catalog(BACKEND_PT, is_en=False)
update_catalog(BACKEND_EN, is_en=True)

# Salvar featured_bundles.json
with open(FEAT_BUNDLES, "w", encoding="utf-8") as f:
    json.dump(NEW_FEATURED_BUNDLES, f, indent=2, ensure_ascii=False)
print(f"Updated: {FEAT_BUNDLES}")
