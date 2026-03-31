const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connection = require('./db');
const path = require('path');

const app = express();
const PORT = 3000;

//Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname)));

const JWT_SECRET = 'esto-es-una-contraseña-segura';

//login
app.post('/api/login', (req, res)=> {
    const {correo, password} = req.body;
    console.log('Login:', correo);

    if(!correo || !password){
        return res.status(400).json({error: 'Faltan datos'});
    }

    connection.query(
        'SELECT id_usuario, nombre, appaterno, apmaterno, rol, correo, password FROM usuario AS u WHERE correo = ?',
        [correo],
        (err, rows)=>{
            if(err){
                console.error('Error BD:', err);
                return res.status(500).json({error: 'Error en BD'});
            }

            if(rows.length === 0 || password !== rows[0].password){
                return res.status(401).json({error: 'Credenciales invalidas'});
            }

            const u = rows[0];

            const token = jwt.sign(
                {
                    id: u.id_usuario,
                    correo: u.correo,
                    rol: u.rol.trim().toLowerCase(), // normaliza el rol
                },
                JWT_SECRET,
                {expiresIn: '2h'} // expira en 2 horas
            );

            res.json({
                token,
                correo: u.correo,
                rol: u.rol,
                nombre: u.nombre,
                appaterno: u.appaterno,
                apmaterno: u.apmaterno
});
        }
    );
});

//Middleware auth
function auth(req, res, next){

    const header = req.headers.authorization;

    if(!header || !header.startsWith('Bearer ')){
        return res.status(401).json({error: 'No autorizado'});
    }

    const token = header.split(' ')[1];

    try{

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        next();

    }catch(err){

        if(err.name === 'TokenExpiredError'){
            return res.status(401).json({error: 'Token expirado'});
        }

        return res.status(401).json({error: 'Token invalido'});
    }
}

//Middleware de roles
function requireRole(...roles) {

  return (req, res, next) => {

    if (!req.user){
        return res.status(401).json({error: 'No autenticado'});
    }

    const userRole = req.user.rol.trim().toLowerCase();

    if(!roles.includes(userRole)) {
        return res.status(403).json({error: 'No autorizado'});
    }

    next();
  };
}

//Obtener Usuarios
app.get('/api/usuarios', auth, requireRole('admin'), (req, res) => {

    const query = 'SELECT id_usuario, nombre, appaterno, apmaterno, rol, correo, password FROM usuario u';

    connection.query(query, (err, results) => {

        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Error al obtener usuarios' });
        }

        res.json(results);
    });
});

//Obtener Encargados
app.get('/api/encargados', auth, requireRole('admin'), (req, res) => {

    const query = `
        SELECT 
            u.id_usuario, 
            e.id_encargado, 
            u.nombre, 
            u.appaterno, 
            u.correo
        FROM encargado AS e
        JOIN usuario AS u ON e.id_usuario = u.id_usuario
        ORDER BY u.nombre ASC
    `;

    connection.query(query, (err, results) => {

        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Error al obtener encargados' });
        }

        res.json(results);
    });
});

//Obtener Consumibles
app.get('/api/consumibles', auth, requireRole('admin'), (req, res) => {

    const query = `
        SELECT 
            c.id, 
            l.id_laboratorio, 
            c.nombre_con, 
            c.stock, 
            l.nombre_lab,
            l.edificio
        FROM consumibles AS c
        JOIN laboratorio AS l ON c.id_laboratorio = l.id_laboratorio
        ORDER BY c.nombre_con ASC
    `;

    connection.query(query, (err, results) => {

        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Error al obtener consumibles' });
        }

        res.json(results);
    });
});

//Obtener laboratorios
app.get('/api/laboratorios', auth, requireRole('admin'), (req, res) => {
    const query = 'SELECT id_laboratorio, nombre_lab, edificio, planta, id_encargado FROM laboratorio ORDER BY nombre_lab ASC';
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
        res.json(results);
    });
});

// Crear usuarios
app.post('/api/usuarios', auth, requireRole('admin'), (req, res) => { 
    const { nombre, appaterno, apmaterno, correo, rol, password } = req.body;
    
    if (!nombre || !appaterno || !correo || !rol || !password ) { 
        return res.status(400).json({ error: 'Campos obligatorios faltantes '}); 
    } 
    
    const query = 
    'INSERT INTO usuario (nombre, appaterno, apmaterno, correo, rol, password) VALUES (?, ?, ?, ?, ?, ?)'; 
    
    connection.query( 
        query, 
        [nombre, appaterno, apmaterno, correo, rol, password], 
        (err, result) => { 
            
            if (err) { 
                console.error('Error:', err); 
                return res.status(500).json({ error: 'Error al crear usuario' }); 
            } 
            
        res.status(201).json({ mensaje: 'Usuario creado', id: result.insertId }); 
    }); 
});

// Crear consumibles
app.post('/api/consumibles', auth, requireRole('admin'), (req, res) => { 
    const { nombre, stock, id_laboratorio } = req.body;
    
    if (!nombre || !stock || !id_laboratorio  ) { 
        return res.status(400).json({ error: 'Campos obligatorios faltantes '}); 
    } 
    
    const query = 
    'INSERT INTO consumibles (nombre_con, stock, id_laboratorio) VALUES (?, ?, ?)'; 
    
    connection.query( 
        query, 
        [nombre, stock, id_laboratorio], 
        (err, result) => { 
            
            if (err) { 
                console.error('Error:', err); 
                return res.status(500).json({ error: 'Error al crear consumible' }); 
            } 
            
        res.status(201).json({ mensaje: 'Consumible creado', id: result.insertId }); 
    }); 
});

// Crear laboratorios
app.post('/api/laboratorios', (req, res) => {
  const { nombre, edificio, planta, id_encargado } = req.body;
 
  if (!nombre || !edificio || !planta || !id_encargado) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  }
 
  connection.query(
    'INSERT INTO laboratorio (nombre_lab, edificio, planta, id_encargado) VALUES (?, ?, ?, ?)',
    [nombre, edificio, planta, id_encargado],
    (err, result) => {
      if (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: 'Error al crear laboratorio' });
      }
      res.status(201).json({ mensaje: 'Laboratorio creado', id: result.insertId });
    }
  );
});

// Editar usuarios
app.put('/api/usuarios/:id', auth, requireRole('admin'), (req, res) => {

    const { id } = req.params;
    const { nombre, appaterno, apmaterno, correo, rol, password } = req.body;

    if (!nombre || !appaterno || !correo || !rol || !password ) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes '});
    }

    const query =
    'UPDATE usuario SET nombre = ?, appaterno = ?, apmaterno = ?, correo = ?, rol = ?, password = ? WHERE id_usuario = ?';

    connection.query(
        query,
        [nombre, appaterno, apmaterno, correo, rol, password, id],
        (err, result) => {

            if (err) {
                console.error('Error:', err);
                return res.status(500).json({ error: 'Error al editar usuario'});
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.json({ mensaje: 'Usuario actualizado'})
        }
    );
});

// Editar consumibles
app.put('/api/consumibles/:id', auth, requireRole('admin'), (req, res) => {

    const { id } = req.params;
    const { nombre, stock } = req.body;

    if (!nombre || !stock ) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes '});
    }

    const query =
    'UPDATE consumibles SET nombre_con = ?, stock = ? WHERE id = ?';

    connection.query(
        query,
        [nombre, stock, id],
        (err, result) => {

            if (err) {
                console.error('Error:', err);
                return res.status(500).json({ error: 'Error al editar consumibles'});
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Consumible no encontrado' });
            }

            res.json({ mensaje: 'Consumible actualizado'})
        }
    );
});

// Editar laboratorios
app.put('/api/laboratorios/:id', auth, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { nombre, edificio, planta, id_encargado } = req.body;
 
  if (!nombre || !edificio || !planta || !id_encargado) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  }
 
  connection.query(
    'UPDATE laboratorio SET nombre_lab = ?, edificio = ?, planta = ? , id_encargado = ? WHERE id_laboratorio = ?',
    [nombre, edificio, planta, id_encargado, id],
    (err, result) => {
      if (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: 'Error al actualizar laboratorio' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Laboratorio no encontrado' });
      }
      res.json({ mensaje: 'Laboratorio actualizado' });
    }
  );
});

// Eliminar usuario
app.delete('/api/usuarios/:id', auth, requireRole('admin'), (req, res) => {

    const {id} = req.params;

    const query = 'DELETE FROM usuario WHERE id_usuario = ?';

    connection.query(query, [id], (err, result) => {

        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Error al eliminar usuario'});
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ mensaje: 'Usuario eliminado'});
    });
});

// Eliminar consumibles
app.delete('/api/consumibles/:id', auth, requireRole('admin'), (req, res) => {

    const {id} = req.params;

    const query = 'DELETE FROM consumibles WHERE id = ?';

    connection.query(query, [id], (err, result) => {

        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Error al eliminar consumible'});
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Consumible no encontrado' });
        }

        res.json({ mensaje: 'Consumible eliminado'});
    });
});

// Eliminar laboratorios
app.delete('/api/laboratorios/:id', auth, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  connection.query(
    'DELETE FROM laboratorio WHERE id_laboratorio = ?',
    [id],
    (err, result) => {
      if (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: 'Error al eliminar laboratorio' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Laboratorio no encontrado' });
      }
      res.json({ mensaje: 'Laboratorio eliminado' });
    }
  );
});

// =============================
// ENDPOINTS EQUIPOS (con callbacks)
// =============================

// Obtener todos los equipos
app.get('/api/equipos', (req, res) => {
  const query = `
    SELECT e.id_equipo, e.nombre, e.no_serie, e.estado, 
           e.tipo, l.nombre_lab, l.edificio, e.id_laboratorio
    FROM equipo e
    JOIN laboratorio l ON e.id_laboratorio = l.id_laboratorio
  `;
  connection.query(query, (err, rows) => {
    if (err) {
      console.error('Error al obtener equipos:', err);
      return res.status(500).json({ error: 'Error al obtener equipos' });
    }
    res.json(rows);
  });
});

// Crear nuevo equipo
app.post('/api/equipos', (req, res) => {
  const { nombre, no_serie, estado, id_laboratorio, tipo } = req.body;
  const query = `
    INSERT INTO equipo (nombre, no_serie, estado, id_laboratorio, tipo) 
    VALUES (?, ?, ?, ?, ?)
  `;
  connection.query(query, [nombre, no_serie, estado, id_laboratorio, tipo], (err) => {
    if (err) {
      console.error('Error al crear equipo:', err);
      return res.status(500).json({ error: 'Error al crear equipo' });
    }
    res.json({ message: 'Equipo creado correctamente' });
  });
});

// Actualizar equipo
app.put('/api/equipos/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, no_serie, estado, id_laboratorio, tipo } = req.body;
  const query = `
    UPDATE equipo 
    SET nombre=?, no_serie=?, estado=?, id_laboratorio=?, tipo=? 
    WHERE id_equipo=?
  `;
  connection.query(query, [nombre, no_serie, estado, id_laboratorio, tipo, id], (err) => {
    if (err) {
      console.error('Error al actualizar equipo:', err);
      return res.status(500).json({ error: 'Error al actualizar equipo' });
    }
    res.json({ message: 'Equipo actualizado correctamente' });
  });
});

// Eliminar equipo
app.delete('/api/equipos/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM equipo WHERE id_equipo=?`;
  connection.query(query, [id], (err) => {
    if (err) {
      console.error('Error al eliminar equipo:', err);
      return res.status(500).json({ error: 'Error al eliminar equipo' });
    }
    res.json({ message: 'Equipo eliminado correctamente' });
  });
});

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});3