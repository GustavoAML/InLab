// Importa la librería mysql2 para poder conectarse a MySQL
const mysql = require('mysql2');

// Crea una conexión a la base de datos con la configuración indicada
const connection = mysql.createConnection(
    {
        // Servidor donde está instalada la base de datos
        host: 'localhost',

        // Usuario de MySQL
        user: 'root',

        // Contraseña del usuario (vacía en este caso)
        password: '',

        // Nombre de la base de datos a utilizar
        database: 'inlab'
    }
);

// Intenta establecer la conexión con la base de datos
connection.connect((err)=>{
    
    // Si ocurre un error al conectar
    if(err){
        console.error('Error MySQL:', err);
        return;
    }

    // Si la conexión es exitosa
    console.log('Conectado a MySQL')
});

// Exporta la conexión para poder usarla en otros archivos (por ejemplo en app.js)
module.exports = connection;
