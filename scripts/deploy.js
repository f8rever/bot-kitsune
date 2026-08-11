const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, '../commands');

// Função recursiva para ler todas as subpastas de comandos
function getCommands(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            getCommands(fullPath);
        } else if (item.endsWith('.js')) {
            const command = require(fullPath);
            if (command.name && command.description) {
                commands.push({
                    name: command.name,
                    description: command.description,
                    options: command.options || []
                });
            }
        }
    });
}

getCommands(commandsPath);

// Configura o REST com o Token do seu .env
const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`⏳ Carregando ${commands.length} comandos slash do seu diretório...`);

        const clientId = process.env.CLIENT_ID || (token ? Buffer.from(token.split('.')[0], 'base64').toString() : null);

        if (process.env.GUILD_ID && clientId) {
            console.log(`⚡ Limpando comandos da Guild (${process.env.GUILD_ID}) para evitar duplicados...`);
            await rest.put(
                Routes.applicationGuildCommands(clientId, process.env.GUILD_ID),
                { body: [] }
            );
        }

        if (clientId) {
            console.log(`🌍 Registrando comandos Globalmente...`);
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
        }

        console.log('✅ Todos os comandos slash foram atualizados e sincronizados no Discord!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();