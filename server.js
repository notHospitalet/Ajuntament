const express = require('express');
const db = require('./database.js');
const nodemailer = require('nodemailer');

// Configurar el transporter de Nodemailer (reemplaza los valores por los tuyos o usa variables de entorno)
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '',      // Tu email
        pass: ''       // Tu contraseña o token de aplicación
    }
});

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/reservar', (req, res) => {
    const { instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal, dni, nombre, telefono, correo } = req.body;

    // Verificar si la fecha y hora son válidas
    const now = new Date();
    const selectedDateEntrada = new Date(`${fecha}T${horaEntrada}`);
    const selectedDateSalida = new Date(`${fecha}T${horaSalida}`);

    if (selectedDateEntrada < now) {
        return res.status(400).json({ mensaje: 'No se puede reservar en fechas y horas pasadas.' });
    }

    // Verificar si hay solapamientos en las reservas para la misma instalación
    db.all(
        'SELECT * FROM reservas WHERE instalacion = ? AND fecha = ? AND ((horaEntrada < ? AND horaSalida > ?) OR (horaEntrada < ? AND horaSalida > ?) OR (horaEntrada >= ? AND horaSalida <= ?))',
        [instalacion, fecha, horaSalida, horaEntrada, horaSalida, horaEntrada, horaEntrada, horaSalida],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ mensaje: 'Error al verificar la reserva.' });
            }
            if (rows.length > 0) {
                return res.status(400).json({ mensaje: 'La hora seleccionada está ocupada.' });
            }

            // Calcular precio según la instalación, tipo y si es local
            const precios = {
                padel: { local: { sinLuz: 0, conLuz: 4 }, noLocal: { sinLuz: 4, conLuz: 8 } },
                fronton: { local: { sinLuz: 0, conLuz: 4 }, noLocal: { sinLuz: 4, conLuz: 8 } },
                futbol: { local: { sinLuz: 0, conLuz: 10 }, noLocal: { sinLuz: 15, conLuz: 30 } },
                futbolSala: { local: { sinLuz: 0, conLuz: 4 }, noLocal: { sinLuz: 4, conLuz: 8 } }
            };

            const precio = precios[instalacion][esLocal ? 'local' : 'noLocal'][tipo];

            // Insertar la reserva en la base de datos incluyendo los nuevos campos
            db.run(
                'INSERT INTO reservas (instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal, dni, precio, nombre, telefono, correo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal ? 1 : 0, dni, precio, nombre, telefono, correo],
                function (err) {
                    if (err) {
                        return res.status(500).json({ mensaje: 'Error al guardar la reserva.' });
                    }

                    // Configurar el correo electrónico con todos los detalles de la reserva
                    const mailOptions = {
                        from: '"Reservas Deportivas" <tu-email@gmail.com>',
                        to: 'mi-correo@ejemplo.com', // Reemplaza por tu correo
                        subject: 'Nueva Reserva Realizada',
                        text: `Se ha realizado una nueva reserva con los siguientes detalles:

Instalación: ${instalacion}
Fecha: ${fecha}
Hora de Entrada: ${horaEntrada}
Hora de Salida: ${horaSalida}
Tipo de Reserva: ${tipo}
Es Local: ${esLocal ? 'Sí' : 'No'}
DNI: ${dni ? dni : 'N/A'}
Nombre: ${nombre}
Teléfono: ${telefono}
Correo: ${correo}
Precio: ${precio}€

Por favor, verifica y confirma la reserva según sea necesario.`
                    };

                    // Enviar el correo electrónico
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Error al enviar email:', error);
                        } else {
                            console.log('Email enviado: ' + info.response);
                        }
                    });

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
            title: `Reserva ${row.instalacion.toUpperCase()} - ${row.horaEntrada} a ${row.horaSalida}`,
            start: `${row.fecha}T${row.horaEntrada}:00`,
            end: `${row.fecha}T${row.horaSalida}:00`,
            allDay: false
        }));
        res.json(eventos);
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});