import pymongo
client = pymongo.MongoClient('mongodb+srv://monarch:dias1999@cluster0.zwknr9a.mongodb.net/gift_api_keys?retryWrites=true&w=majority&appName=Cluster0')
db = client['gift_api_keys']
res = db['users_key'].update_one({'key_api': 'dias'}, {'$set': {'avatar_url_jeff': 'test_url'}})
print('Modified count:', res.modified_count)
