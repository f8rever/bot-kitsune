const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'table',
    description: 'Exibe as tabelas de preços de Skins e Loots da loja Kitsune.',
    async execute(interaction) {
        let storeConfig = {};
        const configPath = path.join(__dirname, '../../config/loja.json');
        try {
            if (fs.existsSync(configPath)) {
                storeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch(e) {}

        const globalDiscount = storeConfig.promocao_porcentagem || 70;
        const skinsDiscount = storeConfig.desconto_skins !== undefined ? storeConfig.desconto_skins : globalDiscount;
        const lootDiscount = storeConfig.desconto_chests !== undefined ? storeConfig.desconto_chests : globalDiscount;
        const passesDiscount = storeConfig.desconto_passes !== undefined ? storeConfig.desconto_passes : globalDiscount;

        const skinsMult = (100 - skinsDiscount) / 100;
        const lootMult = (100 - lootDiscount) / 100;
        const passesMult = (100 - passesDiscount) / 100;

        const tableSkinsEmbed = new EmbedBuilder()
            .setTitle(`🔥 PREÇOS DE SKINS (${skinsDiscount}% OFF)`)
            .setColor('#F59E0B')
            .setDescription(`Abaixo está a tabela oficial de preços de skins com **${skinsDiscount}% DE DESCONTO** em Euro (€)!`)
            .addFields(
                { name: '🟢 Skin 750 RP', value: `De ~~€4.50~~ por apenas **€${(750 * 0.0060 * skinsMult).toFixed(2)}**`, inline: true },
                { name: '🔵 Skin 975 RP', value: `De ~~€5.85~~ por apenas **€${(975 * 0.0060 * skinsMult).toFixed(2)}**`, inline: true },
                { name: '🟣 Skin Épica 1350 RP', value: `De ~~€8.10~~ por apenas **€${(1350 * 0.0060 * skinsMult).toFixed(2)}**`, inline: true },
                { name: '🟠 Skin Lendária 1820 RP', value: `De ~~€10.92~~ por apenas **€${(1820 * 0.0060 * skinsMult).toFixed(2)}**`, inline: true },
                { name: '🔴 Skin Ultimate 3250 RP', value: `De ~~€19.50~~ por apenas **€${(3250 * 0.0060 * skinsMult).toFixed(2)}**`, inline: true }
            )
            .setImage(storeConfig.banners?.skins || 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Samira_16.jpg')
            .setFooter({ text: 'Kitsune Store • Tabela de Skins' });

        const tableLootsEmbed = new EmbedBuilder()
            .setTitle('🎁 PREÇOS DE LOOTS & ORBES')
            .setColor('#10B981')
            .setDescription(`Orbes, baús e passes de evento com entrega imediata em Euro (€)!`)
            .addFields(
                { name: '📦 1x Orbe / Baú (250 RP)', value: `Apenas **€${(250 * 0.0060 * lootMult).toFixed(2)}** (desc: ${lootDiscount}%)`, inline: true },
                { name: '📦 5x Orbes + Baú (1250 RP)', value: `Apenas **€${(1250 * 0.0060 * lootMult).toFixed(2)}** (desc: ${lootDiscount}%)`, inline: true },
                { name: '📦 10x Orbes + Baú (2500 RP)', value: `Apenas **€${(2500 * 0.0060 * lootMult).toFixed(2)}** (desc: ${lootDiscount}%)`, inline: true },
                { name: '🎟️ Passe de Evento (1650 RP)', value: `Apenas **€${(1650 * 0.0060 * passesMult).toFixed(2)}** (desc: ${passesDiscount}%)`, inline: true }
            )
            .setImage(storeConfig.banners?.loots || 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yone_26.jpg')
            .setFooter({ text: 'Kitsune Store • Tabela de Loots' });

        return interaction.reply({ embeds: [tableSkinsEmbed, tableLootsEmbed], ephemeral: true });
    }
};
