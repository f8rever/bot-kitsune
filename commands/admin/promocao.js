const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'promocao',
    description: 'Define a porcentagem de desconto da loja para todo o catálogo ou para uma categoria específica.',
    options: [
        {
            name: 'porcentagem',
            description: 'Porcentagem de desconto (Ex: 50 para 50% OFF, 0 para desativar)',
            type: ApplicationCommandOptionType.Number,
            required: true,
            min_value: 0,
            max_value: 100
        },
        {
            name: 'categoria',
            description: 'Categoria específica para aplicar o desconto (opcional, deixa vazio para desconto global)',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: 'Skins', value: 'skins' },
                { name: 'Chromas', value: 'cromas' },
                { name: 'Highlights/Pacotes', value: 'highlights' },
                { name: 'Passes', value: 'passes' },
                { name: 'Chests/Loot', value: 'chests' },
                { name: 'Emotes', value: 'emotes' },
                { name: 'Icons', value: 'icones' },
                { name: 'Ward Skins', value: 'wards' },
                { name: 'Little Legends', value: 'little_legends' },
                { name: 'TFT Arena', value: 'tft_arena' },
                { name: 'Boosts', value: 'boosts' },
                { name: 'Eternos', value: 'eternos' },
                { name: 'Mystery Gifts', value: 'misterio' },
                { name: 'Hextech', value: 'hextech' }
            ]
        }
    ],

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const pct = interaction.options.getNumber('porcentagem');
        const categoria = interaction.options.getString('categoria');
        const lojaPath = path.join(__dirname, '../../config/loja.json');
        let loja = {};

        if (fs.existsSync(lojaPath)) {
            try {
                loja = JSON.parse(fs.readFileSync(lojaPath, 'utf8'));
            } catch (e) {
                return interaction.editReply({ content: '❌ Erro ao ler o arquivo `loja.json`.' });
            }
        }

        if (categoria) {
            loja[`desconto_${categoria}`] = pct;
        } else {
            loja.promocao_porcentagem = pct;
        }

        try {
            fs.writeFileSync(lojaPath, JSON.stringify(loja, null, 2), 'utf8');
            if (typeof interaction.client.emit === 'function') {
                interaction.client.emit('reloadLoja');
            }
        } catch (e) {
            return interaction.editReply({ content: '❌ Erro ao salvar alterações em `loja.json`.' });
        }

        const embed = new EmbedBuilder()
            .setTitle(categoria ? '🔥 Desconto por Categoria Atualizado!' : '🔥 Desconto Global da Loja Atualizado!')
            .setColor('#F43F5E')
            .setFooter({ text: 'Kitsune Store • Desconto' })
            .setTimestamp();

        if (categoria) {
            const catChoices = [
                { name: 'Skins', value: 'skins' },
                { name: 'Chromas', value: 'cromas' },
                { name: 'Highlights/Pacotes', value: 'highlights' },
                { name: 'Passes', value: 'passes' },
                { name: 'Chests/Loot', value: 'chests' },
                { name: 'Emotes', value: 'emotes' },
                { name: 'Icons', value: 'icones' },
                { name: 'Ward Skins', value: 'wards' },
                { name: 'Little Legends', value: 'little_legends' },
                { name: 'TFT Arena', value: 'tft_arena' },
                { name: 'Boosts', value: 'boosts' },
                { name: 'Eternos', value: 'eternos' },
                { name: 'Mystery Gifts', value: 'misterio' },
                { name: 'Hextech', value: 'hextech' }
            ];
            const catLabel = catChoices.find(c => c.value === categoria)?.name || categoria;
            embed.setDescription(pct > 0
                ? `✅ O desconto para a categoria **${catLabel}** foi definido para **${pct}% OFF**!\n\nEste desconto será aplicado automaticamente a todos os itens pertencentes a esta categoria no catálogo.`
                : `✅ O desconto específico para a categoria **${catLabel}** foi **removido/desativado**. Itens desta categoria seguirão a regra de desconto global da loja.`
            );
        } else {
            embed.setDescription(pct > 0
                ? `✅ O desconto global da loja foi definido para **${pct}% OFF**!\n\nEste desconto é aplicado automaticamente a **TODOS** os itens do catálogo que não possuam desconto específico por categoria.`
                : `✅ O desconto global da loja foi **desativado** (0% OFF). Os itens serão exibidos pelo preço padrão sem desconto, a menos que possuam desconto por categoria.`
            );
        }

        return interaction.editReply({ embeds: [embed] });
    }
};
