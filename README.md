	INLAB - Sistema de Gestión de Laboratorios

Descripción
INLAB es una aplicación web diseñada para la administración y gestión de laboratorios. Permite controlar usuarios, laboratorios y accesos mediante un sistema con autenticación y roles.

Este proyecto está enfocado en facilitar la organización de recursos dentro de instituciones educativas o entornos técnicos.



Características

- Autenticación de usuarios con JWT  
- Gestión de usuarios (CRUD)  
- Gestión de laboratorios (CRUD)  
- Gestión de incidencias (CRUD)
- Control de acceso basado en roles  
- Interfaz visual con tarjetas (cards)  
- API REST  



Tecnologías utilizadas

Backend
- Node.js  
- Express  
- MySQL  
- JSON Web Tokens (JWT)

Frontend
- HTML5  
- CSS3  
- JavaScript  



Instalación

1. Clonar el repositorio

2. Entrar al proyecto:
cd inlab

3. Instalar dependencias:
npm install

4. Configurar variables de entorno (.env):

PORT=3000  
DB_HOST=localhost  
DB_USER=root  
DB_PASSWORD=tu_password  
DB_NAME=inlab  
JWT_SECRET=secreto  


Endpoints principales

Autenticación
POST /api/login

Usuarios
GET /api/usuarios  
POST /api/usuarios  
PUT /api/usuarios/:id  
DELETE /api/usuarios/:id  

Laboratorios
GET /api/laboratorios  
POST /api/laboratorios  
PUT /api/laboratorios/:id  
DELETE /api/laboratorios/:id  
