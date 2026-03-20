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

    const query = 'SELECT id_usuario, nombre, appaterno, apmaterno, rol, correo FROM usuario u';

    connection.query(query, (err, results) => {

        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Error al obtener usuarios' });
        }

        res.json(results);
    });
});

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

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});