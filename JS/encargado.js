const API_URL = 'http://localhost:3000/api/encargados';

const listaEncargados = document.getElementById('listaEncargados');

// Cargar Encargados al iniciar
window.onload = cargarEncargados;

// Obtener token
function getToken() {
  return localStorage.getItem('token');
}

// =============================
// CARGAR ENCARGADOS
// =============================
async function cargarEncargados() {
  try {

    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener encargados');
    }

    const encargados = await response.json();
    mostrarEncargados(encargados);

  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Error al cargar encargados');
  }
}

// =============================
// MOSTRAR ENCARGADOS
// =============================
function mostrarEncargados(encargados) {

  listaEncargados.innerHTML = '';

  encargados.forEach((e) => {

    const encargadosHTML = `
    <div class="staff-card">
                    <div class="card-header-bg"></div>
                    <div class="avatar-container">
                        <div class="avatar-circle">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                    </div>
                    <div class="staff-info">
                        <h3>${e.nombre} ${e.appaterno}</h3>
                        <p class="role">Encargado</p>
                        <div class="details">
                            <p><strong>ID de usuario:</strong> ${e.id_usuario}</p>
                            <p><strong>ID de encargado:</strong> ${e.id_encargado}</p>
                            <p><strong>📧</strong> ${e.correo}</p>
                        </div>
                    </div>
                </div>
    `;


    listaEncargados.innerHTML += encargadosHTML;

  });

}