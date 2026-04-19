// equipo.js - Gestión de Inventario INLAB
const API_URL = '/api/equipos';
let equipoAEliminar = null;

// Elementos del DOM
const listaEquipos = document.getElementById('listaEquipos');
const equipoForm = document.getElementById('equipoForm');
const modalTitulo = document.getElementById('modalTitle');
const btnGuardar = document.getElementById('btnGuardar');
const btnNuevo = document.getElementById('btnNuevo');
const inputId = document.getElementById('equipoId');
const inputNombre = document.getElementById('nombre');
const inputNumero = document.getElementById('numero');
const inputNoSerie = document.getElementById('no_serie');
const inputIdLaboratorio = document.getElementById('id_laboratorio');
const inputTipo = document.getElementById('tipo');
const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');

// ✅ AGREGADA: Función para proteger texto
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// =============================
// INICIO Y SEGURIDAD
// =============================
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const rol = (localStorage.getItem('rol') || '').trim().toLowerCase();

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (rol === 'encargado') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });
    }

    cargarEquipos();
    cargarLaboratorios();
});

if (btnConfirmarEliminar) btnConfirmarEliminar.addEventListener('click', confirmarEliminacion);
if (btnNuevo) btnNuevo.addEventListener('click', prepararModoCrear);
if (equipoForm) equipoForm.addEventListener('submit', guardarOActualizar);

function getToken() { return localStorage.getItem('token'); }
function getRol() { return (localStorage.getItem('rol') || '').trim().toLowerCase(); }
function getIdLaboratorioUsuario() {
    const v = localStorage.getItem('id_laboratorio');
    return v ? parseInt(v, 10) : null;
}

// =============================
// NAVEGACIÓN
// =============================
function irAPractica(tipo) {
    const rol = getRol();
    const rutas = {
        'usuario': 'usuario.html',
        'usuarios': 'usuario.html',
        'laboratorios': 'laboratorios.html',
        'encargados': 'encargado.html',
        'consumibles': 'consumibles.html',
        'equipos': 'equipo.html',
        'equipo': 'equipo.html',
        'dashboard': 'Dashboard.html',
        'historial_completo': 'historial_completo.html',
        'incidencias_actual': 'incidencias_actual.html'
    };

    const prohibidoEncargado = ['usuario', 'usuarios', 'laboratorios', 'encargados'];
    if (rol === 'encargado' && prohibidoEncargado.includes(tipo)) {
        alert("Acceso restringido: Solo Administradores.");
        return;
    }

    if (rutas[tipo]) window.location.href = rutas[tipo];
}

// =============================
// FUNCIONES DE CARGA Y CRUD
// =============================
async function cargarEquipos() {
    try {
        // ✅ Pide equipos e incidencias al mismo tiempo para saber el estado
        const [resEq, resInc] = await Promise.all([
            fetch(API_URL, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
            fetch('/api/incidencias/actuales', { headers: { 'Authorization': `Bearer ${getToken()}` } })
        ]);

        if (!resEq.ok || !resInc.ok) throw new Error('Error al obtener datos');
        
        const equipos = await resEq.json();
        const incidencias = await resInc.json();

        mostrarEquipos(equipos, incidencias);
    } catch (error) {
        console.error('Error:', error);
    }
}

// ✨ FUNCIÓN MOSTRAR EQUIPOS (Mantiene tu CSS intacto)
function mostrarEquipos(equipos, incidencias) {
    if(!listaEquipos) return;
    listaEquipos.innerHTML = '';
    const grupos = {};

    equipos.forEach(e => {
        if (!grupos[e.id_laboratorio]) {
            grupos[e.id_laboratorio] = { nombre_lab: e.nombre_lab, edificio: e.edificio, equipos: [] };
        }
        grupos[e.id_laboratorio].equipos.push(e);
    });

    Object.values(grupos).forEach(grupo => {
        let html = `<div class="lab-section"><h2 class="lab-title">📍 ${grupo.nombre_lab} - ${grupo.edificio}</h2><div class="equipment-grid">`;
        
        grupo.equipos.forEach(e => {
            // Buscamos si este equipo tiene falla activa
           const tieneFalla = incidencias.some(inc => Number(inc.id_equipo) === Number(e.id_equipo));
            
            // ✅ Badge de estado (Añadido sin romper tu CSS)
           const statusBadge = tieneFalla 
        ? '<span class="status-badge error" style="background: rgba(255, 68, 68, 0.2); color: #ff4444; border: 1px solid #ff4444; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold;">🛠️ MANTENIMIENTO</span>' 
        : '<span class="status-badge success" style="background: rgba(0, 255, 136, 0.2); color: #00ff88; border: 1px solid #00ff88; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold;">✅ ACTIVO</span>';
            const iconoSVG = e.tipo === 'PC' 
                ? '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>'
                : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="12" rx="2" ry="2"/><line x1="12" y1="16" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>';

            html += `
                <div class="equipment-grid-inner">
                    <div class="eq-card green-theme">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                            <div class="eq-icon-box">${iconoSVG}</div>
                            ${statusBadge}
                        </div>
                        <div class="eq-info">
                            <span class="eq-id">ID: ${e.id_equipo}</span>
                            <h4>${escapeHtml(e.nombre)}</h4> 
                            <div class="data-stack" style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 12px 0;">
                                <p class="sn-text" style="margin:0;">S/N: ${escapeHtml(e.no_serie)}</p>
                                <span class="eq-numero">Numero de Equipo: ${e.numero || '---'}</span>
                            </div>
                            <div class="db-details"><span>📁 Tipo: ${e.tipo}</span></div>
                        </div>
                        <div class="eq-actions">
                            <button class="btn-eq-edit" onclick='abrirEditar(${JSON.stringify(e)})'>Editar</button>
                            <button class="btn-eq-delete" onclick="abrirModalEliminar(${e.id_equipo}, '${escapeForAttr(e.nombre)}', '${escapeForAttr(e.numero)}')">Borrar</button>
                        </div>
                    </div>
                </div>`;
        });
        html += `</div></div>`;
        listaEquipos.innerHTML += html;
    });
}

// ... (Resto de funciones: guardarOActualizar, abrirEditar, cargarLaboratorios, etc. se mantienen idénticas)
async function guardarOActualizar(event) {
    event.preventDefault();
    const id = inputId.value;
    const datos = {
        nombre: inputNombre.value.trim(),
        numero: inputNumero.value,
        no_serie: inputNoSerie.value,
        tipo: inputTipo.value,
        id_laboratorio: inputIdLaboratorio.value,
    };
    if (getRol() === 'encargado') datos.id_laboratorio = getIdLaboratorioUsuario();
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/${id}` : API_URL;
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify(datos)
        });
        if (!res.ok) throw new Error('Error en la operación');
        equipoForm.reset();
        closeModal('equipoModal');
        await cargarEquipos();
    } catch (error) {
        alert(error.message);
    }
}

async function abrirEditar(e) {
    inputId.value = e.id_equipo;
    inputNombre.value = e.nombre;
    inputNumero.value = e.numero;
    inputNoSerie.value = e.no_serie;
    inputTipo.value = e.tipo;
    await cargarLaboratorios();
    if (getRol() === 'encargado') {
        inputIdLaboratorio.value = getIdLaboratorioUsuario();
        inputIdLaboratorio.disabled = true;
    } else {
        inputIdLaboratorio.value = e.id_laboratorio;
        inputIdLaboratorio.disabled = false;
    }
    modalTitulo.textContent = 'Editar Equipo';
    document.getElementById('equipoModal').classList.add('active');
}

function prepararModoCrear() {
    equipoForm.reset();
    inputId.value = '';
    modalTitulo.textContent = 'Nuevo Equipo';
    if (getRol() === 'encargado') {
        inputIdLaboratorio.value = getIdLaboratorioUsuario();
        inputIdLaboratorio.disabled = true;
    }
    document.getElementById('equipoModal').classList.add('active');
}

function abrirModalEliminar(id, nombre, numero) {
    equipoAEliminar = id;
    const target = document.getElementById('deleteTarget');
    if (target) target.innerText = `${nombre} ${numero}`;
    document.getElementById('deleteModal').classList.add('active');
}

async function confirmarEliminacion() {
    if (!equipoAEliminar) return;
    try {
        const res = await fetch(`${API_URL}/${equipoAEliminar}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('No se pudo eliminar');
        closeModal('deleteModal');
        await cargarEquipos();
    } catch (error) {
        alert(error.message);
    }
}

async function cargarLaboratorios() {
    const select = document.getElementById('id_laboratorio');
    if(!select) return;
    try {
        const res = await fetch('/api/laboratorios', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const laboratorios = await res.json();
        select.innerHTML = `<option value="">Seleccione un laboratorio...</option>`;
        if (getRol() === 'encargado') {
            const idLab = getIdLaboratorioUsuario();
            const lab = laboratorios.find(l => l.id_laboratorio === idLab);
            if (lab) {
                select.innerHTML = `<option value="${lab.id_laboratorio}">${lab.nombre_lab}</option>`;
                select.value = lab.id_laboratorio;
                select.disabled = true;
            }
            return;
        }
        laboratorios.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id_laboratorio;
            opt.textContent = `${l.nombre_lab} - ${l.edificio}`;
            select.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

function escapeForAttr(str) {
    return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function toggleDrawer() {
    document.getElementById('sideDrawer').classList.toggle('active');
    document.getElementById('drawerOverlay').classList.toggle('active');
}