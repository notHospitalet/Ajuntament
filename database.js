const sqlite3 = require('sqlite3').verbose();

// Conectar a la base de datos (o crearla si no existe)
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        // Crear la tabla de reservas si no existe
        db.run(`
            CREATE TABLE IF NOT EXISTS reservas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instalacion TEXT NOT NULL,
                fecha TEXT NOT NULL,
                horaEntrada TEXT NOT NULL,
                horaSalida TEXT NOT NULL,
                tipo TEXT NOT NULL,
                esLocal INTEGER NOT NULL,
                dni TEXT,
                precio REAL NOT NULL,
                UNIQUE(instalacion, fecha, horaEntrada, horaSalida)
            )
        `, (err) => {
            if (err) {
                console.error('Error al crear la tabla reservas:', err.message);
            } else {
                console.log('Tabla reservas creada o ya existente.');
            }
        });
    }
});

module.exports = db;
