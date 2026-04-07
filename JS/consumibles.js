const API_URL = 'http://localhost:3000/api/consumibles';
let consumibleAEliminar = null;

const listaConsumibles = document.getElementById('listaConsumibles');
const conForm = document.getElementById('conForm');
const modalTitulo = document.getElementById('modalTitle');
const btnGuardar = document.getElementById('btnGuardar');
const btnNuevo = document.getElementById('btnNuevo');

const inputId = document.getElementById('consumibleId');
const inputNombre = document.getElementById('nombre');
const inputStock = document.getElementById('stock');
const inputIdLaboratorio = document.getElementById('id_laboratorio');

window.onload = cargarConsumibles;

btnNuevo.addEventListener('click', () => { prepararModoCrear(); document.getElementById('conModal').classList.add('active'); });
conForm.addEventListener('submit', guardarOActualizar);

function getToken() { return localStorage.getItem('token'); }

async function cargarConsumibles() {
    try {
        const response = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Error al obtener consumibles');
        const consumibles = await response.json();
        mostrarConsumibles(consumibles);
    } catch (error) {
        console.error('Error:', error);
    }
}

function mostrarConsumibles(consumibles) {
    listaConsumibles.innerHTML = '';
    
    // AGRUPAR POR LABORATORIO
    const grupos = consumibles.reduce((acc, c) => {
        const labKey = `${c.nombre_lab} - ${c.edificio}`;
        if (!acc[labKey]) acc[labKey] = [];
        acc[labKey].push(c);
        return acc;
    }, {});

    for (const lab in grupos) {
        const labSection = document.createElement('div');
        labSection.className = 'lab-group'; // Clase de Equipos
        
        labSection.innerHTML = `
            <h3 class="lab-title">📍 ${lab}</h3>
            <div class="equipment-grid-inner"></div>
        `;
        
        const gridInner = labSection.querySelector('.equipment-grid-inner');

        grupos[lab].forEach(c => {
            const card = document.createElement('div');
            card.className = `eq-card blue-theme`; // Usamos el diseño de tarjetas de equipos
            
            card.innerHTML = `
                <div class="eq-status-container">
                    <span class="status-badge status-in-use">STOCK: ${c.stock}</span>
                </div>
                
                <div class="eq-icon-box">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4"/>
                    </svg>
                </div>

                <div class="eq-info">
                    <span class="eq-id">ID: ${c.id}</span>
                    <h4>${c.nombre_con}</h4>
                    <p class="sn-text">Existencia: ${c.stock} unidades</p>
                    <div class="db-details">
                        <span>🏢 Ubicación: ${c.edificio}</span>
                        <span>📍 Lab: ${c.nombre_lab}</span>
                    </div>
                </div>

                <div class="eq-actions">
                    <button class="btn-eq-edit" onclick='abrirEditar(${JSON.stringify(c)})'>Editar</button>
                    <button class="btn-eq-delete" onclick="abrirModalEliminar('${c.id}', '${c.nombre_con}')">Eliminar</button>
                </div>
            `;
            gridInner.appendChild(card);
        });
        listaConsumibles.appendChild(labSection);
    }
}
// =============================
// GUARDAR O ACTUALIZAR
// =============================
async function guardarOActualizar(event) {

  event.preventDefault();

  const id = inputId.value;

  const consumible = {
    nombre: inputNombre.value.trim(),
    stock: inputStock.value,
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
        body: JSON.stringify(consumible)
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
        body: JSON.stringify(consumible)
      });

    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error en la operación');
    }

    document.getElementById('conModal').classList.remove('active');

    // limpiar
    conForm.reset();
    inputId.value = '';

    await cargarConsumibles();

  } catch (error) {

    console.error('Error:', error);
    alert(error.message || 'Error al guardar/editar');

  }

}

// =============================
// EDITAR
// =============================
async function abrirEditar(consumible) {

  inputId.value = consumible.id;
  inputNombre.value = consumible.nombre_con || '';
  inputStock.value = consumible.stock || '';

  await cargarLaboratorios();

  inputIdLaboratorio.value = consumible.id_laboratorio || '';
  
  modalTitulo.textContent = 'Editar Consumible';
  btnGuardar.textContent = 'Actualizar';

  document.getElementById('conModal').classList.add('active');

}

// =============================
// PREPARAR CREAR
// =============================
function prepararModoCrear() {

  inputId.value = '';
  conForm.reset();

  modalTitulo.textContent = 'Nuevo Consumible';
  btnGuardar.textContent = 'Guardar';

}

function abrirModalEliminar(id, nombre_con) {
    consumibleAEliminar = id;

    document.getElementById('deleteTarget').innerText = nombre_con;

    document.getElementById('deleteModal').classList.add('active');
}

// =============================
// ELIMINAR
// =============================
async function confirmarEliminacion() {

    if (!consumibleAEliminar) return;

    try {

        const response = await fetch(`${API_URL}/${consumibleAEliminar}`, {
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
        await cargarConsumibles();

        // limpiar variable
        consumibleAEliminar = null;

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