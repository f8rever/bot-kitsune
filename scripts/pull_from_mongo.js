require('dotenv').config();
const path = require('path');
const { syncAllBotConfigs, syncMongoAndDisk } = require('../utils/mongoStorage.js');

(async () => {
  console.log('🔄 Sincronizando todas as configurações e contas do MongoDB Atlas com os arquivos locais...');
  const configDir = path.join(__dirname, '../config');
  const accountsPath = path.join(configDir, 'riot_accounts.json');

  await syncAllBotConfigs(configDir);
  await syncMongoAndDisk(accountsPath);

  console.log('✅ Sincronização concluída! Seus arquivos em config/ estão 100% atualizados com o MongoDB Atlas.');
  process.exit(0);
})();
