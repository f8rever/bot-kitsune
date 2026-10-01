const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const URI = process.env.MONGO_URI || "mongodb+srv://monarch:dias1999@cluster0.zwknr9a.mongodb.net/gift_api_keys?retryWrites=true&w=majority&appName=Cluster0";

async function push() {
    console.log('[Mongo Push] 🚀 Conectando ao MongoDB Atlas...');
    const client = new MongoClient(URI);
    await client.connect();
    const db = client.db('kitsune_bot');
    const col = db.collection('bot_configurations');

    const emojisPath = path.join(__dirname, '..', 'config', 'emojis.json');
    const embedsPath = path.join(__dirname, '..', 'config', 'embeds.json');

    const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));
    const embeds = JSON.parse(fs.readFileSync(embedsPath, 'utf8'));

    await col.updateOne(
        { configType: 'emojis' },
        { $set: { data: emojis, updatedAt: new Date() } },
        { upsert: true }
    );
    console.log('✅ Updated emojis in MongoDB Atlas kitsune_bot.bot_configurations!');

    await col.updateOne(
        { configType: 'embeds' },
        { $set: { data: embeds, updatedAt: new Date() } },
        { upsert: true }
    );
    console.log('✅ Updated embeds in MongoDB Atlas kitsune_bot.bot_configurations!');

    // Verification
    const emCheck = await col.findOne({ configType: 'emojis' });
    console.log('New Mongo emojis.ticket.regiao:', emCheck.data?.ticket?.regiao);
    console.log('New Mongo emojis.utilidades.carregando:', emCheck.data?.utilidades?.carregando);

    const embCheck = await col.findOne({ configType: 'embeds' });
    console.log('New Mongo embeds.ticket_order_received.title:', embCheck.data?.ticket_order_received?.title);

    await client.close();
    console.log('[Mongo Push] 🎉 Concluído com sucesso!');
}

push().catch(console.error);
