const express = require('express');
const db = require('./database.js');

// Inicializar la aplicación Express
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Endpoint para reservar
app.post('/reservar', (req, res) => {
    const { instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal } = req.body;

    // Verificar si hay solapamientos en las reservas
    db.all(
        'SELECT * FROM reservas WHERE fecha = ? AND ((horaEntrada < ? AND horaSalida > ?) OR (horaEntrada < ? AND horaSalida > ?) OR (horaEntrada >= ? AND horaSalida <= ?))',
        [fecha, horaSalida, horaEntrada, horaSalida, horaEntrada, horaEntrada, horaSalida],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ mensaje: 'Error al verificar la reserva.' });
            }
            if (rows.length > 0) {
                return res.status(400).json({ mensaje: 'La hora seleccionada está ocupada.' });
            }

            // Calcular precio basado en el documento
            const precios = {
                padel: { local: { sinLuz: 0, conLuz: 4 }, noLocal: { sinLuz: 4, conLuz: 8 } },
                fronton: { local: { sinLuz: 0, conLuz: 4 }, noLocal: { sinLuz: 4, conLuz: 8 } },
                futbol: { local: { sinLuz: 0, conLuz: 10 }, noLocal: { sinLuz: 15, conLuz: 30 } },
                futbolSala: { local: { sinLuz: 0, conLuz: 4 }, noLocal: { sinLuz: 4, conLuz: 8 } }
            };

            const precio = precios[instalacion][esLocal ? 'local' : 'noLocal'][tipo];

            // Insertar reserva en la base de datos
            db.run(
                'INSERT INTO reservas (instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal, precio) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal ? 1 : 0, precio],
                function (err) {
                    if (err) {
                        return res.status(500).json({ mensaje: 'Error al guardar la reserva.' });
                    }
                    res.json({ mensaje: `Reserva realizada con éxito. Precio: ${precio}€` });
                }
            );
        }
    );
});

// Endpoint para obtener todas las reservas
app.get('/reservas', (req, res) => {
    db.all('SELECT * FROM reservas', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ mensaje: 'Error al obtener las reservas.' });
        }
        // Formatear los eventos para FullCalendar
        const eventos = rows.map(row => ({
            title: `Reserva: ${row.instalacion}`,
            start: `${row.fecha}T${row.horaEntrada}:00`,
            end: `${row.fecha}T${row.horaSalida}:00`,
            allDay: false
        }));
        res.json(eventos);
    });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});