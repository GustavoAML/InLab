const token = localStorage.getItem('token');
const nombreUsuario = localStorage.getItem('nombre');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) { window.location.href = 'login.html'; return; }
    
    actualizarSaludo();
    cargarEstadisticas();
    cargarIncidenciasRecientes();
});

function actualizarSaludo() {
    if (nombreUsuario) {
        document.getElementById('userName').innerText = nombreUsuario;
    }
}

// Carga las 3 tarjetas superiores
async function cargarEstadisticas() {
    try {
        const res = await fetch('http://localhost:3000/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        // 1. Números principales
        document.getElementById('countPC').innerText = data.totalPCs || 0;
        document.getElementById('countMonitores').innerText = data.totalMonitores || 0;
        document.getElementById('countConsumibles').innerText = `Total: ${data.stockTotalConsumibles || 0}`;

        // 2. Llenar tabla de stock
        const resCon = await fetch('http://localhost:3000/api/consumibles', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const consumibles = await resCon.json();
        
        const tbodyStock = document.getElementById('listaConsumiblesDashboard');
        tbodyStock.innerHTML = '';

        // Solo mostramos los primeros 4 o 5 para no saturar
        consumibles.slice(0, 5).forEach(c => {
    const tr = document.createElement('tr');
    
    // Nueva lógica más descriptiva
    let indicador;
    if (c.stock <= 5) {
        indicador = '<span style="color:#ef4444; font-weight:bold;">⚠️ Crítico</span>';
    } else if (c.stock <= 15) {
        indicador = '<span style="color:#f39c12; font-weight:bold;">📦 Por agotarse</span>';
    } else {
        indicador = '<span style="color:#22c55e;">✅ Abastecido</span>';
    }

    tr.innerHTML = `
        <td>${c.nombre_con}</td>
        <td>${c.stock}</td>
        <td>${indicador}</td>
    `;
    tbodyStock.appendChild(tr);
});

    } catch (error) {
        console.error("Error al cargar Dashboard:", error);
    }
}

// Carga la tabla inferior
async function cargarIncidenciasRecientes() {
    try {
        const res = await fetch('/api/dashboard/incidencias-recientes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const incidencias = await res.json();
        
        const tbody = document.getElementById('tablaIncidencias');
        tbody.innerHTML = '';

        // Actualizar contador de pendientes en el saludo
        const pendientes = incidencias.filter(i => i.estado.toUpperCase() === 'PENDIENTE').length;
        document.getElementById('criticasCount').innerText = `${pendientes} incidencias`;

        incidencias.forEach(i => {
            const tr = document.createElement('tr');
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
        console.error("Error incidencias:", error);
    }
}

// Navegación
function irAPractica(tipo) {
    const rol = localStorage.getItem('rol');
    const rutas = {
        'laboratorios': 'laboratorios.html', 'consumibles': 'consumibles.html',
        'encargados': 'encargado.html', 'equipos': 'equipo.html',
        'usuario': 'usuario.html', 'historial_completo': 'historial_completo.html',
        'incidencias_actual': 'incidencias_actual.html'
    };
    if (rol !== 'admin' && (tipo === 'usuario' || tipo === 'laboratorios')) return;
    if(rutas[tipo]) window.location.href = rutas[tipo];
}

function toggleDrawer() {
    document.getElementById('sideDrawer').classList.toggle('active');
    document.getElementById('drawerOverlay').classList.toggle('active');
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}