const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../database/catalogo.db');
db.serialize(() => {
    db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, rows) => {
        console.log(rows);
    });
});
