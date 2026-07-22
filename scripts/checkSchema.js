const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../database/catalogo.db');

db.all("SELECT sql FROM sqlite_master WHERE name='itens'", (err, rows) => {
    console.log(rows);
});
