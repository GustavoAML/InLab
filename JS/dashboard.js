// dashboard.js - Panel de Gestión Técnica INLAB
const token = localStorage.getItem('token');
const nombreUsuario = localStorage.getItem('nombre'); // Asegúrate de guardar el nombre en el login

document.addEventListener('DOMContentLoaded', () => {
    actualizarSaludo();
    cargarEstadisticas();
    cargarIncidenciasRecientes();
});

// 1. Mostrar el nombre del usuario logueado
function actualizarSaludo() {
    if (nombreUsuario) {
        document.getElementById('userName').innerText = nombreUsuario;
    }
}

// 2. Cargar los números de las tarjetas superiores
async function cargarEstadisticas() {
    try {
        // Petición a tu API para obtener conteos
        // Nota: Ajusta las URLs según tus endpoints de Node.js/PHP
        const resEquipos = await fetch('/api/dashboard/contar-equipos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resConsumibles = await fetch('/api/dashboard/contar-consumibles', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const equipos = await resEquipos.json();
        const consumibles = await resConsumibles.json();

        // Actualizar PCs y Monitores (Tabla 'equipo')
       
        document.getElementById('countPC').innerText = equipos.pcs || 0;
        document.getElementById('countMonitores').innerText = equipos.monitores || 0;

        // Actualizar Mouses y Teclados (Tabla 'consumibles')
        document.getElementById('countMouses').innerText = consumibles.mouses || 0;
        document.getElementById('countTeclados').innerText = consumibles.teclados || 0;

    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
    }
}

// 3. Cargar las últimas incidencias en la tabla
async function cargarIncidenciasRecientes() {
    try {
        const response = await fetch('/api/dashboard/incidencias-recientes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const incidencias = await response.json();
        
        const tbody = document.getElementById('tablaIncidencias');
        tbody.innerHTML = '';

        // Actualizar contador de críticas en el saludo (ejemplo: estado 'Crítico' o 'Pendiente')
        const criticas = incidencias.filter(i => i.estado === 'PENDIENTE').length;
        document.getElementById('criticasCount').innerText = `${criticas} incidencias críticas`;

        incidencias.forEach(i => {
            const tr = document.createElement('tr');
            
            // Lógica de color de estado
            const statusClass = i.estado.toLowerCase() === 'pendiente' ? 'pending' : 'resolved';

            tr.innerHTML = `
                <td>${i.nombre_equipo} (${i.no_serie})</td>
                <td>${i.nombre_usuario}</td>
                <td>${i.tipo_equipo}</td>
                <td><span class="status ${statusClass}">${i.estado.toUpperCase()}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error al cargar incidencias:", error);
    }
}
// --- FUNCIONES GLOBALES  ---

function irAPractica(tipo) {
    // Jalamos el rol de nuevo por si acaso
    const miRol = localStorage.getItem('rol'); 
    const rutas = {
        'laboratorios': 'laboratorios.html',
        'consumibles': 'consumibles.html',
        'encargados': 'encargado.html',
        'equipos': 'equipo.html',
        'historial_completo': 'historial_completo.html',
        'incidencias_actual': 'incidencias_actual.html',
        'usuario': 'usuario.html'
    };

    // Validación de seguridad de la UTM
    if (miRol !== 'admin' && (tipo === 'usuario' || tipo === 'laboratorios')) {
        alert("No tienes permisos de administrador.");
        return;
    }

    if (rutas[tipo]) {
        window.location.href = rutas[tipo];
    }
}

function toggleDrawer() {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer && overlay) {
        drawer.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}
function toggleDrawer() {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    
    if (drawer && overlay) {
        drawer.classList.toggle('active');
        overlay.classList.toggle('active');
    } else {
        console.error("No se encontraron los elementos del Drawer en el HTML.");
    }
}