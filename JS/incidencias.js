// ==========================================
// incidencias.js - Gestión con Imágenes y Roles
// ==========================================

const API_INCIDENCIAS = '/api/incidencias';
const API_LABS = '/api/laboratorios';
const API_EQUIPOS = '/api/equipos';

const selectEdificio = document.getElementById('selectEdificio');
const selectLaboratorio = document.getElementById('selectLaboratorio');
const selectEquipo = document.getElementById('selectEquipo');
const descFalla = document.getElementById('descFalla');
const formIncidencia = document.getElementById('incidenciaForm');
const inputBusqueda = document.getElementById('inputBusqueda');

// IMPORTANTE: Para enviar IMÁGENES no usamos 'Content-Type': 'application/json'
// El navegador pone el Content-Type correcto automáticamente con FormData
function authHeadersMultipart() {
    return {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

function authHeadersJSON() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

// ----------------------------------------------------
// 1. INICIALIZACIÓN Y CARGA DE TABLA
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const rol = localStorage.getItem('rol')?.trim().toLowerCase();

    if (rol === 'profesor') {
        // Ocultamos todo lo que no sea Incidencias o Historial
        const itemsParaOcultar = ['Usuarios', 'Laboratorios', 'Encargados', 'Consumibles', 'Equipo', 'Gestión Actual'];
        
        document.querySelectorAll('.nav-item').forEach(el => {
            const texto = el.innerText.trim();
            // Solo dejamos "Incidencias" (el botón del drawer) y "Historial"
            if (itemsParaOcultar.some(item => texto.includes(item)) && !texto.includes('Historial')) {
                el.style.display = 'none';
            }
        });

        // Si el profesor intenta entrar al Dashboard por URL, lo regresamos
        if (window.location.pathname.includes('Dashboard.html')) {
            window.location.href = 'incidencias_actual.html';
        }
    }
});
document.addEventListener('DOMContentLoaded', async () => {
    cargarTablaIncidencias(); 
});

async function cargarTablaIncidencias() {
    try {
        const res = await fetch('/api/incidencias/actuales', { headers: authHeadersJSON() });
        const incidencias = await res.json();
        
        const rol = (localStorage.getItem('rol') || '').trim().toLowerCase();
        const tbody = document.querySelector('#tablaIncidencias tbody');
        tbody.innerHTML = '';

        // El servidor ya está filtrando, confíamos en él
        if (incidencias.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px;">No hay incidencias pendientes</td></tr>`;
            return;
        }

        incidencias.forEach(inc => {
            const tr = document.createElement('tr');
            const fechaF = inc.fecha ? String(inc.fecha).split('T')[0] : 'S/F';
            
            // Lógica para la miniatura de la imagen
            const fotoHTML = inc.foto 
                ? `<img src="/uploads/${inc.foto}" width="50" style="border-radius: 8px; cursor: pointer; border: 1px solid var(--primary-cyan);" onclick="window.open('/uploads/${inc.foto}')" title="Ver evidencia">`
                : '<span style="color:gray; font-size:0.7rem;">Sin foto</span>';

            tr.innerHTML = `
                <td>${inc.id_incidencia}</td>
                <td>
                    <strong>${inc.nombre_equipo}</strong><br>
                    <small style="color:var(--primary-cyan)">ID Eq: ${inc.id_equipo}</small>
                </td>
                <td>
                    <strong>${inc.nombre_usuario}</strong><br>
                    <small>User ID: ${inc.id_usuario}</small>
                </td>
                <td style="text-align:center;">${fotoHTML}</td>
                <td>${fechaF} | ${inc.hora}</td>
                <td class="desc-cell">${inc.descripcion}</td>
                <td><span class="status pending" style="background:rgba(239,68,68,0.2); color:#ef4444; padding:4px 8px; border-radius:6px; font-size:0.8rem; font-weight:bold;">ABIERTA</span></td>
                <td>
                    ${rol !== 'profesor' ? `<button class="btn-edit" style="padding: 5px 10px;" onclick="resolverIncidencia(${inc.id_incidencia})">Resolver</button>` : '<small>Esperando revisión</small>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error cargando tabla:", error);
    }
}

// ----------------------------------------------------
// 2. MODAL Y CASCADA DE SELECTS
// ----------------------------------------------------
async function openIncidenciaModal() {
    document.getElementById('incidenciaModal').classList.add('active');
    formIncidencia.reset();
    
    // Cargamos edificios para todos (Admin y Profesor ven todo, Encargado solo su edificio)
    await cargarEdificiosAdmin(); 
    selectLaboratorio.disabled = true;
    selectEquipo.disabled = true;
}

async function cargarEdificiosAdmin() {
    try {
        const res = await fetch(API_LABS, { headers: authHeadersJSON() });
        const laboratorios = await res.json();
        
        if (!Array.isArray(laboratorios)) return;

        // Extraemos todos los edificios de la universidad
        const edificiosUnicos = [...new Set(laboratorios.map(l => l.edificio))];
        
        selectEdificio.innerHTML = '<option value="" disabled selected>Seleccione un edificio</option>';
        edificiosUnicos.forEach(ed => {
            selectEdificio.innerHTML += `<option value="${ed}">${ed}</option>`;
        });

        window.laboratoriosGlobales = laboratorios;
        
        // ❌ Quitamos el bloqueo/autoselección que teníamos para el profesor
        // Ahora el profesor verá el dropdown vacío para elegir el edificio que quiera.

    } catch (error) {
        console.error("Error cargando edificios:", error);
    }
}
function cargarLaboratoriosPorEdificio() {
    const edificioSeleccionado = selectEdificio.value;
    const labsDelEdificio = window.laboratoriosGlobales.filter(l => l.edificio === edificioSeleccionado);
    selectLaboratorio.innerHTML = '<option value="" disabled selected>Seleccione un laboratorio</option>';

    if (labsDelEdificio.length === 0) {
        selectLaboratorio.innerHTML = '<option value="" disabled selected>No hay laboratorios disponibles</option>';
        selectLaboratorio.disabled = true;
        selectEquipo.innerHTML = '<option value="" disabled selected>Seleccione un laboratorio primero</option>';
        selectEquipo.disabled = true;
        return;
    }

    labsDelEdificio.forEach(l => {
        selectLaboratorio.innerHTML += `<option value="${l.id_laboratorio}">${l.nombre_lab}</option>`;
    });
    selectLaboratorio.disabled = false;

    // Si solo hay un laboratorio disponible, lo seleccionamos y cargamos los equipos
    if (labsDelEdificio.length === 1) {
        selectLaboratorio.value = labsDelEdificio[0].id_laboratorio;
        cargarEquiposPorLaboratorio();
    }
}

async function cargarEquiposPorLaboratorio() {
    const idLabSeleccionado = selectLaboratorio.value;
    try {
        const res = await fetch(API_EQUIPOS, { headers: authHeadersJSON() });
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Error fetching equipos:', res.status, errorText);
            selectEquipo.innerHTML = '<option value="" disabled selected>No se pudieron cargar equipos</option>';
            selectEquipo.disabled = true;
            return;
        }
        const todosLosEquipos = await res.json();
        const equiposDelLab = todosLosEquipos.filter(e => String(e.id_laboratorio) === String(idLabSeleccionado));

        if (equiposDelLab.length === 0) {
            selectEquipo.innerHTML = '<option value="" disabled selected>No hay equipos en este laboratorio</option>';
            selectEquipo.disabled = true;
            return;
        }

        selectEquipo.innerHTML = '<option value="" disabled selected>Seleccione el equipo con falla</option>';
        equiposDelLab.forEach(e => {
            selectEquipo.innerHTML += `<option value="${e.id_equipo}">[ID: ${e.id_equipo}] ${e.nombre} - S/N: ${e.no_serie}</option>`;
        });
        selectEquipo.disabled = false;
    } catch (error) {
        console.error('Error en cargarEquiposPorLaboratorio:', error);
        selectEquipo.innerHTML = '<option value="" disabled selected>Error cargando equipos</option>';
        selectEquipo.disabled = true;
    }
}

// ----------------------------------------------------
// 3. REGISTRAR CON FORM DATA (IMAGENES)
// ----------------------------------------------------
formIncidencia.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Creamos el FormData
    const formData = new FormData();
    
    // Obtenemos los valores de los inputs
    const equipoVal = document.getElementById('selectEquipo').value;
    const descVal = document.getElementById('descFalla').value.trim();
    const fotoFile = document.getElementById('fotoIncidencia').files[0];

    // 2. Llenamos el FormData (Asegúrate de que los nombres coincidan con el server)
    formData.append('id_equipo', equipoVal);
    formData.append('descripcion', descVal);
    formData.append('fecha', new Date().toISOString().split('T')[0]);
    formData.append('hora', new Date().toLocaleTimeString('it-IT').slice(0, 8));
    
    if (fotoFile) {
        formData.append('imagen', fotoFile);
    }

    // 🔍 DEBUG: Mira esto en tu consola del navegador (F12)
    console.log("Enviando id_equipo:", equipoVal);

    try {
      const res = await fetch('/api/incidencias', {
    method: 'POST',
    headers: {
        // ✅ SOLO EL TOKEN. El navegador pondrá el Content-Type solo.
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData 
});

        // 3. Revisamos la respuesta antes de intentar leerla como JSON
        const textoRespuesta = await res.text();
        console.log("Respuesta bruta del server:", textoRespuesta);

        let data;
        try {
            data = JSON.parse(textoRespuesta);
        } catch (err) {
            throw new Error("El servidor respondió algo que no es JSON (posible error 500)");
        }

        if (res.ok) {
            alert("✅ Incidencia reportada con éxito");
            location.reload();
        } else {
            alert("❌ Error del servidor: " + (data.error || "Desconocido"));
        }

    } catch (error) {
        console.error("Error en el proceso:", error);
        alert("Ocurrió un fallo: " + error.message);
    }
});
// ----------------------------------------------------
// 4. RESOLVER
// ----------------------------------------------------
function resolverIncidencia(id) {
    document.getElementById('resolverIdIncidencia').value = id;
    document.getElementById('resolverForm').reset();
    document.getElementById('resolverModal').classList.add('active');
}

document.getElementById('resolverForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('resolverIdIncidencia').value;
    const payload = {
        estado: document.getElementById('resolverEstado').value,
        solucion: document.getElementById('resolverComentario').value.trim()
    };
    try {
        const res = await fetch(`/api/incidencias/${id}/resolver`, {
            method: 'PUT',
            headers: authHeadersJSON(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Error al resolver");
        alert("Incidencia archivada.");
        document.getElementById('resolverModal').classList.remove('active');
        cargarTablaIncidencias();
    } catch (error) {
        alert("Error al archivar.");
    }
});
function renderizarIncidencias(lista) {
    const rol = localStorage.getItem('rol');
    const tabla = document.getElementById('cuerpoTabla');
    tabla.innerHTML = '';

    lista.forEach(inc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${inc.nombre_equipo}</td>
            <td>${inc.descripcion}</td>
            <td><span class="status ${inc.estado}">${inc.estado}</span></td>
            <td>
                ${rol !== 'profesor' ? `<button onclick="abrirModalResolver(${inc.id_incidencia})">Resolver</button>` : '---'}
            </td>
        `;
        tabla.appendChild(tr);
    });
}
function prepararFormularioIncidencia() {
    const rol = localStorage.getItem('rol');
    const idLabProfe = localStorage.getItem('id_laboratorio');
    const selectLab = document.getElementById('selectLabIncidencia');

    if (rol === 'profesor' && idLabProfe) {
        selectLab.value = idLabProfe;
        selectLab.disabled = true; // El profe no puede reportar en otros labs
        cargarEquiposPorLab(idLabProfe); // Carga solo los equipos de SU lab
    }
}