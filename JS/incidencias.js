// ==========================================
// incidencias_actual.js 
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

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

// ----------------------------------------------------
// 1. INICIALIZACIÓN Y CARGA DE TABLA
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    cargarTablaIncidencias(); 
});

async function cargarTablaIncidencias() {
    try {
        const res = await fetch('/api/incidencias/actuales', { headers: authHeaders() });
        const incidencias = await res.json();
        
        const rol = (localStorage.getItem('rol') || '').trim().toLowerCase();
        const tbody = document.querySelector('#tablaIncidencias tbody');
        tbody.innerHTML = '';

        let incidenciasMostrables = [];

        if (rol === 'admin') {
            incidenciasMostrables = incidencias;
        } else {
            // Para encargado, obtenemos sus laboratorios asignados para filtrar dinámicamente
            const resLabs = await fetch(API_LABS, { headers: authHeaders() });
            const misLabs = await resLabs.json();
            
            // Creamos una lista de IDs (como strings) de TODOS sus laboratorios
            const misIdsLabs = misLabs.map(l => String(l.id_laboratorio));
            
            // Filtramos incidencias que pertenezcan a cualquiera de esos laboratorios
            incidenciasMostrables = incidencias.filter(inc => 
                misIdsLabs.includes(String(inc.id_laboratorio))
            );
        }

        if (incidenciasMostrables.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No hay incidencias pendientes en tus laboratorios</td></tr>`;
            return;
        }

        incidenciasMostrables.forEach(inc => {
            const tr = document.createElement('tr');
            const fechaF = inc.fecha ? String(inc.fecha).split('T')[0] : 'S/F';
            
            tr.innerHTML = `
                <td>${inc.id_incidencia}</td>
                <td>
                    <strong>${inc.nombre_equipo}</strong><br>
                    <small style="color:var(--primary-cyan)">ID Eq: ${inc.id_equipo}</small>
                </td>
                <td>
                    <strong>${inc.nombre_usuario}</strong><br>
                    <small>ID User: ${inc.id_usuario}</small>
                </td>
                <td>${fechaF} | ${inc.hora}</td>
                <td class="desc-cell">${inc.descripcion}</td>
                <td><span class="status pending" style="background:rgba(239,68,68,0.2); color:#ef4444; padding:4px 8px; border-radius:6px; font-size:0.8rem; font-weight:bold;">ABIERTA</span></td>
                <td>
                    <button class="btn-edit" style="padding: 5px 10px;" onclick="resolverIncidencia(${inc.id_incidencia})">Resolver</button>
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
    
    const rol = (localStorage.getItem('rol') || '').trim().toLowerCase();
    
    if (rol === 'admin') {
        await cargarEdificiosAdmin();
        selectEdificio.required = true; 
    } else if (rol === 'encargado') {
        if (document.getElementById('grupoEdificio')) {
            document.getElementById('grupoEdificio').style.display = 'none';
        }
        selectEdificio.required = false; 
        selectLaboratorio.disabled = false;
        selectLaboratorio.innerHTML = '<option value="" disabled selected>Cargando tus laboratorios...</option>';
        
        try {
            const res = await fetch(API_LABS, { headers: authHeaders() });
            const todosLosLabs = await res.json();
            
            selectLaboratorio.innerHTML = '<option value="" disabled selected>Selecciona un laboratorio</option>';
            todosLosLabs.forEach(lab => {
                selectLaboratorio.innerHTML += `<option value="${lab.id_laboratorio}">${lab.nombre_lab} - ${lab.edificio}</option>`;
            });
        } catch (error) {
            console.error("Error cargando labs de encargado:", error);
        }
    }
}

async function cargarEdificiosAdmin() {
    try {
        const res = await fetch(API_LABS, { headers: authHeaders() });
        const laboratorios = await res.json();
        const edificiosUnicos = [...new Set(laboratorios.map(l => l.edificio))];
        
        selectEdificio.innerHTML = '<option value="" disabled selected>Seleccione un edificio</option>';
        edificiosUnicos.forEach(ed => {
            selectEdificio.innerHTML += `<option value="${ed}">${ed}</option>`;
        });
        window.laboratoriosGlobales = laboratorios;
    } catch (error) {
        console.error(error);
    }
}

function cargarLaboratoriosPorEdificio() {
    const edificioSeleccionado = selectEdificio.value;
    const labsDelEdificio = window.laboratoriosGlobales.filter(l => l.edificio === edificioSeleccionado);
    selectLaboratorio.innerHTML = '<option value="" disabled selected>Seleccione un laboratorio</option>';
    labsDelEdificio.forEach(l => {
        selectLaboratorio.innerHTML += `<option value="${l.id_laboratorio}">${l.nombre_lab}</option>`;
    });
    selectLaboratorio.disabled = false;
}

async function cargarEquiposPorLaboratorio() {
    const idLabSeleccionado = selectLaboratorio.value;
    try {
        const res = await fetch(API_EQUIPOS, { headers: authHeaders() });
        const todosLosEquipos = await res.json();
        const equiposDelLab = todosLosEquipos.filter(e => String(e.id_laboratorio) === String(idLabSeleccionado));

        selectEquipo.innerHTML = '<option value="" disabled selected>Seleccione el equipo con falla</option>';
        equiposDelLab.forEach(e => {
            selectEquipo.innerHTML += `<option value="${e.id_equipo}">[ID: ${e.id_equipo}] ${e.nombre} - S/N: ${e.no_serie}</option>`;
        });
        selectEquipo.disabled = false;
    } catch (error) {
        console.error(error);
    }
}

// ----------------------------------------------------
// 3. REGISTRAR Y RESOLVER
// ----------------------------------------------------
formIncidencia.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id_equipo = selectEquipo.value;
    const descripcion = descFalla.value.trim();
    if(!id_equipo) return alert("Por favor selecciona un equipo");

    const ahora = new Date();
    const tzOffset = ahora.getTimezoneOffset() * 60000; 
    const fechaLocalIso = (new Date(ahora - tzOffset)).toISOString();
    
    const payload = {
        id_equipo: id_equipo,
        fecha: fechaLocalIso.split('T')[0],
        hora: fechaLocalIso.split('T')[1].slice(0, 8),
        descripcion: descripcion,
        estado: 'pendiente'
    };

    try {
        const res = await fetch(API_INCIDENCIAS, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Error en el servidor");
        alert("¡Reporte enviado exitosamente!");
        document.getElementById('incidenciaModal').classList.remove('active');
        cargarTablaIncidencias();
    } catch (error) {
        alert("Error al registrar incidencia.");
    }
});

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
            headers: authHeaders(),
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

// Buscador
if (inputBusqueda) {
    inputBusqueda.addEventListener('keyup', function() {
        const texto = this.value.toLowerCase();
        document.querySelectorAll('#tablaIncidencias tbody tr').forEach(fila => {
            fila.style.display = fila.innerText.toLowerCase().includes(texto) ? '' : 'none';
        });
    });
}