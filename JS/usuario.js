const API_URL = 'http://localhost:3000/api/usuarios';

let usuarioAEliminar = null;

const listaUsuarios = document.getElementById('listaUsuarios');
const sinLaboratorios = document.getElementById('sinLaboratorios');
const staffForm = document.getElementById('staffForm');

const modalTitulo = document.getElementById('modalTitle');
const btnGuardar = document.getElementById('btnGuardar');
const btnNuevo = document.getElementById('btnNuevo');

const inputId = document.getElementById('usuarioId');
const inputNombre = document.getElementById('nombre');
const inputapPaterno = document.getElementById('apPaterno');
const inputapMaterno = document.getElementById('apMaterno');
const inputCorreo = document.getElementById('correo');
const inputRol = document.getElementById('rol');
const inputPassword = document.getElementById('password');

// Cargar Usuarios al iniciar
window.onload = cargarUsuarios;

// Botón nuevo
btnNuevo.addEventListener('click', () => {
  prepararModoCrear();
});

// Manejar formulario
staffForm.addEventListener('submit', guardarOActualizar);

// Obtener token
function getToken() {
  return localStorage.getItem('token');
}

// =============================
// CARGAR USUARIOS
// =============================
async function cargarUsuarios() {
  try {

    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener usuarios');
    }

    const usuarios = await response.json();
    mostrarUsuarios(usuarios);

  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Error al cargar usuarios');
  }
}

// =============================
// MOSTRAR USUARIOS
// =============================
function mostrarUsuarios(usuarios) {

  listaUsuarios.innerHTML = '';

  //if (laboratorios.length === 0) {
    //sinLaboratorios.style.display = 'block';
    //return;
  //}

  //sinLaboratorios.style.display = 'none';


  usuarios.forEach((u) => {

    const usuariosHTML = `
    <div class="staff-card">
                    <div class="card-header-bg"></div>
                    <div class="avatar-container">
                        <div class="avatar-circle">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                    </div>
                    <div class="staff-info">
                        <h3>${u.nombre} ${u.appaterno}</h3>
                        <p class="role">${u.rol}</p>
                        <div class="details">
                            <p><strong>ID:</strong> ${u.id_usuario}</p>
                            <p><strong>📧</strong> ${u.correo}</p>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn-edit" onclick='abrirEditar(${JSON.stringify(u)})'>Editar</button>
                        <button class="btn-delete" onclick="abrirModalEliminar('${u.id_usuario}', '${u.nombre}')">
                        Eliminar
                        </button>
                    </div>
                </div>
    `;


    listaUsuarios.innerHTML += usuariosHTML;

  });

}

// =============================
// GUARDAR O ACTUALIZAR
// =============================
async function guardarOActualizar(event) {

  event.preventDefault();

  const id = inputId.value;

  const usuario = {
    nombre: inputNombre.value.trim(),
    appaterno: inputapMaterno.value,
    apmaterno: inputapMaterno.value,
    rol: inputRol.value,
    correo: inputCorreo.value,
    password: inputPassword.value
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
        body: JSON.stringify(usuario)
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
        body: JSON.stringify(usuario)
      });

    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error en la operación');
    }

    document.getElementById('staffModal').classList.remove('active');

    // limpiar
    staffForm.reset();
    inputId.value = '';

    await cargarUsuarios();

  } catch (error) {

    console.error('Error:', error);
    alert(error.message || 'Error al guardar/editar');

  }

}

// =============================
// EDITAR
// =============================
function abrirEditar(usuario) {

  inputId.value = usuario.id_usuario;
  inputNombre.value = usuario.nombre || '';
  inputapPaterno.value = usuario.appaterno || '';
  inputapMaterno.value = usuario.apmaterno || '';
  inputCorreo.value = usuario.correo || '';
  inputPassword.value = usuario.password || '';

  modalTitulo.textContent = 'Editar Usuario';
  btnGuardar.textContent = 'Actualizar';

  // 🔥 ABRIR MODAL
  document.getElementById('staffModal').classList.add('active');

}

// =============================
// PREPARAR CREAR
// =============================
function prepararModoCrear() {

  inputId.value = '';
  staffForm.reset();

  modalTitulo.textContent = 'Nuevo Usuario';
  btnGuardar.textContent = 'Guardar';

}

function abrirModalEliminar(id, nombre) {
    usuarioAEliminar = id;

    document.getElementById('deleteTarget').innerText = nombre;

    document.getElementById('deleteModal').classList.add('active');
}

// =============================
// ELIMINAR
// =============================
async function confirmarEliminacion() {

    if (!usuarioAEliminar) return;

    try {

        const response = await fetch(`${API_URL}/${usuarioAEliminar}`, {
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
        await cargarUsuarios();

        // limpiar variable
        usuarioAEliminar = null;

    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error al eliminar');
    }
}