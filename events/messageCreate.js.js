const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const dbPath = path.join(__dirname, '../database/database.json');
        let db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const userId = message.author.id;

        // --- SISTEMA DE AFK (VOLTA) ---
        if (db.usuarios[userId] && db.usuarios[userId].afk) {
            delete db.usuarios[userId].afk;
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            message.reply(`👋 Bem-vindo de volta **${message.author.username}**! Removi seu estado AFK.`).then(msg => setTimeout(() => msg.delete(), 5000));
        }

        // --- SISTEMA DE AFK (AVISO DE MENÇÃO) ---
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(mencionado => {
                if (db.usuarios[mencionado.id] && db.usuarios[mencionado.id].afk) {
                    message.reply(`💤 O usuário **${mencionado.username}** está AFK: *${db.usuarios[mencionado.id].afk}*`);
                }
            });
        }

        // --- SISTEMA DE XP ---
        if (!db.usuarios[userId]) db.usuarios[userId] = { xp: 0, nivel: 1, moedas: 0 };
        
        const xpGanho = Math.floor(Math.random() * 11) + 5;
        db.usuarios[userId].xp += xpGanho;

        let proximoNivel = db.usuarios[userId].nivel * 500;
        if (db.usuarios[userId].xp >= proximoNivel) {
            db.usuarios[userId].nivel += 1;
            message.reply(`🎉 **Level Up!** ${message.author} alcançou o nível **${db.usuarios[userId].nivel}**!`);
        }

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    },
};