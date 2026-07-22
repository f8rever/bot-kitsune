const { EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.GuildMemberAdd, // Evento: Membro Entrou
    async execute(member) {
        const dbPath = path.join(__dirname, '../database/database.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

        // 1. Enviar mensagem de Boas-Vindas
        // Procure um canal chamado 'boas-vindas' ou use o primeiro do servidor
        const canal = member.guild.channels.cache.find(c => c.name.includes('boas-vindas')) || member.guild.systemChannel;

        if (canal) {
            const embed = new EmbedBuilder()
                .setTitle('👋 Bem-vindo(a) ao Servidor!')
                .setDescription(`Olá ${member}, que bom ter você aqui! Agora somos **${member.guild.memberCount}** membros.`)
                .setColor(db.config.cor || '#FF4500')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setImage('https://i.imgur.com/your-welcome-image.png') // Opcional: link de um GIF/Imagem legal
                .setFooter({ text: `ID do Usuário: ${member.id}` })
                .setTimestamp();

            canal.send({ embeds: [embed] });
        }

        // 2. Dar Cargo Automático (Autorole)
        // O bot vai tentar dar o cargo definido no banco de dados ou o cargo 'Membro'
        const nomeCargo = db.config.cargo_verif || 'Membro';
        const cargo = member.guild.roles.cache.find(r => r.name === nomeCargo);

        if (cargo) {
            member.roles.add(cargo).catch(e => console.log("Erro ao dar cargo: " + e));
        }
    },
};