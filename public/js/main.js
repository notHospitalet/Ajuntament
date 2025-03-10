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

    // Inicializar FullCalendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: '/reservas',
        dateClick: function (info) {
            // Mostrar el modal y establecer la fecha seleccionada
            modal.style.display = 'block';
            fechaInput.value = info.dateStr;
        }
    });
    calendar.render();

    // Cerrar el modal al hacer clic en la "X"
    span.onclick = function () {
        modal.style.display = 'none';
    };

    // Cerrar el modal al hacer clic fuera de él
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Elementos para la actualización del precio y el campo DNI
    const instalacionSelect = document.getElementById('instalacion');
    const tipoSelect = document.getElementById('tipo');
    const esLocalCheckbox = document.getElementById('esLocal');
    const precioPreview = document.getElementById('precioPreview');
    const dniField = document.getElementById('dniField');

    // Mostrar u ocultar el campo DNI según el checkbox de "es local"
    esLocalCheckbox.addEventListener('change', function() {
        if (esLocalCheckbox.checked) {
            dniField.style.display = 'block';
        } else {
            dniField.style.display = 'none';
        }
        calcularPrecio();
    });

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

    // Agregar event listeners para actualizar el precio al cambiar los campos
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
