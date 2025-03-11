const express = require('express');
const db = require('./database.js');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Mostrar en consola que se cargaron las variables (se oculta la contraseña)
console.log("EMAIL:", process.env.EMAIL);
console.log("PASSWORD:", process.env.PASSWORD ? "********" : "No definida");

// Configurar el transporter de Nodemailer usando Gmail y las credenciales del .env
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,      
        pass: process.env.PASSWORD     
    }
});

// Verificar la conexión con el servidor de correo
transporter.verify(function(error, success) {
    if (error) {
        console.error("Error al conectar con el servidor de correo:", error);
    } else {
        console.log("Servidor de correo listo para enviar mensajes.");
    }
});

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Ruta para enviar un correo de prueba
app.get('/test-email', (req, res) => {
    const mailOptions = {
         from: `"Reservas Deportivas" <${process.env.EMAIL}>`,
         to: process.env.EMAIL, // Enviar a la misma cuenta para prueba
         subject: 'Correo de prueba - Nodemailer',
         text: 'Este es un correo de prueba para verificar la configuración de Nodemailer.'
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error al enviar correo de prueba:', error);
            res.status(500).send('Error al enviar correo de prueba');
        } else {
            console.log('Correo de prueba enviado: ' + info.response);
            res.send('Correo de prueba enviado exitosamente');
        }
    });
});

app.post('/reservar', (req, res) => {
    const { instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal, dni, nombre, telefono, correo } = req.body;

    // Verificar si la fecha y hora son válidas
    const now = new Date();
    const selectedDateEntrada = new Date(`${fecha}T${horaEntrada}`);
    const selectedDateSalida = new Date(`${fecha}T${horaSalida}`);

    if (selectedDateEntrada < now) {
        return res.status(400).json({ mensaje: 'No se puede reservar en fechas y horas pasadas.' });
    }

    // Verificar solapamientos en las reservas para la misma instalación
    db.all(
        'SELECT * FROM reservas WHERE instalacion = ? AND fecha = ? AND ((horaEntrada < ? AND horaSalida > ?) OR (horaEntrada < ? AND horaSalida > ?) OR (horaEntrada >= ? AND horaSalida <= ?))',
        [instalacion, fecha, horaSalida, horaEntrada, horaSalida, horaEntrada, horaEntrada, horaSalida],
        (err, rows) => {
            if (err) {
                console.error("Error al consultar la base de datos:", err);
                return res.status(500).json({ mensaje: 'Error al verificar la reserva.' });
            }
            if (rows.length > 0) {
                return res.status(400).json({ mensaje: 'La hora seleccionada está ocupada.' });
            }

            // Calcular precio por hora según la instalación, tipo y si es local
            const precios = {
                padel: { local: { sinLuz: 0, conLuz: 4 }, noLocal: { sinLuz: 4, conLuz: 8 } },
                fronton: { local: { sinLuz: 0, conLuz: 4 }, noLocal: { sinLuz: 4, conLuz: 8 } },
                futbol: { local: { sinLuz: 0, conLuz: 10 }, noLocal: { sinLuz: 15, conLuz: 30 } },
                futbolSala: { local: { sinLuz: 0, conLuz: 4 }, noLocal: { sinLuz: 4, conLuz: 8 } }
            };

            const precioPorHora = precios[instalacion][esLocal ? 'local' : 'noLocal'][tipo];

            // Calcular duración en horas
            const [entradaH, entradaM] = horaEntrada.split(':').map(Number);
            const [salidaH, salidaM] = horaSalida.split(':').map(Number);
            const entradaMin = entradaH * 60 + entradaM;
            const salidaMin = salidaH * 60 + salidaM;
            const duracionHoras = (salidaMin - entradaMin) / 60;

            const totalPrecio = precioPorHora * duracionHoras;

            // Insertar la reserva en la base de datos
            db.run(
                'INSERT INTO reservas (instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal, dni, precio, nombre, telefono, correo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal ? 1 : 0, dni, totalPrecio, nombre, telefono, correo],
                function (err) {
                    if (err) {
                        console.error("Error al insertar la reserva en la base de datos:", err);
                        return res.status(500).json({ mensaje: 'Error al guardar la reserva.' });
                    }

                    // Configurar correo para el usuario
                    const mailOptionsUsuario = {
                        from: `"Reservas Deportivas" <${process.env.EMAIL}>`,
                        to: correo,
                        subject: 'Confirmación de Reserva',
                        text: `Hola ${nombre},

Se ha realizado tu reserva con los siguientes detalles:

Instalación: ${instalacion}
Fecha: ${fecha}
Hora de Entrada: ${horaEntrada}
Hora de Salida: ${horaSalida}
Tipo de Reserva: ${tipo}
Es Local: ${esLocal ? 'Sí' : 'No'}
DNI: ${dni ? dni : 'N/A'}
Teléfono: ${telefono}
Precio: ${totalPrecio.toFixed(2)}€

Gracias por elegirnos. ¡Te esperamos!`
                    };

                    // Configurar correo para el propietario
                    const mailOptionsPropietario = {
                        from: `"Reservas Deportivas" <${process.env.EMAIL}>`,
                        to: 'pruebasllosa@gmail.com',
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
Precio: ${totalPrecio.toFixed(2)}€

Por favor, verifica y confirma la reserva según sea necesario.`
                    };

                    console.log("Enviando correo al usuario:", correo);
                    transporter.sendMail(mailOptionsUsuario, (error, info) => {
                        if (error) {
                            console.error('Error al enviar email al usuario:', error);
                        } else {
                            console.log('Email enviado al usuario: ' + info.response);
                        }
                    });

                    console.log("Enviando correo al propietario: pruebasllosa@gmail.com");
                    transporter.sendMail(mailOptionsPropietario, (error, info) => {
                        if (error) {
                            console.error('Error al enviar email al propietario:', error);
                        } else {
                            console.log('Email enviado al propietario: ' + info.response);
                        }
                    });

                    res.json({ mensaje: `Reserva realizada con éxito. Precio: ${totalPrecio.toFixed(2)}€` });
                }
            );
        }
    );
});

app.get('/reservas', (req, res) => {
    db.all('SELECT * FROM reservas', [], (err, rows) => {
        if (err) {
            console.error("Error al obtener reservas de la base de datos:", err);
            return res.status(500).json({ mensaje: 'Error al obtener las reservas.' });
        }
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
