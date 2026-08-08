import sys
import datetime
import certifi
from pymongo import MongoClient

URI = "mongodb+srv://monarch:dias1999@cluster0.zwknr9a.mongodb.net/gift_api_keys?retryWrites=true&w=majority&appName=Cluster0"

def create_key(username, key, days=365, balance=999999):
    client = MongoClient(URI, tlsCAFile=certifi.where())
    db = client.gift_api_keys
    
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=days)
    
    doc = {
        "users_api": username,
        "key_api": key,
        "expires_at": expires_at,
        "balance": int(balance),
        "sessions": []
    }
    
    result = db.users_key.update_one(
        {"users_api": username},
        {"$set": doc},
        upsert=True
    )
    print(f"User/Key created successfully!\n  Username: {username}\n  Key: {key}\n  Expires: {expires_at.strftime('%Y-%m-%d')}\n  Balance: {balance} RP")

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        user = sys.argv[1]
        key = sys.argv[2]
        days = int(sys.argv[3]) if len(sys.argv) > 3 else 365
        balance = int(sys.argv[4]) if len(sys.argv) > 4 else 999999
        create_key(user, key, days, balance)
    else:
        # Default create monarch / monarch
        create_key("monarch", "monarch", 3650, 9999999)
