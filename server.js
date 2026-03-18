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

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});