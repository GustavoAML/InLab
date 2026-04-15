// ==========================================
// historial_incidencias.js
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    cargarHistorial();
});

async function cargarHistorial() {
    try {
        // 1. Traemos TODAS las incidencias del servidor
        const res = await fetch('/api/incidencias', { 
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
        });
        const todas = await res.json();
        
        // 2. Filtramos para que SOLO salgan las cerradas (resueltas o no resueltas)
        const historialBase = todas.filter(inc => inc.estado !== 'pendiente');
        
        const rol = (localStorage.getItem('rol') || '').trim().toLowerCase();
        const tbody = document.querySelector('#tablaHistorial tbody');
        tbody.innerHTML = '';

        let filtradas = [];

        if (rol === 'admin') {
            filtradas = historialBase;
        } else {
            // 3. Si es ENCARGADO, obtenemos la lista de sus laboratorios permitidos
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
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay historial registrado en tus laboratorios.</td></tr>`;
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

            tr.innerHTML = `
                <td>${inc.id_incidencia}</td>
                <td>
                    <strong>${inc.nombre_equipo || 'Equipo Borrado'}</strong><br>
                    <small>ID Eq: ${inc.id_equipo}</small>
                </td>
                <td>${inc.fecha ? String(inc.fecha).split('T')[0] : 'S/F'}</td>
                <td>${inc.descripcion}</td>
                <td>
                    <span style="background: ${colorBadge}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: bold;">
                        ${estadoTexto}
                    </span>
                </td>
                <td>${inc.solucion || '<i style="color:gray;">Sin observaciones</i>'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error al cargar historial:", error);
    }
}