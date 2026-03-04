// login.js
// Maneja inicio de sesión con Supabase

// =============================
// 🔹 CONFIGURACIÓN SUPABASE (cliente centralizado)
// =============================
import { supabase } from './supabaseClient.js';


// =============================
// 🔹 INICIALIZACIÓN
// =============================
import { requireGuest } from './auth.js';

async function initLogin() {
  // sólo ejecutamos esta inicialización cuando estamos en la página de login,
  // de modo que header.js pueda invocarla en cualquier otra página sin
  // provocar redirecciones inesperadas.
  const page = location.pathname.split('/').pop();
  if (page !== 'login.html') return;

  // redirigir si ya hay sesión activa
  await requireGuest();

  // sólo manejamos el envío del formulario; la navegación del botón se hace en header.js
  const form = document.getElementById('loginForm');
  if (form) form.addEventListener('submit', handleLogin);
}


// =============================
// 🔹 LOGIN
// =============================
async function handleLogin(event) {
  event.preventDefault();

  const form = document.getElementById('loginForm');

  if (!form) {
    location.href = 'login.html';
    return;
  }

  const email = form.email.value.trim();
  const password = form.password.value.trim();

  if (!email || !password) {
    alert('Por favor completa todos los campos.');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert('Error: ' + error.message);
    return;
  }

  // si la respuesta contiene un session, podemos guardar algo o simplemente navegar
  if (data && data.session) {
    // sesión iniciada correctamente
    location.href = 'refer.html';
  } else {
    // en algunos casos la sesión se crea después de confirmación por correo
    alert('Inicio de sesión iniciado. Revisa tu correo si es necesario.');
    location.href = 'login.html';
  }
}


// export initialization function for use by header.js or entry scripts
export { initLogin };
