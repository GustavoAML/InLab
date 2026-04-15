// server.js - Ajustado para roles (admin / encargado) y validación por laboratorio
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connection = require('./db');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const JWT_SECRET = 'esto-es-una-contraseña-segura';

// =============================
// LOGIN
// =============================
app.post('/api/login', (req, res) => {
  const { correo, password } = req.body;
  console.log('Login:', correo);

  if (!correo || !password) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const query = `
    SELECT 
      u.id_usuario,
      u.nombre,
      u.appaterno,
      u.apmaterno,
      u.rol,
      u.correo,
      u.password,
      l.id_laboratorio,
      l.nombre_lab
    FROM usuario AS u
    LEFT JOIN encargado AS e ON u.id_usuario = e.id_usuario
    LEFT JOIN laboratorio AS l ON e.id_encargado = l.id_encargado
    WHERE u.correo = ?
  `;

  connection.query(query, [correo], (err, rows) => {
    if (err) {
      console.error('Error BD:', err);
      return res.status(500).json({ error: 'Error en BD' });
    }

    if (rows.length === 0 || password !== rows[0].password) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const u = rows[0];

    const token = jwt.sign(
      {
        id: u.id_usuario,
        correo: u.correo,
        rol: (u.rol || '').trim().toLowerCase()
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      correo: u.correo,
      rol: u.rol,
      nombre: u.nombre,
      appaterno: u.appaterno,
      apmaterno: u.apmaterno,
      id_laboratorio: u.id_laboratorio || null,
      nombre_lab: u.nombre_lab || null
    });
  });
});

// =============================
// AUTH MIDDLEWARES
// =============================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Aseguramos que rol esté en minúsculas y exista id
    req.user = {
      id: decoded.id,
      correo: decoded.correo,
      rol: (decoded.rol || '').trim().toLowerCase()
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token invalido' });
  }
}

function requireRole(...roles) {
  const normalized = roles.map(r => r.trim().toLowerCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const userRole = (req.user.rol || '').trim().toLowerCase();
    if (!normalized.includes(userRole)) return res.status(403).json({ error: 'No autorizado' });
    next();
  };
}

// =============================
// USUARIOS Y ENCARGADOS
// =============================
app.get('/api/usuarios', auth, requireRole('admin'), (req, res) => {
  const query = 'SELECT id_usuario, nombre, appaterno, apmaterno, rol, correo, password FROM usuario';
  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener usuarios' });
    res.json(results);
  });
});

app.post('/api/usuarios', auth, requireRole('admin'), (req, res) => {
  const { nombre, appaterno, apmaterno, correo, rol, password } = req.body;
  if (!nombre || !appaterno || !correo || !rol || !password) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  }
  const query = 'INSERT INTO usuario (nombre, appaterno, apmaterno, correo, rol, password) VALUES (?, ?, ?, ?, ?, ?)';
  connection.query(query, [nombre, appaterno, apmaterno, correo, rol, password], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear usuario' });
    res.status(201).json({ mensaje: 'Usuario creado', id: result.insertId });
  });
});

app.put('/api/usuarios/:id', auth, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { nombre, appaterno, apmaterno, correo, rol, password } = req.body;
  if (!nombre || !appaterno || !correo || !rol || !password) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  }
  const query = 'UPDATE usuario SET nombre = ?, appaterno = ?, apmaterno = ?, correo = ?, rol = ?, password = ? WHERE id_usuario = ?';
  connection.query(query, [nombre, appaterno, apmaterno, correo, rol, password, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al editar usuario' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario actualizado' });
  });
});

app.delete('/api/usuarios/:id', auth, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM usuario WHERE id_usuario = ?';
  connection.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar usuario' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario eliminado' });
  });
});

app.get('/api/encargados', auth, requireRole('admin'), (req, res) => {
  const query = `
    SELECT u.id_usuario, e.id_encargado, u.nombre, u.appaterno, u.correo
    FROM encargado AS e
    JOIN usuario AS u ON e.id_usuario = u.id_usuario
    ORDER BY u.nombre ASC
  `;
  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener encargados' });
    res.json(results);
  });
});

// =============================
//// =============================
// LABORATORIOS (CORREGIDO)
// =============================
app.get('/api/laboratorios', auth, requireRole('admin', 'encargado'), (req, res) => {
    const { rol, id: userId } = req.user;
    
    // 1. Para ADMIN: Agregamos planta e id_encargado
    let query = 'SELECT id_laboratorio, nombre_lab, edificio, planta, id_encargado FROM laboratorio';
    let params = [];

    if (rol === 'encargado') {
        // 2. Para ENCARGADO: También agregamos los campos faltantes
        query = `
            SELECT l.id_laboratorio, l.nombre_lab, l.edificio, l.planta, l.id_encargado 
            FROM laboratorio l
            JOIN encargado e ON l.id_encargado = e.id_encargado
            WHERE e.id_usuario = ?
        `;
        params.push(userId);
    }

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Error SQL:', err);
            return res.status(500).json({ error: 'Error al obtener laboratorios' });
        }
        res.json(results);
    });
});

app.post('/api/laboratorios', auth, requireRole('admin'), (req, res) => {
  const { nombre, edificio, planta, id_encargado } = req.body;
  if (!nombre || !edificio || !planta || !id_encargado) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  }
  connection.query('INSERT INTO laboratorio (nombre_lab, edificio, planta, id_encargado) VALUES (?, ?, ?, ?)', [nombre, edificio, planta, id_encargado], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear laboratorio' });
    res.status(201).json({ mensaje: 'Laboratorio creado', id: result.insertId });
  });
});

app.put('/api/laboratorios/:id', auth, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { nombre, edificio, planta, id_encargado } = req.body;
  if (!nombre || !edificio || !planta || !id_encargado) return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  connection.query('UPDATE laboratorio SET nombre_lab = ?, edificio = ?, planta = ?, id_encargado = ? WHERE id_laboratorio = ?', [nombre, edificio, planta, id_encargado, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar laboratorio' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Laboratorio no encontrado' });
    res.json({ mensaje: 'Laboratorio actualizado' });
  });
});

app.delete('/api/laboratorios/:id', auth, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM laboratorio WHERE id_laboratorio = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar laboratorio' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Laboratorio no encontrado' });
    res.json({ mensaje: 'Laboratorio eliminado' });
  });
});

// =============================
// CONSUMIBLES (GET / POST / PUT / DELETE)
// =============================
app.get('/api/consumibles', auth, (req, res) => {
  const userId = req.user.id;
  const rol = req.user.rol;
 if (rol === 'admin') {
    // Usamos c.* para traer todo lo de consumibles y l.nombre_lab para la ubicación
    const query = `
        SELECT 
            c.*, 
            l.nombre_lab, 
            l.edificio
        FROM consumibles c
        JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio
        ORDER BY l.edificio ASC, l.nombre_lab ASC
    `;
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('ERROR SQL:', err); // Esto imprimirá el error real en tu terminal
            return res.status(500).json({ error: 'Error al obtener consumibles' });
        }
        res.json(results);
    });
} else if (rol === 'encargado') {
    const query = `
      SELECT c.id, c.nombre_con, c.stock, l.id_laboratorio, l.nombre_lab, l.edificio
      FROM consumibles c
      JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio
      JOIN encargado e ON l.id_encargado = e.id_encargado
      WHERE e.id_usuario = ?
      ORDER BY c.nombre_con ASC
    `;
    connection.query(query, [userId], (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener consumibles' });
      res.json(results);
    });
  } else {
    return res.status(403).json({ error: 'No autorizado' });
  }
});

// Crear consumible (admin o encargado, encargado solo en su laboratorio)
app.post('/api/consumibles', auth, requireRole('admin', 'encargado'), (req, res) => {
  const { nombre, stock, id_laboratorio } = req.body;
  const { rol, id: userId } = req.user;
  if (!nombre || stock === undefined || !id_laboratorio) return res.status(400).json({ error: 'Campos obligatorios faltantes' });

  if (rol === 'encargado') {
    const q = `
      SELECT l.id_laboratorio
      FROM laboratorio l
      JOIN encargado e ON l.id_encargado = e.id_encargado
      WHERE e.id_usuario = ?
    `;
    connection.query(q, [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error validando laboratorio' });
      if (rows.length === 0 || rows[0].id_laboratorio !== parseInt(id_laboratorio)) {
        return res.status(403).json({ error: 'No puedes crear consumibles en otro laboratorio' });
      }
      insertarConsumible(nombre, stock, id_laboratorio, res);
    });
  } else {
    insertarConsumible(nombre, stock, id_laboratorio, res);
  }
});

function insertarConsumible(nombre, stock, id_laboratorio, res) {
  const query = 'INSERT INTO consumibles (nombre_con, stock, id_laboratorio) VALUES (?, ?, ?)';
  connection.query(query, [nombre, stock, id_laboratorio], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear consumible' });
    res.status(201).json({ mensaje: 'Consumible creado', id: result.insertId });
  });
}

// Editar consumible (admin o encargado, encargado solo su laboratorio)
app.put('/api/consumibles/:id', auth, requireRole('admin', 'encargado'), (req, res) => {
  const { id } = req.params;
  const { nombre, stock } = req.body;
  const { rol, id: userId } = req.user;
  if (!nombre || stock === undefined) return res.status(400).json({ error: 'Campos obligatorios faltantes' });

  if (rol === 'encargado') {
    const q = `
      SELECT c.id
      FROM consumibles c
      JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio
      JOIN encargado e ON l.id_encargado = e.id_encargado
      WHERE c.id = ? AND e.id_usuario = ?
    `;
    connection.query(q, [id, userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error validando consumible' });
      if (rows.length === 0) return res.status(403).json({ error: 'No puedes editar consumibles de otro laboratorio' });
      actualizarConsumible(nombre, stock, id, res);
    });
  } else {
    actualizarConsumible(nombre, stock, id, res);
  }
});

function actualizarConsumible(nombre, stock, id, res) {
  const query = 'UPDATE consumibles SET nombre_con = ?, stock = ? WHERE id = ?';
  connection.query(query, [nombre, stock, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al editar consumible' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Consumible no encontrado' });
    res.json({ mensaje: 'Consumible actualizado' });
  });
}

// Eliminar consumible (admin o encargado, encargado solo su laboratorio)
app.delete('/api/consumibles/:id', auth, requireRole('admin', 'encargado'), (req, res) => {
  const { id } = req.params;
  const { rol, id: userId } = req.user;

  if (rol === 'encargado') {
    const q = `
      SELECT c.id
      FROM consumibles c
      JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio
      JOIN encargado e ON l.id_encargado = e.id_encargado
      WHERE c.id = ? AND e.id_usuario = ?
    `;
    connection.query(q, [id, userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error validando consumible' });
      if (rows.length === 0) return res.status(403).json({ error: 'No puedes eliminar consumibles de otro laboratorio' });
      eliminarConsumible(id, res);
    });
  } else {
    eliminarConsumible(id, res);
  }
});

function eliminarConsumible(id, res) {
  const query = 'DELETE FROM consumibles WHERE id = ?';
  connection.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar consumible' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Consumible no encontrado' });
    res.json({ mensaje: 'Consumible eliminado' });
  });
}

// =============================
// EQUIPOS (GET / POST / PUT / DELETE)
// =============================
app.get('/api/equipos', auth, (req, res) => {
  const userId = req.user.id;
  const rol = req.user.rol;
  if (rol === 'admin') {
    const query = `
      SELECT e.id_equipo, e.nombre, e.no_serie, e.numero, e.tipo, l.nombre_lab, l.edificio, e.id_laboratorio
      FROM equipo e
      JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
      ORDER BY e.nombre ASC
    `;
    connection.query(query, (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error al obtener equipos' });
      res.json(rows);
    });
  } else if (rol === 'encargado') {
    const query = `
      SELECT e.id_equipo, e.nombre, e.no_serie, e.numero, e.tipo, l.nombre_lab, l.edificio, e.id_laboratorio
      FROM equipo e
      JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
      JOIN encargado en ON l.id_encargado = en.id_encargado
      WHERE en.id_usuario = ?
      ORDER BY e.nombre ASC
    `;
    connection.query(query, [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error al obtener equipos' });
      res.json(rows);
    });
  } else {
    return res.status(403).json({ error: 'No autorizado' });
  }
});

// Crear equipo (admin o encargado, encargado solo en su laboratorio)
app.post('/api/equipos', auth, requireRole('admin', 'encargado'), (req, res) => {
  const { nombre, no_serie, numero, id_laboratorio, tipo } = req.body;
  const { rol, id: userId } = req.user;
  if (!nombre || !no_serie || !numero || !id_laboratorio || !tipo) return res.status(400).json({ error: 'Campos obligatorios faltantes' });

  if (rol === 'encargado') {
    const q = `
      SELECT l.id_laboratorio
      FROM laboratorio l
      JOIN encargado e ON l.id_encargado = e.id_encargado
      WHERE e.id_usuario = ?
    `;
    connection.query(q, [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error validando laboratorio' });
      if (rows.length === 0 || rows[0].id_laboratorio !== parseInt(id_laboratorio)) {
        return res.status(403).json({ error: 'No puedes crear equipos en otro laboratorio' });
      }
      insertarEquipo(nombre, no_serie, numero, id_laboratorio, tipo, res);
    });
  } else {
    insertarEquipo(nombre, no_serie, numero, id_laboratorio, tipo, res);
  }
});

function insertarEquipo(nombre, no_serie, numero, id_laboratorio, tipo, res) {
  const query = 'INSERT INTO equipo (nombre, no_serie, numero, id_laboratorio, tipo) VALUES (?, ?, ?, ?, ?)';
  connection.query(query, [nombre, no_serie, numero, id_laboratorio, tipo], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear equipo' });
    res.status(201).json({ message: 'Equipo creado correctamente', id: result.insertId });
  });
}

// Actualizar equipo (admin o encargado, encargado solo su laboratorio)
app.put('/api/equipos/:id', auth, requireRole('admin', 'encargado'), (req, res) => {
  const { id } = req.params;
  const { nombre, no_serie, numero, id_laboratorio, tipo } = req.body;
  const { rol, id: userId } = req.user;
  if (!nombre || !no_serie || !numero || !id_laboratorio || !tipo) return res.status(400).json({ error: 'Campos obligatorios faltantes' });

  if (rol === 'encargado') {
    const q = `
      SELECT e.id_equipo
      FROM equipo e
      JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
      JOIN encargado en ON l.id_encargado = en.id_encargado
      WHERE e.id_equipo = ? AND en.id_usuario = ?
    `;
    connection.query(q, [id, userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error validando equipo' });
      if (rows.length === 0) return res.status(403).json({ error: 'No puedes editar equipos de otro laboratorio' });
      actualizarEquipo(nombre, no_serie, numero, id_laboratorio, tipo, id, res);
    });
  } else {
    actualizarEquipo(nombre, no_serie, numero, id_laboratorio, tipo, id, res);
  }
});

function actualizarEquipo(nombre, no_serie, numero, id_laboratorio, tipo, id, res) {
  const query = 'UPDATE equipo SET nombre=?, no_serie=?, numero=?, id_laboratorio=?, tipo=? WHERE id_equipo=?';
  connection.query(query, [nombre, no_serie, numero, id_laboratorio, tipo, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar equipo' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo actualizado correctamente' });
  });
}

// Eliminar equipo (admin o encargado, encargado solo su laboratorio)
app.delete('/api/equipos/:id', auth, requireRole('admin', 'encargado'), (req, res) => {
  const { id } = req.params;
  const { rol, id: userId } = req.user;

  if (rol === 'encargado') {
    const q = `
      SELECT e.id_equipo
      FROM equipo e
      JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
      JOIN encargado en ON l.id_encargado = en.id_encargado
      WHERE e.id_equipo = ? AND en.id_usuario = ?
    `;
    connection.query(q, [id, userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error validando equipo' });
      if (rows.length === 0) return res.status(403).json({ error: 'No puedes eliminar equipos de otro laboratorio' });
      eliminarEquipo(id, res);
    });
  } else {
    eliminarEquipo(id, res);
  }
});

function eliminarEquipo(id, res) {
  const query = 'DELETE FROM equipo WHERE id_equipo = ?';
  connection.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar equipo' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo eliminado correctamente' });
  });
}

// =============================
// DASHBOARD / STATS / INCIDENCIAS
// =============================
app.get('/api/dashboard/stats', auth, (req, res) => {
  const { rol, id: userId } = req.user;

  // Si es ADMIN: Query global
  if (rol === 'admin') {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM equipo WHERE tipo = 'PC') as totalPCs,
        (SELECT COUNT(*) FROM equipo WHERE tipo = 'Monitor') as totalMonitores,
        (SELECT SUM(stock) FROM consumibles) as stockTotalConsumibles
    `;
    connection.query(query, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows[0]);
    });
  } 
  // Si es ENCARGADO: Filtramos por el laboratorio que tiene asignado
  else if (rol === 'encargado') {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM equipo e 
         JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio 
         JOIN encargado enc ON l.id_encargado = enc.id_encargado 
         WHERE e.tipo = 'PC' AND enc.id_usuario = ?) as totalPCs,
        (SELECT COUNT(*) FROM equipo e 
         JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio 
         JOIN encargado enc ON l.id_encargado = enc.id_encargado 
         WHERE e.tipo = 'Monitor' AND enc.id_usuario = ?) as totalMonitores,
        (SELECT SUM(c.stock) FROM consumibles c 
         JOIN laboratorio l ON c.id_laboratorio = l.id_laboratorio 
         JOIN encargado enc ON l.id_encargado = enc.id_encargado 
         WHERE enc.id_usuario = ?) as stockTotalConsumibles
    `;
    // Pasamos el userId 3 veces (una para cada subconsulta)
    connection.query(query, [userId, userId, userId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows[0]);
    });
  } else {
    res.status(403).json({ error: 'No autorizado' });
  }
});

app.get('/api/dashboard/incidencias-recientes', auth, (req, res) => {
  const { rol, id: userId } = req.user;

  let query = `
    SELECT 
      e.nombre AS nombre_equipo,
      e.no_serie,
      u.nombre AS nombre_usuario,
      e.tipo AS tipo_equipo,
      i.estado
    FROM incidencia i
    JOIN equipo e ON i.id_equipo = e.id_equipo
    JOIN usuario u ON i.id_usuario = u.id_usuario
    JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
  `;

  const params = [];
  if (rol === 'encargado') {
    query += ` JOIN encargado enc ON l.id_encargado = enc.id_encargado WHERE enc.id_usuario = ?`;
    params.push(userId);
  }

  query += ` ORDER BY i.fecha DESC, i.hora DESC LIMIT 5`;

  connection.query(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener incidencias' });
    res.json(rows);
  });
});

// =============================
// RUTAS ESTÁTICAS / RAÍZ
// =============================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// =============================
// INICIAR SERVIDOR
// =============================
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
// ==========================================
// RUTAS PARA INCIDENCIAS (INLAB)
// ==========================================

// 1. CREAR NUEVA INCIDENCIA (POST)
app.post('/api/incidencias', auth, (req, res) => {
    // Ya no recibimos el id_usuario del frontend, lo sacamos del token seguro
    const id_usuario = req.user.id; 
    const { id_equipo, fecha, hora, descripcion, estado } = req.body;
    
    // Nombres de tabla en singular: incidencia
    const query = `
        INSERT INTO incidencia (id_equipo, id_usuario, fecha, hora, descripcion, estado)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    connection.query(query, [id_equipo, id_usuario, fecha, hora, descripcion, estado], (err, results) => {
        if (err) {
            console.error('Error al guardar incidencia:', err);
            return res.status(500).json({ error: 'Error al registrar la incidencia' });
        }
        res.status(201).json({ message: 'Incidencia creada con éxito', id: results.insertId });
    });
});

// ==========================================
// 2. OBTENER INCIDENCIAS ACTUALES (GET) - ¡Agregamos 'auth'!
// ==========================================
app.get('/api/incidencias/actuales', auth, (req, res) => {
    // Nombres de tabla en singular: incidencia, equipo, usuario
    const query = `
        SELECT 
            i.id_incidencia,
            e.nombre AS nombre_equipo,
            e.id_equipo,
            e.id_laboratorio,
            u.nombre AS nombre_usuario,
            i.id_usuario,
            i.fecha,
            i.hora,
            i.descripcion,
            i.estado
        FROM incidencia i
        LEFT JOIN equipo e ON i.id_equipo = e.id_equipo
        LEFT JOIN usuario u ON i.id_usuario = u.id_usuario
        WHERE i.estado = 'pendiente'
        ORDER BY i.fecha DESC, i.hora DESC
    `;
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener incidencias:', err);
            return res.status(500).json({ error: 'Error al cargar la tabla' });
        }
        res.json(results);
    });
});

// ==========================================
// 3. RESOLVER INCIDENCIA (PUT) - ¡Agregamos 'auth'!
// ==========================================
app.put('/api/incidencias/:id/resolver', auth, (req, res) => {
    const id_incidencia = req.params.id;
    const { estado, solucion } = req.body; 

    // Nombre de tabla en singular
    const query = `
        UPDATE incidencia 
        SET estado = ?, solucion = ?, fecha_resolucion = NOW() 
        WHERE id_incidencia = ?
    `;
    connection.query(query, [estado, solucion, id_incidencia], (err, results) => {
        if (err) {
            console.error('Error al resolver incidencia:', err);
            return res.status(500).json({ error: 'Error al actualizar la incidencia' });
        }
        res.json({ message: 'Incidencia archivada correctamente' });
    });
});

// OBTENER TODAS LAS INCIDENCIAS (Para el historial)
app.get('/api/incidencias', auth, (req, res) => {
    const query = `
        SELECT 
            i.*, 
            e.nombre AS nombre_equipo, 
            u.nombre AS nombre_usuario, 
            e.id_laboratorio 
        FROM incidencia i
        JOIN equipo e ON i.id_equipo = e.id_equipo
        JOIN usuario u ON i.id_usuario = u.id_usuario
        ORDER BY i.fecha DESC, i.hora DESC
    `;
    connection.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener historial' });
        res.json(results);
    });
});