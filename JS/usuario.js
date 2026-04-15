const API_URL = 'http://localhost:3000/api/usuarios';

let usuarioAEliminar = null;

const listaUsuarios = document.getElementById('listaUsuarios');
const staffForm = document.getElementById('staffForm');

const modalTitulo = document.getElementById('modalTitle');
const btnGuardar = document.getElementById('btnGuardar');
const btnNuevo = document.getElementById('btnNuevo');

// SELECTORES CORREGIDOS PARA TU HTML
const inputId = document.getElementById('usuarioId');
const inputNombre = document.getElementById('nombre');
const inputapPaterno = document.getElementById('apPaterno');
const inputapMaterno = document.getElementById('apMaterno');
const inputCorreo = document.getElementById('correo');
const inputRol = document.getElementById('userRol'); // <--- CAMBIADO de 'rol' a 'userRol'
const inputPassword = document.getElementById('password');

window.onload = cargarUsuarios;

if(btnNuevo) {
    btnNuevo.addEventListener('click', () => {
        prepararModoCrear();
        document.getElementById('staffModal').classList.add('active');
    });
}

staffForm.addEventListener('submit', guardarOActualizar);

function getToken() { return localStorage.getItem('token'); }

async function cargarUsuarios() {
    try {
        const response = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Error al obtener usuarios');
        const usuarios = await response.json();
        mostrarUsuarios(usuarios);
    } catch (error) {
        console.error('Error:', error);
    }
}

function mostrarUsuarios(usuarios) {
    listaUsuarios.innerHTML = '';
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
                <button class="btn-delete" onclick="abrirModalEliminar('${u.id_usuario}', '${u.nombre}')">Eliminar</button>
            </div>
        </div>`;
        listaUsuarios.innerHTML += usuariosHTML;
    });
}

async function guardarOActualizar(event) {
    event.preventDefault();
    const id = inputId.value;

    // OBJETO CORREGIDO (Nombres de campos para el servidor)
    const usuario = {
        nombre: inputNombre.value.trim(),
        appaterno: inputapPaterno.value.trim(), // <--- Nombre corregido para el Backend
        apmaterno: inputapMaterno.value.trim(), // <--- Nombre corregido para el Backend
        rol: inputRol.value,
        correo: inputCorreo.value.trim(),
        password: inputPassword.value
    };

    try {
        let response;
        if (!id) {
            response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(usuario)
            });
        } else {
            response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(usuario)
            });
        }

        if (!response.ok) throw new Error('Error en la operación');

        document.getElementById('staffModal').classList.remove('active');
        staffForm.reset();
        inputId.value = '';
        await cargarUsuarios();

    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

function abrirEditar(usuario) {
    inputId.value = usuario.id_usuario;
    inputNombre.value = usuario.nombre || '';
    inputapPaterno.value = usuario.appaterno || '';
    inputapMaterno.value = usuario.apmaterno || '';
    inputCorreo.value = usuario.correo || '';
    inputRol.value = usuario.rol || 'encargado';
    inputPassword.value = usuario.password || '';

    modalTitulo.textContent = 'Editar Usuario';
    btnGuardar.textContent = 'Actualizar';
    document.getElementById('staffModal').classList.add('active');
}

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

async function confirmarEliminacion() {
    if (!usuarioAEliminar) return;
    try {
        const response = await fetch(`${API_URL}/${usuarioAEliminar}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Error al eliminar');
        closeModal('deleteModal');
        await cargarUsuarios();
        usuarioAEliminar = null;
    } catch (error) {
        alert(error.message);
    }
}