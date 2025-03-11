document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    const modal = document.getElementById('modalReserva');
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
    // CONFIGURACIÓN DEL CALENDARIO
    // =======================
    const today = new Date();
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const todayText = today.toLocaleDateString('es-ES', optionsDate);
    const todayStr = today.toISOString().split('T')[0];
    
    // Bloquear días pasados en el formulario estableciendo el atributo "min"
    fechaInput.setAttribute('min', todayStr);

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        firstDay: 1,
        dayMaxEventRows: false,
        dayMaxEvents: false,
        headerToolbar: {
            left: 'prev,next myCustomToday',
            center: 'title',
            right: 'dayGridMonth'
        },
        customButtons: {
            myCustomToday: {
                text: `Hoy: ${todayText}`,
                click: function() {
                    calendar.today();
                }
            }
        },
        // Bloquear días anteriores a la fecha actual
        validRange: {
            start: todayStr
        },
        events: '/reservas',
        dateClick: function (info) {
            modal.style.display = 'block';
            fechaInput.value = info.dateStr;
            actualizarHorasDisponibles();
        },
        eventClick: function(info) {
            const infoModal = document.getElementById('infoReservaModal');
            const infoMensaje = document.getElementById('infoReservaMensaje');
            const closeInfo = document.getElementById('infoReservaClose');
            
            const startTime = info.event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const endTime   = info.event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const instalacion = info.event.title.split(' - ')[0].replace('Reserva ', '');
            
            infoMensaje.innerHTML = `<strong>${instalacion}</strong><br>de ${startTime} a ${endTime}`;
            infoModal.style.display = 'block';
            
            closeInfo.onclick = function() {
                infoModal.style.display = 'none';
            };

            setTimeout(() => {
                infoModal.style.display = 'none';
            }, 5000);
        },
        // Nuevo callback para añadir tooltip en cada celda del día
        dayCellDidMount: function(info) {
            let tooltip = document.createElement("span");
            tooltip.classList.add("fc-day-tooltip");
            tooltip.textContent = "Solicitar Reserva";
            tooltip.style.display = "none";
            info.el.appendChild(tooltip);

            info.el.addEventListener("mouseenter", function() {
                tooltip.style.display = "block";
            });
            info.el.addEventListener("mouseleave", function() {
                tooltip.style.display = "none";
            });
        }
    });

    calendar.render();

    // =======================
    // LÓGICA PARA CERRAR LOS MODALES
    // =======================
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.onclick = function () {
            this.closest('.modal').style.display = 'none';
        };
    });
    window.onclick = function (event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // =======================
    // MANEJO DEL FORMULARIO DE RESERVA
    // =======================
    const instalacionSelect = document.getElementById('instalacion');
    const tipoSelect = document.getElementById('tipo');
    const esLocalCheckbox = document.getElementById('esLocal');
    const precioPreview = document.getElementById('precioPreview');
    const dniField = document.getElementById('dniField');

    esLocalCheckbox.addEventListener('change', function() {
        if (esLocalCheckbox.checked) {
            dniField.style.display = 'block';
        } else {
            dniField.style.display = 'none';
        }
        calcularPrecio();
    });

    // Función para convertir "HH:MM" a minutos
    function convertirHoraAMinutos(horaStr) {
        const [h, m] = horaStr.split(':').map(Number);
        return h * 60 + m;
    }

    // Función para actualizar las horas disponibles en los selectores
    function actualizarHorasDisponibles() {
        const instalacion = instalacionSelect.value;
        const fecha = fechaInput.value;
        if (!instalacion || !fecha) return;

        fetch('/reservas')
            .then(response => response.json())
            .then(events => {
                // Filtrar las reservas para el deporte (instalación) y fecha seleccionados.
                const reservasFiltradas = events.filter(event => {
                    const eventDate = event.start.split('T')[0];
                    // Se espera que el título inicie con "Reserva " seguido del nombre de la instalación en mayúsculas
                    return eventDate === fecha && event.title.startsWith(`Reserva ${instalacion.toUpperCase()}`);
                });
                // Convertir cada reserva en un intervalo en minutos.
                const intervalosReservados = reservasFiltradas.map(event => {
                    const startTime = event.start.split('T')[1].substring(0,5); // "HH:MM"
                    const endTime = event.end.split('T')[1].substring(0,5);
                    return {
                        start: convertirHoraAMinutos(startTime),
                        end: convertirHoraAMinutos(endTime)
                    };
                });

                // Si la fecha es hoy, obtener la hora actual en minutos.
                const isToday = (fecha === todayStr);
                let currentMin = 0;
                if (isToday) {
                    const now = new Date();
                    currentMin = now.getHours() * 60 + now.getMinutes();
                }

                // Actualizar cada opción en los selectores de hora.
                [horaEntradaSelect, horaSalidaSelect].forEach(select => {
                    for (let option of select.options) {
                        const minutosOpcion = convertirHoraAMinutos(option.value);
                        let disable = false;
                        // Bloquear si la opción está en un intervalo reservado.
                        if (intervalosReservados.some(intervalo => 
                            minutosOpcion >= intervalo.start && minutosOpcion < intervalo.end
                        )) {
                            disable = true;
                        }
                        // Si la fecha es hoy, bloquear las horas que ya han pasado.
                        if (isToday && minutosOpcion < currentMin) {
                            disable = true;
                        }
                        option.disabled = disable;
                        option.style.backgroundColor = disable ? "#e0e0e0" : "";
                    }
                });
            })
            .catch(error => console.error('Error al obtener reservas:', error));
    }

    // Actualizar horas disponibles cuando cambie la instalación o la fecha
    instalacionSelect.addEventListener('change', actualizarHorasDisponibles);
    fechaInput.addEventListener('change', actualizarHorasDisponibles);

    function calcularPrecio() {
        const instalacion = instalacionSelect.value;
        const horaEntrada = horaEntradaSelect.value;
        const horaSalida = horaSalidaSelect.value;
        const tipo = tipoSelect.value;
        const esLocal = esLocalCheckbox.checked;

        if (!horaEntrada || !horaSalida) {
            precioPreview.textContent = "";
            return;
        }

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
        } else {
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

    instalacionSelect.addEventListener('change', calcularPrecio);
    horaEntradaSelect.addEventListener('change', calcularPrecio);
    horaSalidaSelect.addEventListener('change', calcularPrecio);
    tipoSelect.addEventListener('change', calcularPrecio);

    document.getElementById('reservaForm').addEventListener('submit', async (e) => {
        e.preventDefault();

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
        const nombre = document.getElementById('nombre').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const correo = document.getElementById('correo').value.trim();

        if (horaSalida <= horaEntrada) {
            document.getElementById('resultado').textContent = 'La hora de salida debe ser posterior a la de entrada.';
            return;
        }

        const reserva = { instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal, dni, nombre, telefono, correo };

        try {
            const response = await fetch('/reservar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reserva)
            });

            const data = await response.json();
            document.getElementById('resultado').textContent = data.mensaje;
            calendar.refetchEvents();
            setTimeout(() => {
                modal.style.display = 'none';
            }, 2000);
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('resultado').textContent = 'Error al realizar la reserva.';
        }
    });
});
