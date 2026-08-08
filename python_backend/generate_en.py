import json, asyncio
from api_files.riot_tokens import RiotAuth

async def run():
    auth = RiotAuth('a', 'b', None, None)
    auth.locale = 'en_US'
    auth.catalog_map = {}
    catalog = json.load(open('catalog.json', encoding='utf-8'))
    
    for item in catalog:
        offer_id = item.get("offerId", "Null")
        item_id = item.get("itemId", "Null")
        
        name = "Null"
        locs = item.get("localizations", {})
        if 'en_US' in locs and "name" in locs['en_US']:
            name = locs['en_US']["name"]
        elif locs:
            first_loc = next(iter(locs.values()))
            if isinstance(first_loc, dict) and "name" in first_loc:
                name = first_loc["name"]
                
        price_rp = "Null"
        price_ip = "Null"
        if item.get("prices") and isinstance(item["prices"], list):
            for price in item["prices"]:
                if price.get("currency") == "RP":
                    price_rp = price.get("cost", "Null")
                if price.get("currency") == "IP":
                    price_ip = price.get("cost", "Null")
                    
        sale = item.get("sale")
        if sale:
            for sale_price in sale.get("prices", []):
                if sale_price.get("currency") == "RP":
                    price_rp = sale_price.get("cost", "Null")
                if sale_price.get("currency") == "IP":
                    price_ip = sale_price.get("cost", "Null")
                    
        category = item.get("inventoryType", "")
        sub_category = item.get("subInventoryType", "")

        if category == "CHAMPION_SKIN":
            display_category = "Chroma" if sub_category == "RECOLOR" else "Skin"
        elif category == "CHAMPION":
            display_category = "Champion"
        elif category in ["BUNDLES", "EVENT_PASS"]:
            name_lower = item.get("localizations", {}).get("en_US", {}).get("name", "").lower()
            if "pass" in name_lower:
                display_category = "Pass"
            else:
                display_category = "Hextech" if sub_category == "HEXTECH_BUNDLE" else "Bundle"
        elif category == "EMOTE":
            display_category = "Emote"
        elif category == "SUMMONER_ICON":
            display_category = "Icon"
        elif category == "WARD_SKIN":
            display_category = "Ward"
        elif category == "STATSTONE":
            display_category = "Eternals"
        elif category == "COMPANION":
            display_category = "LittleLegends"
        elif category in ["TFT_DAMAGE_SKIN", "TFT_MAP_SKIN"]:
            display_category = "TFTArena"
        elif category == "BOOST":
            display_category = "Boost"
        elif category == "MYSTERY":
            display_category = "Mystery"
        elif category == "HEXTECH_CRAFTING":
            display_category = "Hextech"
        else:
            display_category = "Others"
        item_data = {
            "offer_id": offer_id,
            "item_id": item_id,
            "price_rp": price_rp,
            "price_ip": price_ip,
            "inventory_type": category,
        }
        

        if display_category not in auth.catalog_map:
            auth.catalog_map[display_category] = {}
        auth.catalog_map[display_category][name] = item_data
        
    with open('catalog_cache_en.json', 'w', encoding='utf-8', errors='ignore') as f:
        json.dump(auth.catalog_map, f)
    print("English catalog successfully generated from catalog.json!")

asyncio.run(run())
