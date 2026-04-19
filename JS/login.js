const formLogin = document.getElementById('formLogin');
const msg = document.getElementById('msg');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    msg.textContent = 'Validando...';
    msg.style.color = 'blue';

    const body = {
        correo: document.getElementById('correo').value.trim(),
        password: document.getElementById('password').value.trim()
    };

    try {
        const resp = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await resp.json();

        if (!resp.ok) {
            msg.textContent = data.error || 'Error';
            msg.style.color = 'red';
            return;
        }

        // --- GUARDADO DE DATOS EN LOCALSTORAGE ---
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', data.correo);
        localStorage.setItem('nombre', data.nombre);
        localStorage.setItem('appaterno', data.appaterno);
        localStorage.setItem('apmaterno', data.apmaterno);
        localStorage.setItem('rol', data.rol);

        // Guardar laboratorio si es ENCARGADO o PROFESOR
        // (Ambos necesitan filtrar datos por su laboratorio asignado)
        if (data.rol === 'encargado' || data.rol === 'profesor') {
            localStorage.setItem('id_laboratorio', data.id_laboratorio);
            // Si el server no manda el nombre del lab, guardamos solo el ID
            if (data.nombre_lab) localStorage.setItem('nombre_lab', data.nombre_lab);
        }

        msg.textContent = 'Bienvenido ' + data.nombre;
        msg.style.color = 'green';

        // --- REDIRECCIÓN INTELIGENTE ---
        setTimeout(() => {
            const rol = data.rol.toLowerCase().trim();
            
            if (rol === 'profesor') {
                // El profesor va directo a reportar fallas
                window.location.href = 'incidencias_actual.html';
            } else {
                // Admin y Encargado van al Dashboard general
                window.location.href = 'dashboard.html';
            }
        }, 1000);

    } catch (error) {
        msg.textContent = 'Error de conexión';
        msg.style.color = 'red';
    }
});