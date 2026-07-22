const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'tabela',
    description: 'Envia as tabelas de preços da loja',
    async execute(interaction) {
        const configPath = path.join(__dirname, '../../config/config.json');
        const lojaPath = path.join(__dirname, '../../config/loja.json');
        const emojisPath = path.join(__dirname, '../../config/emojis.json'); // Caminho para o novo arquivo

        // Carrega a cor do config
        let cor = '#F43F5E';
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.cor) cor = config.cor;
            }
        } catch (e) { console.error(e); }

        // Carrega os dados da loja
        let loja = {};
        if (fs.existsSync(lojaPath)) {
            loja = JSON.parse(fs.readFileSync(lojaPath, 'utf8'));
        } else {
            return interaction.reply({ content: '❌ Arquivo `loja.json` não encontrado!', flags: 64 });
        }

        // Carrega os emojis centralizados
        let emojis = {};
        if (fs.existsSync(emojisPath)) {
            emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));
        } else {
            return interaction.reply({ content: '❌ Arquivo `emojis.json` não encontrado!', flags: 64 });
        }

        // Função auxiliar para formatar a linha com ou sem desconto
        const formatarLinha = (emoji, item) => {
            if (!item) return '';
            const e = emoji || '❓';
            const rpEmoji = emojis.loja_produtos?.moeda || 'RP';
            const nomeEditado = item.nome.replace(' RP', ` ${rpEmoji}`);
            if (item.desconto) {
                return `${e} ${nomeEditado} - ~~€${item.preco}~~ ${emojis.utilidades?.fogo || '🔥'} **€${item.desconto}**`;
            }
            return `${e} ${nomeEditado} - **€${item.preco}**`;
        };

        // Resgata os banners do JSON
        const bannerSkins = loja.banners?.skins || 'https://i.pinimg.com/1200x/16/bb/3c/16bb3cfa10c2f94b8fd7850eb5afac4b.jpg';
        const bannerLoot = loja.banners?.loot || 'https://i.pinimg.com/736x/33/4a/02/334a02058aab6f668d33f104c7f23b9b.jpg';

        // Usa o customEmbeds para gerar a base das embeds (título, cor, descrição, thumbnails, etc)
        const { buildCustomEmbed } = require('../../utils/customEmbeds.js');
        const embedSkins = buildCustomEmbed('tabela_skins', interaction.client, interaction);
        const embedLoot = buildCustomEmbed('tabela_loot', interaction.client, interaction);

        // Preserva 100% as imagens e títulos configurados no Embed Manager (/embeds)
        if (!embedSkins.data.title) embedSkins.setTitle('👕 Tabela de Skins');
        if (!embedSkins.data.image && loja.banners?.skins) {
            embedSkins.setImage(loja.banners.skins);
        }
        
        if (!embedLoot.data.title) embedLoot.setTitle('📦 Tabela de Loot');
        if (!embedLoot.data.image && loja.banners?.loot) {
            embedLoot.setImage(loja.banners.loot);
        }

        // --- EMBED 1: SKINS (Puxando do emojis.json) ---
        const s = loja.skins;
        const emS = emojis.skins;
        
        const scanDiscounts = (obj) => {
            let maxD = 0;
            if (!obj) return 0;
            Object.values(obj).forEach(item => {
                if (item && item.desconto && parseFloat(item.preco) > 0) {
                    const perc = Math.round(((parseFloat(item.preco) - parseFloat(item.desconto)) / parseFloat(item.preco)) * 100);
                    if (perc > maxD) maxD = perc;
                }
            });
            return maxD;
        };
        const maxDiscountSkins = scanDiscounts(loja.skins);
        const maxDiscountLoot = scanDiscounts(loja.loot);
        
        const discountTextSkins = maxDiscountSkins > 0 ? `> <:cupom:1527368765598204074> **Currently we are with ${maxDiscountSkins}% discount. Enjoy!**\n\n` : '';
        const discountTextLoot = maxDiscountLoot > 0 ? `> <:cupom:1527368765598204074> **Currently we are with ${maxDiscountLoot}% discount. Enjoy!**\n\n` : '';

        const textSkins = discountTextSkins + [
            formatarLinha(emS.ultimate, s.ultimate),
            formatarLinha(emS.mythic, s.mythic),
            formatarLinha(emS.legendary, s.legendary),
            formatarLinha(emS.epic, s.epic),
            formatarLinha(emS.common, s.common_975),
            formatarLinha(emS.common, s.common_750),
            formatarLinha(emS.common, s.common_520),
            formatarLinha(emS.mystery, s.mystery_skin),
            formatarLinha(emS.champion, s.mystery_champ)
        ].filter(Boolean).join('\n');

        // Se tiver descrição customizada, a tabela vai embaixo
        let baseDescSkins = embedSkins.data.description ? `${embedSkins.data.description}\n\n` : '';
        embedSkins.setDescription(`${baseDescSkins}${textSkins}`);

        // --- EMBED 2: LOOT (Puxando do emojis.json) ---
        const l = loja.loot;
        const emL = emojis.loot;
        
        const textLoot = discountTextLoot + [
            `- **Passes**`,
            formatarLinha(emL.pass, l.pass_1),
            formatarLinha(emL.pass, l.pass_2),
            formatarLinha(emL.pass, l.pass_3),
            '',
            `- **Orbs**`,
            formatarLinha(emL.orb, l.orb_1),
            formatarLinha(emL.orb, l.orb_2),
            formatarLinha(emL.megaorb, l.orb_3),
            '',
            `- **Hextech Chests & Keys**`,
            formatarLinha(emL.chest, l.chest_1),
            formatarLinha(emL.key, l.key_1),
            formatarLinha(emL.chestkey, l.chest_key_1),
            formatarLinha(emL.chestkey, l.chest_key_5),
            formatarLinha(emL.chestkey, l.chest_key_10)
        ].filter(Boolean).join('\n');

        let baseDescLoot = embedLoot.data.description ? `${embedLoot.data.description}\n\n` : '';
        embedLoot.setDescription(`${baseDescLoot}${textLoot}`);

        await interaction.reply({ content: `${emojis.utilidades?.carregando || '⏳'} Enviando as tabelas de preços...`, flags: 64 });
        await interaction.channel.send({ embeds: [embedSkins] });
        await interaction.channel.send({ embeds: [embedLoot] });
    }
};