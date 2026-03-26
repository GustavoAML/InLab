const API_URL = 'http://localhost:3000/api/laboratorios';

let laboratorioAEliminar = null;

const listaLaboratorios = document.getElementById('listaLaboratorios');
const labForm = document.getElementById('labForm');

const inputId = document.getElementById('labId');
const inputNombre = document.getElementById('labName');
const inputEdificio = document.getElementById('labEdificio');
const inputPlanta = document.getElementById('labPlanta');
const inputIdEncargado = document.getElementById('id_encargado');

const modalTitulo = document.getElementById('modalTitle');
const btnGuardar = document.getElementById('btnGuardar');
const btnNuevo = document.getElementById('btnNuevo');

// Cargar consumibles al iniciar
window.onload = cargarLaboratorios;

// Botón nuevo
btnNuevo.addEventListener('click', () => {
  prepararModoCrear();
});

// Manejar formulario
labForm.addEventListener('submit', guardarOActualizar);

// Obtener token
function getToken() {
  return localStorage.getItem('token');
}

// =============================
// CARGAR LABORATORIOS
// =============================
async function cargarLaboratorios() {
  try {

    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener laboratorios');
    }

    const laboratorios = await response.json();
    mostrarLaboratorios(laboratorios);

  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Error al cargar laboratorios');
  }
}

// =============================
// MOSTRAR LABORATORIOS
// =============================
function mostrarLaboratorios(laboratorios) {

  listaLaboratorios.innerHTML = '';

  laboratorios.forEach((l) => {

    const laboratorioHTML = `
    <div class="lab-card">
                    <div class="lab-card-header">
                        <div class="lab-icon">💻</div>
                        <span class="lab-id-badge">ID: ${l.id_laboratorio}</span>
                    </div>
                    <div class="lab-card-body">
                        <h3>${l.nombre_lab}</h3>
                        <div class="lab-meta">
                            <p>🏢 <strong>Edificio:</strong> ${l.edificio}</p>
                            <p>📶 <strong>Planta:</strong> ${l.planta}</p>
                        </div>
                    </div>
                    <div class="lab-card-actions">
                        <button class="btn-lab-edit" onclick='abrirEditar(${JSON.stringify(l)})'>Editar</button>
                        <button class="btn-lab-delete" onclick="abrirModalEliminar('${l.id_laboratorio}', '${l.nombre_lab}')">Eliminar</button>
                    </div>
                </div>
    `;

    listaLaboratorios.innerHTML += laboratorioHTML;

  });

}

// =============================
// GUARDAR O ACTUALIZAR
// =============================
async function guardarOActualizar(event) {

  event.preventDefault();

  const id = inputId.value;

  const laboratorio = {
    nombre: inputNombre.value.trim(),
    edificio: inputEdificio.value,
    planta: inputPlanta.value,
    id_encargado: inputIdEncargado.value
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
        body: JSON.stringify(laboratorio)
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
        body: JSON.stringify(laboratorio)
      });

    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error en la operación');
    }

    document.getElementById('labModal').classList.remove('active');

    // limpiar
    labForm.reset();
    inputId.value = '';

    await cargarLaboratorios();

  } catch (error) {

    console.error('Error:', error);
    alert(error.message || 'Error al guardar/editar');

  }

}

// =============================
// EDITAR
// =============================
async function abrirEditar(laboratorio) {

  inputId.value = laboratorio.id_laboratorio;
  inputNombre.value = laboratorio.nombre_lab || '';
  inputEdificio.value = laboratorio.edificio || '';
  inputPlanta.value = laboratorio.planta || '';

  await cargarEncargados();

  inputIdEncargado.value = laboratorio.id_encargado || '';
  
  modalTitulo.textContent = 'Editar Laboratorio';
  btnGuardar.textContent = 'Actualizar';

  document.getElementById('labModal').classList.add('active');

}

// =============================
// PREPARAR CREAR
// =============================
function prepararModoCrear() {

  inputId.value = '';
  labForm.reset();

  modalTitulo.textContent = 'Nuevo Laboratorio';
  btnGuardar.textContent = 'Guardar';

}

function abrirModalEliminar(id, nombre_lab) {
    laboratorioAEliminar = id;

    document.getElementById('deleteTarget').innerText = nombre_lab;

    document.getElementById('deleteModal').classList.add('active');
}

// =============================
// ELIMINAR
// =============================
async function confirmarEliminacion() {

    if (!laboratorioAEliminar) return;

    try {

        const response = await fetch(`${API_URL}/${laboratorioAEliminar}`, {
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
        await cargarLaboratorios();

        // limpiar variable
        laboratorioAEliminar = null;

    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error al eliminar');
    }
}

//Cargar responsables
async function cargarEncargados() {
    const select = document.getElementById('id_encargado');

    try {
        // Petición al endpoint
        const respuesta = await fetch('/api/encargados', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        const encargados = await respuesta.json();

        console.log(encargados);

        // Limpiar el select y poner opción inicial
        select.innerHTML = `<option value="">Seleccione un encargado...</option>`;

        //El ciclo forEach
        encargados.forEach(item => {
            // Crear el elemento <option>
            const opcion = document.createElement('option');

            // Asignar los valores (ID para el sistema, Nombre del encargado y su apellido paterno)
            opcion.value = item.id_encargado;
            opcion.textContent = `${item.nombre} - ${item.appaterno}`;

            //Insertarlo en el select
            select.appendChild(opcion);
        });

    } catch (error) {
        console.error("Error al cargar encargados:", error);
    }
}

// Llamar a la función cuando cargue la página
document.addEventListener('DOMContentLoaded', cargarEncargados);
