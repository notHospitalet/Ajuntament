document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    const modal = document.getElementById('modalReserva');
    const span = document.querySelector('.close');
    const fechaInput = document.getElementById('fecha');
    const horaEntradaSelect = document.getElementById('horaEntrada');
    const horaSalidaSelect = document.getElementById('horaSalida');

    // Generar opciones de horas (de media en media hora)
    function generarHoras() {
        const horas = [];
        for (let i = 8; i <= 22; i++) { // De 8:00 a 22:00
            horas.push(`${i.toString().padStart(2, '0')}:00`);
            horas.push(`${i.toString().padStart(2, '0')}:30`);
        }
        return horas;
    }

    // Llenar los selectores de hora de entrada y salida
    function llenarHoras() {
        const horas = generarHoras();
        horas.forEach(hora => {
            const optionEntrada = document.createElement('option');
            optionEntrada.value = hora;
            optionEntrada.textContent = hora;
            horaEntradaSelect.appendChild(optionEntrada);

            const optionSalida = document.createElement('option');
            optionSalida.value = hora;
            optionSalida.textContent = hora;
            horaSalidaSelect.appendChild(optionSalida);
        });
    }

    llenarHoras();

    // =======================
    //  CONFIGURACIÓN DEL CALENDARIO
    // =======================
    // Preparar el texto para el botón "Hoy" con la fecha actual en español
    const today = new Date();
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const todayText = today.toLocaleDateString('es-ES', optionsDate);

    // Inicializar FullCalendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        // Ajustes de idioma y comienzo de semana
        locale: 'es',
        firstDay: 1, // Lunes como primer día de la semana

        // Permitir que se muestren todos los eventos sin botón "más"
        dayMaxEventRows: false,
        dayMaxEvents: false,

        // Personalizar la barra de navegación superior
        headerToolbar: {
            left: 'prev,next myCustomToday',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        customButtons: {
            myCustomToday: {
                text: `Hoy: ${todayText}`, // Mostrar la fecha de hoy en el botón
                click: function() {
                    calendar.today(); // Navegar a la fecha actual
                }
            }
        },

        events: '/reservas',
        
        // Evento al hacer clic en un día
        dateClick: function (info) {
            // Mostrar el modal y establecer la fecha seleccionada
            modal.style.display = 'block';
            fechaInput.value = info.dateStr;
        },
        eventClick: function(info) {
            // Obtener el modal y sus elementos para la información
            const infoModal = document.getElementById('infoReservaModal');
            const infoMensaje = document.getElementById('infoReservaMensaje');
            const closeInfo = document.getElementById('infoReservaClose');
            
            // Extraer los horarios con formato
            const startTime = info.event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const endTime   = info.event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Se asume que el título tiene el formato: "Reserva INSTALACION - HORA_ENTRADA a HORA_SALIDA"
            const instalacion = info.event.title.split(' - ')[0].replace('Reserva ', '');
            
            // Actualizar el mensaje del modal
            infoMensaje.innerHTML = `<strong>${instalacion}</strong><br>de ${startTime} a ${endTime}`;
            
            // Mostrar el modal en primer plano
            infoModal.style.display = 'block';
            
            // Cierre manual al hacer clic en "X"
            closeInfo.onclick = function() {
                infoModal.style.display = 'none';
            };

            // Cierre automático luego de 5 segundos
            setTimeout(() => {
                infoModal.style.display = 'none';
            }, 5000);
        }
    });

    calendar.render();

    // =======================
    //  LÓGICA PARA CERRAR EL MODAL
    // =======================
    span.onclick = function () {
        modal.style.display = 'none';
    };
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // =======================
    //  MANEJO DEL FORMULARIO DE RESERVA
    // =======================
    const instalacionSelect = document.getElementById('instalacion');
    const tipoSelect = document.getElementById('tipo');
    const esLocalCheckbox = document.getElementById('esLocal');
    const precioPreview = document.getElementById('precioPreview');
    const dniField = document.getElementById('dniField');

    // Mostrar/ocultar el campo DNI según el checkbox "¿Eres local?"
    esLocalCheckbox.addEventListener('change', function() {
        if (esLocalCheckbox.checked) {
            dniField.style.display = 'block';
        } else {
            dniField.style.display = 'none';
        }
        calcularPrecio();
    });

    // Función para calcular y mostrar el precio en el "preview"
    function calcularPrecio() {
        const instalacion = instalacionSelect.value;
        const horaEntrada = horaEntradaSelect.value;
        const horaSalida = horaSalidaSelect.value;
        const tipo = tipoSelect.value;
        const esLocal = esLocalCheckbox.checked;

        // Verificar que se hayan seleccionado horas válidas
        if (!horaEntrada || !horaSalida) {
            precioPreview.textContent = "";
            return;
        }

        // Convertir horas a minutos para calcular la duración
        const [entradaH, entradaM] = horaEntrada.split(':').map(Number);
        const [salidaH, salidaM] = horaSalida.split(':').map(Number);
        const entradaMin = entradaH * 60 + entradaM;
        const salidaMin = salidaH * 60 + salidaM;

        if (salidaMin <= entradaMin) {
            precioPreview.textContent = "La hora de salida debe ser mayor a la de entrada.";
            return;
        }

        const duracionHoras = (salidaMin - entradaMin) / 60;
        let precioPorHora = 0;

        // Cálculo según instalación, tipo y si es local
        if (esLocal) {
            if (tipo === "sinLuz") {
                precioPorHora = 0;
            } else if (tipo === "conLuz") {
                if (instalacion === "futbol") {
                    precioPorHora = 10;
                } else {
                    precioPorHora = 4;
                }
            }
        } else { // No es local
            if (tipo === "sinLuz") {
                if (instalacion === "futbol") {
                    precioPorHora = 15;
                } else {
                    precioPorHora = 4;
                }
            } else if (tipo === "conLuz") {
                if (instalacion === "futbol") {
                    precioPorHora = 30;
                } else {
                    precioPorHora = 8;
                }
            }
        }

        const precioTotal = precioPorHora * duracionHoras;
        precioPreview.textContent = "Precio: " + precioTotal.toFixed(2) + " €";
    }

    // Eventos para recalcular el precio al cambiar algún dato
    instalacionSelect.addEventListener('change', calcularPrecio);
    horaEntradaSelect.addEventListener('change', calcularPrecio);
    horaSalidaSelect.addEventListener('change', calcularPrecio);
    tipoSelect.addEventListener('change', calcularPrecio);

    // Manejar el envío del formulario de reserva
    document.getElementById('reservaForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validar DNI si el usuario es local
        if (esLocalCheckbox.checked) {
            const dniInput = document.getElementById('dni');
            const dniValue = dniInput.value.trim();
            const dniRegex = /^\d{8}[A-Za-z]$/;
            if (!dniRegex.test(dniValue)) {
                document.getElementById('resultado').textContent = 'Por favor, ingresa un DNI válido (8 números y 1 letra).';
                return;
            }
        }

        const instalacion = instalacionSelect.value;
        const fecha = fechaInput.value;
        const horaEntrada = horaEntradaSelect.value;
        const horaSalida = horaSalidaSelect.value;
        const tipo = tipoSelect.value;
        const esLocal = esLocalCheckbox.checked;
        const dni = esLocal ? document.getElementById('dni').value.trim() : null;

        // Validar que la hora de salida sea posterior a la de entrada
        if (horaSalida <= horaEntrada) {
            document.getElementById('resultado').textContent = 'La hora de salida debe ser posterior a la de entrada.';
            return;
        }

        const reserva = { instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal, dni };

        try {
            const response = await fetch('/reservar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reserva)
            });

            const data = await response.json();
            document.getElementById('resultado').textContent = data.mensaje;

            // Recargar el calendario para reflejar la nueva reserva
            calendar.refetchEvents();

            // Cerrar el modal después de 2 segundos
            setTimeout(() => {
                modal.style.display = 'none';
            }, 2000);
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('resultado').textContent = 'Error al realizar la reserva.';
        }
    });
});
