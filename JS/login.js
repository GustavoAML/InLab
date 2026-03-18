const formLogin = document.getElementById('formLogin');
const msg = document.getElementById('msg');

formLogin.addEventListener('submit', async (e) =>{
    e.preventDefault();

    msg.textContent= 'Validando...';
    msg.style.color = 'blue';

    const body = {
        correo: document.getElementById('correo').value.trim(),
        password : document.getElementById('password').value.trim()
    };

    try{
        const resp = await fetch('/api/login',{
            method : 'POST',
            headers: {
                'Content-Type' : 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await resp.json();

        if(!resp.ok){
            msg.textContent = data.error || 'Error';
            msg.style.color = 'red';
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', data.correo);
        localStorage.setItem('nombre', data.nombre);
        localStorage.setItem('appaterno', data.appaterno);
        localStorage.setItem('apmaterno', data.apmaterno);
        localStorage.setItem('rol', data.rol);

        msg.textContent = 'Bienvenido '+ data.nombre+ ' '+data.appaterno+ ' '+ data.apmaterno;
        msg.style.color = 'green';

        setTimeout(() =>{
            window.location.href = 'dashboard.html'
        }, 1000);
    }catch(error){
        msg.textContent = 'Error de conexion';
        msg.style.color = 'red';
    }

});