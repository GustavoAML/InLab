// dashboard.js - Manejo de token, rol y carga de datos del dashboard
const token = localStorage.getItem('token');
const nombreUsuario = localStorage.getItem('nombre');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validamos que existan los datos
    const rolRaw = localStorage.getItem('rol');

    if (!token || !rolRaw) {
        window.location.href = 'login.html';
        return;
    }

    const rol = rolRaw.trim().toLowerCase();
    console.log("Rol detectado:", rol);

    // 2. LÓGICA DE VISIBILIDAD
    if (rol === 'encargado') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });
    } else if (rol === 'admin') {
        document.querySelectorAll('.nav-item').forEach(el => {
            el.style.setProperty('display', 'block', 'important');
        });
    }

    actualizarSaludo();
    cargarEstadisticas();
    cargarIncidenciasRecientes();
});

function actualizarSaludo() {
    const el = document.getElementById('userName');
    if (el && nombreUsuario) el.innerText = nombreUsuario;
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function cargarEstadisticas() {
    try {
        // 1. Cargar Stats Generales (Tarjetas)
        const res = await fetch('/api/dashboard/stats', { headers: authHeaders() });
        if (!res.ok) {
            if (res.status === 401) return manejarNoAutorizado();
            throw new Error('Error al obtener estadísticas');
        }
        const data = await res.json();

        const pcEl = document.getElementById('countPC');
        const monEl = document.getElementById('countMonitores');
        const conEl = document.getElementById('countConsumibles');

        if (pcEl) pcEl.innerText = data.totalPCs ?? 0;
        if (monEl) monEl.innerText = data.totalMonitores ?? 0;
        if (conEl) conEl.innerText = `Total: ${data.stockTotalConsumibles ?? 0}`;

        // 2. Cargar Mini-Tabla de Consumibles
        const resCon = await fetch('/api/consumibles', { headers: authHeaders() });
        const consumibles = await resCon.json();

        const tbodyStock = document.getElementById('listaConsumiblesDashboard');
        if (tbodyStock) {
            tbodyStock.innerHTML = '';
            (consumibles || []).slice(0, 5).forEach(c => {
                const tr = document.createElement('tr');
                let indicadorText = '';
                let indicadorClass = '';
                
                if (c.stock <= 5) {
                    indicadorText = '⚠️ Crítico';
                    indicadorClass = 'stock-critical';
                } else if (c.stock <= 15) {
                    indicadorText = '📦 Por agotarse';
                    indicadorClass = 'stock-warning';
                } else {
                    indicadorText = '✅ Abastecido';
                    indicadorClass = 'stock-ok';
                }

                // AQUÍ AGREGAMOS EL ID (c.id) Y LA UBICACIÓN
                tr.innerHTML = `
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 0.65rem; color: #94a3b8; font-weight: bold;">ID: ${c.id ?? '—'}</span>
                                <span style="font-weight: 600;">${escapeHtml(c.nombre_con)}</span>
                            </div>
                            <small style="color: var(--primary-cyan); font-size: 0.72rem; opacity: 0.8;">
                                📍 ${escapeHtml(c.nombre_lab)} — ${escapeHtml(c.edificio)}
                            </small>
                        </div>
                    </td>
                    <td style="font-weight: bold; text-align: center;">${c.stock ?? 0}</td>
                    <td><span class="status ${indicadorClass}">${indicadorText}</span></td>
                `;
                tbodyStock.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error al cargar Estadísticas:', error);
    }
}

async function cargarIncidenciasRecientes() {
    try {
        const res = await fetch('/api/dashboard/incidencias-recientes', { headers: authHeaders() });
        if (!res.ok) throw new Error('Error al obtener incidencias');
        const incidencias = await res.json();

        const tbody = document.getElementById('tablaIncidencias');
        if (tbody) tbody.innerHTML = '';

        const pendientes = (incidencias || []).filter(i => (i.estado || '').toLowerCase() === 'pendiente').length;
        const critEl = document.getElementById('criticasCount');
        if (critEl) critEl.innerText = `${pendientes} incidencias`;

        (incidencias || []).forEach(i => {
            const tr = document.createElement('tr');
            const estado = (i.estado || '').toString();
            const statusClass = estado.toLowerCase() === 'pendiente' ? 'pending' : 'resolved';

            tr.innerHTML = `
                <td>${escapeHtml(i.nombre_equipo)} ${i.no_serie ? `(${escapeHtml(i.no_serie)})` : ''}</td>
                <td>${escapeHtml(i.nombre_usuario)}</td>
                <td>${escapeHtml(i.tipo_equipo)}</td>
                <td><span class="status ${statusClass}">${escapeHtml(estado.toUpperCase())}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error incidencias:', error);
    }
}

function irAPractica(tipo) {
    const rol = localStorage.getItem('rol').trim().toLowerCase();
    const rutas = {
        'usuarios': 'usuario.html',
        'laboratorios': 'laboratorios.html',
        'encargados': 'encargado.html',
        'consumibles': 'consumibles.html',
        'equipos': 'equipo.html',
        'dashboard': 'Dashboard.html',
        'historial_completo': 'historial_completo.html',
        'incidencias_actual': 'incidencias_actual.html'
    };

    if (rol === 'encargado' && ['usuarios', 'laboratorios', 'encargados'].includes(tipo)) {
        alert("Acceso restringido: Solo Administradores.");
        return;
    }

    if (rutas[tipo]) {
        window.location.href = rutas[tipo];
    }
}

function manejarNoAutorizado() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function toggleDrawer() {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer) drawer.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

window.irAPractica = irAPractica;
window.toggleDrawer = toggleDrawer;
window.logout = logout;