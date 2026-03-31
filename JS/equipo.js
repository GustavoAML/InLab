const API_URL = '/api/equipos';
const LABS_URL = '/api/laboratorios';
const token = localStorage.getItem('token');

if (!token) { window.location.href = 'login.html'; }

document.addEventListener('DOMContentLoaded', () => {
    cargarEquipos();
    cargarLaboratorios();
    document.getElementById('btnNuevo').addEventListener('click', () => abrirModal('add'));
    document.getElementById('equipoForm').addEventListener('submit', guardarEquipo);
});

async function cargarEquipos() {
    try {
        const response = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al obtener equipos');
        const equipos = await response.json();
        mostrarEquipos(equipos);
    } catch (error) {
        console.error('Error:', error);
    }
}

function mostrarEquipos(equipos) {
    const contenedorPrincipal = document.getElementById('listaEquipos');
    contenedorPrincipal.innerHTML = '';

    // --- LÓGICA DE AGRUPAMIENTO POR EDIFICIO ---
    const grupos = equipos.reduce((acc, e) => {
        const edif = e.edificio || "Sin Edificio";
        if (!acc[edif]) acc[edif] = [];
        acc[edif].push(e);
        return acc;
    }, {});

    // Recorremos cada edificio y creamos su sección
    for (const edificio in grupos) {
        const labGroup = document.createElement('div');
        labGroup.className = 'lab-group';
        
        labGroup.innerHTML = `
            <h3 class="lab-title">🏢 ${edificio}</h3>
            <div class="equipment-grid-inner"></div>
        `;
        
        const gridInner = labGroup.querySelector('.equipment-grid-inner');

        grupos[edificio].forEach(e => {
            let temaClase = '';
            let badgeClase = '';

            if (e.estado === 'Disponible') { temaClase = 'green-theme'; badgeClase = 'status-available'; }
            else if (e.estado === 'En uso') { temaClase = 'blue-theme'; badgeClase = 'status-in-use'; }
            else if (e.estado === 'Mantenimiento') { temaClase = 'orange-theme'; badgeClase = 'status-maintenance'; }
            else if (e.estado === 'Fuera de servicio') { temaClase = 'red-theme'; badgeClase = 'status-out-of-service'; }

            const card = document.createElement('div');
            card.className = `eq-card ${temaClase}`;
            card.innerHTML = `
                <div class="eq-status-container">
                    <span class="status-badge ${badgeClase}">${e.estado}</span>
                </div>
                <div class="eq-icon-box">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/>
                    </svg>
                </div>
                <div class="eq-info">
                    <span class="eq-id">ID: ${e.id_equipo}</span>
                    <h4>${e.nombre}</h4>
                    <p class="sn-text">S/N: ${e.no_serie}</p>
                    <div class="db-details">
                        <span>📁 Tipo: ${e.tipo}</span>
                        <span>📍 Lab: ${e.nombre_lab}</span>
                    </div>
                </div>
                <div class="eq-actions">
                    <button class="btn-eq-edit" onclick="abrirModal('edit', ${e.id_equipo}, '${e.nombre}', '${e.no_serie}', '${e.estado}', '${e.tipo}', ${e.id_laboratorio})">Editar</button>
                    <button class="btn-eq-delete" onclick="abrirDeleteModal(${e.id_equipo}, '${e.nombre}')">Borrar</button>
                </div>
            `;
            gridInner.appendChild(card);
        });
        contenedorPrincipal.appendChild(labGroup);
    }
}

async function cargarLaboratorios() {
  try {
    const response = await fetch(LABS_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Error al obtener laboratorios');

    const labs = await response.json();
    const select = document.getElementById('id_laboratorio');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar Lab...</option>';
    labs.forEach(l => {
      const option = document.createElement('option');
      option.value = l.id_laboratorio;
      option.textContent = l.nombre_lab;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar laboratorios:', error);
  }
}

function abrirModal(mode, id = '', nombre = '', no_serie = '', estado = 'En uso', tipo = 'Computadora', id_laboratorio = '') {
  document.getElementById('modalTitle').innerText = mode === 'add' ? 'Registrar Nuevo Equipo' : 'Editar Equipo';
  document.getElementById('equipoId').value = id;
  document.getElementById('nombre').value = nombre;
  document.getElementById('no_serie').value = no_serie;
  document.getElementById('estado').value = estado;
  document.getElementById('tipo').value = tipo;
  document.getElementById('id_laboratorio').value = id_laboratorio;

  document.getElementById('equipoModal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

async function guardarEquipo(e) {
  e.preventDefault();

 const equipo = {
    nombre: document.getElementById('nombre').value.trim(),
    no_serie: document.getElementById('no_serie').value.trim(),
    estado: document.getElementById('estado').value,
    tipo: document.getElementById('tipo').value,
    id_laboratorio: document.getElementById('id_laboratorio').value,
    // edificio: document.getElementById('edificio').value // <--- QUITA ESTO si falla
};

  const id = document.getElementById('equipoId').value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API_URL}/${id}` : API_URL;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(equipo)
    });

    if (!response.ok) throw new Error('Error al guardar equipo');

    closeModal('equipoModal');
    cargarEquipos();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message);
  }
}

function abrirDeleteModal(id, nombre) {
  document.getElementById('deleteTarget').innerText = nombre;
  document.getElementById('deleteModal').classList.add('active');
  document.querySelector('.btn-danger-action').onclick = () => eliminarEquipo(id);
}

async function eliminarEquipo(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Error al eliminar equipo');

    closeModal('deleteModal');
    cargarEquipos();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message);
  }
}