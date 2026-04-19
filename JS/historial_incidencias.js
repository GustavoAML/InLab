// ==========================================
// historial_incidencias.js
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const rol = localStorage.getItem('rol')?.trim().toLowerCase();

    if (rol === 'profesor') {
        // Ocultamos todo lo que no sea Incidencias o Historial
        const itemsParaOcultar = ['Usuarios', 'Laboratorios', 'Encargados', 'Consumibles', 'Equipo', 'Gestión Actual'];
        
        document.querySelectorAll('.nav-item').forEach(el => {
            const texto = el.innerText.trim();
            // Solo dejamos "Incidencias" (el botón del drawer) y "Historial"
            if (itemsParaOcultar.some(item => texto.includes(item)) && !texto.includes('Historial')) {
                el.style.display = 'none';
            }
        });

        // Si el profesor intenta entrar al Dashboard por URL, lo regresamos
        if (window.location.pathname.includes('Dashboard.html')) {
            window.location.href = 'incidencias_actual.html';
        }
    }
});
document.addEventListener('DOMContentLoaded', async () => {
    cargarHistorial(); 
});

async function cargarHistorial() {
    try {
        // 1. Traemos TODAS las incidencias del servidor
        const res = await fetch('/api/incidencias', { 
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
        });
        const todas = await res.json();
        if (!Array.isArray(todas)) {
            console.error('Respuesta inesperada al cargar historial:', todas);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No se pudo cargar el historial. Intenta recargar la página.</td></tr>`;
            return;
        }
        
        // 2. Filtramos para que SOLO salgan las cerradas (resueltas o no resueltas)
        const historialBase = todas.filter(inc => inc.estado !== 'pendiente');
        
        const rol = (localStorage.getItem('rol') || '').trim().toLowerCase();
        const tbody = document.querySelector('#tablaHistorial tbody');
        tbody.innerHTML = '';

        let filtradas = [];

        if (rol === 'admin') {
            filtradas = historialBase;
        } else {
            // 3. Si es ENCARGADO o PROFESOR, obtenemos la lista de sus laboratorios permitidos
            const resLabs = await fetch('/api/laboratorios', { 
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
            });
            const misLabs = await resLabs.json();
            const misIdsLabs = misLabs.map(l => String(l.id_laboratorio));

            // Filtramos el historial para que coincida con sus labs
            filtradas = historialBase.filter(inc => 
                misIdsLabs.includes(String(inc.id_laboratorio))
            );
        }

        if (filtradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No hay historial registrado en tus laboratorios.</td></tr>`;
            return;
        }

        // 4. Pintamos la tabla
        filtradas.forEach(inc => {
            const tr = document.createElement('tr');
            
            // Estilo dinámico para el badge de estado
            const estadoTexto = inc.estado === 'resuelto' ? 'RESUELTO' : 'NO RESUELTO';
            const estadoClase = inc.estado === 'resuelto' ? 'status-success' : 'status-error';
            
            // Color de fondo manual si no tienes el CSS a la mano
            const colorBadge = inc.estado === 'resuelto' ? '#10b981' : '#ef4444';
            
            // Obtener la fecha formateada
            const fechaFormato = inc.fecha ? String(inc.fecha).split('T')[0] : 'S/F';

            tr.innerHTML = `
                <td>${inc.id_incidencia}</td>
                <td>
                    <strong>${inc.nombre_equipo || 'Equipo Borrado'}</strong><br>
                    <small>ID Eq: ${inc.id_equipo}</small>
                </td>
                <td>${inc.nombre_reporte || 'Usuario Desconocido'}</td>
                <td>${inc.nombre_solucion || 'Pendiente'}</td>
                <td>${fechaFormato} | ${inc.hora || 'S/H'}</td>
                <td>${inc.solucion || '<i style="color:gray;">Sin observaciones</i>'}</td>
                <td>
                    <span style="background: ${colorBadge}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: bold;">
                        ${estadoTexto}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error al cargar historial:", error);
    }
}