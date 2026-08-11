const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'desconto',
    description: 'Define a porcentagem de desconto global da loja para todo o catálogo (Ex: 50 para 50%).',
    options: [
        {
            name: 'porcentagem',
            description: 'Porcentagem de desconto (Ex: 50 para 50% OFF, 0 para desativar)',
            type: ApplicationCommandOptionType.Number,
            required: true,
            min_value: 0,
            max_value: 100
        }
    ],

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const pct = interaction.options.getNumber('porcentagem');
        const lojaPath = path.join(__dirname, '../../config/loja.json');
        let loja = {};

        if (fs.existsSync(lojaPath)) {
            try {
                loja = JSON.parse(fs.readFileSync(lojaPath, 'utf8'));
            } catch (e) {
                return interaction.editReply({ content: '❌ Erro ao ler o arquivo `loja.json`.' });
            }
        }

        loja.promocao_porcentagem = pct;

        try {
            fs.writeFileSync(lojaPath, JSON.stringify(loja, null, 2), 'utf8');
            if (typeof interaction.client.emit === 'function') {
                interaction.client.emit('reloadLoja');
            }
        } catch (e) {
            return interaction.editReply({ content: '❌ Erro ao salvar alterações em `loja.json`.' });
        }

        const embed = new EmbedBuilder()
            .setTitle('🔥 Desconto Global da Loja Atualizado!')
            .setColor('#F43F5E')
            .setDescription(pct > 0 
                ? `✅ O desconto global da loja foi definido para **${pct}% OFF**!\n\nEste desconto é aplicado automaticamente a **TODOS** os itens do catálogo (Skins, Chromas, Passes, Pacotes, Campeões, Emotes, Ícones, Sentinelas, etc.).`
                : `✅ O desconto global da loja foi **desativado** (0% OFF). Os itens serão exibidos pelo preço padrão sem desconto.`
            )
            .setFooter({ text: 'Kitsune Store • Desconto Global' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
