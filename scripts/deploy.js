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

        // Usando o GUILD_ID do seu .env para registrar de forma INSTANTÂNEA no seu servidor de testes
        if (process.env.GUILD_ID && process.env.CLIENT_ID) {
            console.log(`⚡ Registrando comandos localmente na Guild: ${process.env.GUILD_ID}`);
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
        } else {
            // Registro global (pode demorar alguns minutos para aparecer em todos os servidores)
            console.log(`🌍 Registrando comandos globalmente...`);
            const clientId = process.env.CLIENT_ID || Buffer.from(token.split('.')[0], 'base64').toString();
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
        }

        console.log('✅ Todos os comandos slash foram atualizados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();