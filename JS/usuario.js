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
        // ✨ Lógica para mostrar el laboratorio solo si es profesor o encargado
       const infoLaboratorio = (u.rol === 'profesor' || u.rol === 'encargado') 
    ? `<p style="color: #00f2ff; font-size: 0.85rem; margin-top: 4px; font-weight: bold;">
        📍 Lab: ${u.nombre_lab ? u.nombre_lab : '<span style="color:orange;">Sin asignar</span>'}
       </p>` 
    : '';

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
                <p class="role">${u.rol.toUpperCase()}</p>
                <div class="details">
                    <p><strong>ID:</strong> ${u.id_usuario}</p>
                    <p><strong>📧</strong> ${u.correo}</p>
                    ${infoLaboratorio}
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
async function guardarOActualizar(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');

    // 1. Capturamos los valores de los inputs (esto ya lo tienes)
    const id = document.getElementById('usuarioId').value;
    const nombre = document.getElementById('nombre').value;
    const appaterno = document.getElementById('apPaterno').value;
    const apmaterno = document.getElementById('apMaterno').value;
    const correo = document.getElementById('correo').value;
    const rol = document.getElementById('rolUsuario').value;
    const password = document.getElementById('password').value;

    // 2. Lógica para el laboratorio
    let id_laboratorio = null;
    // Si es profesor o encargado, sacamos el valor del select de laboratorio
    if (rol === 'profesor' || rol === 'encargado') {
        const selectLab = document.getElementById('selectLabProfesor');
        id_laboratorio = selectLab ? selectLab.value : null;
    }

    // 3. Creamos el objeto usuario (Aquí es donde estaba el error "u is not defined")
    const usuario = {
        nombre: nombre.trim(),
        appaterno: appaterno.trim(),
        apmaterno: apmaterno.trim(),
        rol: rol,
        correo: correo.trim(),
        password: password,
        id_laboratorio: id_laboratorio // 👈 Mandamos el ID que acabamos de capturar
    };

    try {
        let response;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        if (!id) {
            // CREAR NUEVO
            response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(usuario)
            });
        } else {
            // ACTUALIZAR EXISTENTE
            response = await fetch(`/api/usuarios/${id}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(usuario)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en la operación');
        }

        alert("✅ Usuario guardado correctamente");
        document.getElementById('staffModal').classList.remove('active');
        staffForm.reset();
        document.getElementById('usuarioId').value = '';
        
        await cargarUsuarios(); // Recargamos la lista

    } catch (error) {
        console.error('Error:', error);
        alert("❌ " + error.message);
    }
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
async function alternarSelectProfesor() {
    const rolSeleccionado = document.getElementById('rolUsuario').value;
    const divLaboratorio = document.getElementById('grupoLaboratorioProfesor');
    const selectLab = document.getElementById('selectLabProfesor');

    if (rolSeleccionado === 'profesor' || rolSeleccionado === 'encargado') {
        // ✨ APARECE cuando es profesor o encargado
        divLaboratorio.style.display = 'block';
        
        // Cargamos los laboratorios de la API si el select está vacío
        if (selectLab.options.length <= 1) {
            try {
                const res = await fetch('/api/laboratorios', { 
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
                });
                const labs = await res.json();
                
                selectLab.innerHTML = '<option value="" disabled selected>Selecciona laboratorio...</option>';
                labs.forEach(l => {
                    selectLab.innerHTML += `<option value="${l.id_laboratorio}">${l.nombre_lab} (${l.edificio})</option>`;
                });
            } catch (error) {
                console.error("Error al cargar laboratorios:", error);
            }
        }
    } else {
        // ❌ DESAPARECE si seleccionas Admin
        divLaboratorio.style.display = 'none';
        selectLab.value = ""; // Reseteamos la selección
    }
}
function irAPractica(tipo) {
    const rol = (localStorage.getItem('rol') || '').trim().toLowerCase();
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

    if (rutas[tipo]) {
        window.location.href = rutas[tipo];
    }
}

// ✨ ESTA LÍNEA ES LA QUE CORRIGE EL ERROR:
window.irAPractica = irAPractica; 
window.logout = logout; // Aprovecha y expón también el logout si te da error
async function abrirEditar(u) {
    console.log("Datos del usuario a editar:", u);

    // 1. Llenar los campos básicos
    document.getElementById('usuarioId').value = u.id_usuario;
    document.getElementById('nombre').value = u.nombre;
    document.getElementById('apPaterno').value = u.appaterno;
    document.getElementById('apMaterno').value = u.apmaterno;
    document.getElementById('correo').value = u.correo;
    document.getElementById('rolUsuario').value = u.rol;

    // 2. Mostrar el campo de laboratorio según rol y cargar opciones
    if (u.rol === 'profesor' || u.rol === 'encargado') {
        await verificarRolProfesor(u.id_laboratorio || '');
    } else {
        await verificarRolProfesor('');
    }

    // 3. Abrir modal
    document.getElementById('modalTitle').textContent = 'Editar Usuario';
    document.getElementById('staffModal').classList.add('active');
}

// ✨ CRUCIAL: Exponerla para que el onclick del HTML la vea
window.abrirEditar = abrirEditar;