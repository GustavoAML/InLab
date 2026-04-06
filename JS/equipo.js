const API_URL = 'http://localhost:3000/api/equipos';

 let equipoAEliminar = null;

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

// Cargar equipos al iniciar
window.onload = cargarEquipos;

// Botón nuevo
btnNuevo.addEventListener('click', () => {
  prepararModoCrear();
});

// Manejar formulario
equipoForm.addEventListener('submit', guardarOActualizar);

// Obtener token
function getToken() {
  return localStorage.getItem('token');
}

// =============================
// CARGAR EQUIPOS
// =============================
async function cargarEquipos() {
  try {

    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener Equipos');
    }

    const equipos = await response.json();
    mostrarEquipos(equipos);

  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Error al cargar equipos');
  }
}

// =============================
// MOSTRAR EQUIPOS
// =============================
function mostrarEquipos(equipos) {

  listaEquipos.innerHTML = '';

  //Agrupar por laboratorio
  const grupos = {};

  equipos.forEach(e => {
    if (!grupos[e.id_laboratorio]) {
      grupos[e.id_laboratorio] = {
        nombre_lab: e.nombre_lab,
        edificio: e.edificio,
        equipos: []
      };
    }
    grupos[e.id_laboratorio].equipos.push(e);
  });

  // 🔥 Recorrer cada laboratorio
  Object.values(grupos).forEach(grupo => {

    let html = `
      <div class="lab-section">
        <h2 class="lab-title">📍 ${grupo.nombre_lab} - ${grupo.edificio}</h2>
        <div class="equipment-grid">
    `;

    grupo.equipos.forEach(e => {

      html += `
        <div class="equipment-grid-inner">
          <div class="eq-card green-theme">
              <div class="eq-status-container">
                    <span class="status-badge status-available"></span>
              </div>

              <div class="eq-icon-box">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="3" width="20" height="14" rx="2"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                  </svg>
              </div>

              <div class="eq-info">
                  <span class="eq-id">ID: ${e.id_equipo}</span>
                  <h4>${e.nombre} ${e.numero}</h4>
                  <p class="sn-text">S/N: ${e.no_serie}</p>
                  <div class="db-details">
                      <span>📁 Tipo: ${e.tipo}</span>
                  </div>
              </div>

              <div class="eq-actions">
                  <button class="btn-eq-edit" onclick='abrirEditar(${JSON.stringify(e)})'>Editar</button>
                  <button class="btn-eq-delete" onclick="abrirModalEliminar(${e.id_equipo}, '${e.nombre}', '${e.numero}')">Borrar</button>
              </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    listaEquipos.innerHTML += html;

  });

}

// =============================
// GUARDAR O ACTUALIZAR
// =============================
async function guardarOActualizar(event) {

  event.preventDefault();

  const id = inputId.value;

  const equipos = {
    nombre: inputNombre.value.trim(),
    numero: inputNumero.value,
    no_serie: inputNoSerie.value,
    tipo: inputTipo.value,
    id_laboratorio: inputIdLaboratorio.value,
  };

  try {

    let response;

    // ====================
    // CREAR
    // ====================
    if (!id) {

      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(equipos)
      });

    }

    // ====================
    // EDITAR
    // ====================
    else {

      response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(equipos)
      });

    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error en la operación');
    }

    document.getElementById('equipoModal').classList.remove('active');

    // limpiar
    equipoForm.reset();
    inputId.value = '';

    await cargarEquipos();

  } catch (error) {

    console.error('Error:', error);
    alert(error.message || 'Error al guardar/editar');

  }

}

// =============================
// EDITAR
// =============================
async function abrirEditar(equipos) {

  inputId.value = equipos.id_equipo;
  inputNombre.value = equipos.nombre || '';
  inputNumero.value = equipos.numero || '';
  inputNoSerie.value = equipos.no_serie || '';
  inputTipo.value = equipos.tipo || '';

  await cargarLaboratorios();

  inputIdLaboratorio.value = equipos.id_laboratorio || '';
  
  modalTitulo.textContent = 'Editar Equipo';
  btnGuardar.textContent = 'Actualizar';

  // 🔥 ABRIR MODAL
  document.getElementById('equipoModal').classList.add('active');

}

// =============================
// PREPARAR CREAR
// =============================
function prepararModoCrear() {

  inputId.value = '';
  equipoForm.reset();

  modalTitulo.textContent = 'Nuevo Equipo';
  btnGuardar.textContent = 'Guardar';

}

function abrirModalEliminar(id_equipo, nombre, numero) {
    equipoAEliminar = id_equipo;

    document.getElementById('deleteTarget').innerText = nombre +" "+ numero;

    document.getElementById('deleteModal').classList.add('active');
}

// =============================
// ELIMINAR
// =============================
async function confirmarEliminacion() {

    if (!equipoAEliminar) return;

    try {

        const response = await fetch(`${API_URL}/${equipoAEliminar}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Error al eliminar');
        }

        // cerrar modal
        closeModal('deleteModal');

        // recargar lista
        await cargarEquipos();

        // limpiar variable
        equipoAEliminar = null;

    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error al eliminar');
    }
}

//Cargar responsables
async function cargarLaboratorios() {
    const select = document.getElementById('id_laboratorio');

    try {
        // Petición al endpoint
        const respuesta = await fetch('/api/laboratorios', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        const laboratorios = await respuesta.json();

        console.log(laboratorios);

        // Limpiar el select y poner opción inicial
        select.innerHTML = `<option value="">Seleccione un laboratorio...</option>`;

        //El ciclo forEach
        laboratorios.forEach(item => {
            // Crear el elemento <option>
            const opcion = document.createElement('option');

            // Asignar los valores
            opcion.value = item.id_laboratorio;
            opcion.textContent = `${item.nombre_lab} - ${item.edificio}`;

            //Insertarlo en el select
            select.appendChild(opcion);
        });

    } catch (error) {
        console.error("Error al cargar laboratorios:", error);
    }
}


// Llamar a la función cuando cargue la página
document.addEventListener('DOMContentLoaded', cargarLaboratorios);