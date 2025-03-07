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

    // Manejar el envío del formulario de reserva
    document.getElementById('reservaForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const instalacion = document.getElementById('instalacion').value;
        const fecha = fechaInput.value;
        const horaEntrada = horaEntradaSelect.value;
        const horaSalida = horaSalidaSelect.value;
        const tipo = document.getElementById('tipo').value;
        const esLocal = document.getElementById('esLocal').checked;

        // Validar que la hora de salida sea posterior a la de entrada
        if (horaSalida <= horaEntrada) {
            document.getElementById('resultado').textContent = 'La hora de salida debe ser posterior a la de entrada.';
            return;
        }

        const reserva = { instalacion, fecha, horaEntrada, horaSalida, tipo, esLocal };

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