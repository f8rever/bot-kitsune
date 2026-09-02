require('dotenv').config();
const { MongoClient } = require('mongodb');

const DEFAULT_MONGO_URI = "mongodb+srv://monarch:dias1999@cluster0.zwknr9a.mongodb.net/gift_api_keys?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "kitsune_bot";

async function organizeAndIndexMongo() {
  const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`🍃 Conectado ao MongoDB Atlas no banco [${DB_NAME}]. Organizando coleções e criando índices...`);

    // 1. bot_configurations: index único em configType
    const botConfigCol = db.collection('bot_configurations');
    await botConfigCol.createIndex({ configType: 1 }, { unique: true, name: 'uniq_config_type' });
    console.log('✅ [bot_configurations] Índice único criado em configType');

    // 2. riot_accounts: index único em accountName
    const riotAccCol = db.collection('riot_accounts');
    await riotAccCol.createIndex({ accountName: 1 }, { unique: true, name: 'uniq_account_name' });
    console.log('✅ [riot_accounts] Índice único criado em accountName');

    // 3. invites: index composto único em guildId + userId
    const invitesCol = db.collection('invites');
    await invitesCol.createIndex({ guildId: 1, userId: 1 }, { unique: true, name: 'uniq_guild_user_invites' });
    console.log('✅ [invites] Índice composto único criado em guildId + userId');

    // 4. member_joins: index composto único em guildId + memberId
    const joinsCol = db.collection('member_joins');
    await joinsCol.createIndex({ guildId: 1, memberId: 1 }, { unique: true, name: 'uniq_guild_member_join' });
    console.log('✅ [member_joins] Índice composto único criado em guildId + memberId');

    // 5. verified_members: index composto único em guildId + userId
    const verifiedCol = db.collection('verified_members');
    await verifiedCol.createIndex({ guildId: 1, userId: 1 }, { unique: true, name: 'uniq_guild_user_verified' });
    console.log('✅ [verified_members] Índice composto único criado em guildId + userId');

    // 6. gift_logs: index em timestamp para histórico e relatórios rápidos
    const giftLogsCol = db.collection('gift_logs');
    await giftLogsCol.createIndex({ timestamp: -1 }, { name: 'idx_gift_timestamp' });
    await giftLogsCol.createIndex({ purchaserPuuid: 1 }, { name: 'idx_gift_purchaser' });
    console.log('✅ [gift_logs] Índices criados para histórico de presentes');

    console.log('\n🎉 Organização e otimização do MongoDB Atlas concluídas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao organizar MongoDB:', err.message);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  organizeAndIndexMongo();
}

module.exports = { organizeAndIndexMongo };
