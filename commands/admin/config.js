const { EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'config',
    description: 'Personaliza as cores e emojis de todos os comandos do bot.',
    options: [
        { name: 'cor', description: 'Nova cor em HEX (Ex: #FF0000)', type: 3, required: false },
        { name: 'emoji_sucesso', description: 'Emoji para mensagens positivas', type: 3, required: false },
        { name: 'emoji_erro', description: 'Emoji para mensagens de erro', type: 3, required: false },
        { name: 'logo', description: 'Link da nova imagem/logo do bot', type: 3, required: false }
    ],
    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '🏮 Apenas administradores podem configurar o bot.', flags: MessageFlags.Ephemeral });
        }

        const configPath = path.join(__dirname, '../../config/config.json');
        
        let config = {
            cor: "#F43F5E",
            emoji_sucesso: "🌸",
            emoji_erro: "🏮",
            logo: "https://cdn-icons-png.flaticon.com/512/2589/2589175.png"
        };

        if (fs.existsSync(configPath)) {
            try { config = JSON.parse(fs.readFileSync(configPath)); } catch(e) {}
        }

        const novaCor = interaction.options.getString('cor');
        const eSucesso = interaction.options.getString('emoji_sucesso');
        const eErro = interaction.options.getString('emoji_erro');
        const novaLogo = interaction.options.getString('logo');

        if (novaCor) config.cor = novaCor;
        if (eSucesso) config.emoji_sucesso = eSucesso;
        if (eErro) config.emoji_erro = eErro;
        if (novaLogo) config.logo = novaLogo;

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        const embed = buildCustomEmbed('config_success', interaction.client, interaction, {
            logo: config.logo,
            cor: config.cor,
            emoji_sucesso: config.emoji_sucesso,
            emoji_erro: config.emoji_erro
        });

        await interaction.reply({ embeds: [embed] });
    }
};
