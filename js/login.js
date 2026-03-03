// login.js
// Maneja inicio de sesión con Supabase

// =============================
// 🔹 CONFIGURACIÓN SUPABASE
// =============================
const SUPABASE_URL = 'https://oyefwyqevymkcdpsgvkw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hUqkZIvfFq-8lfwXEp9N9w_2gDd1ywP';

// Crear cliente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// =============================
// 🔹 INICIALIZACIÓN
// =============================
function initLogin() {
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
    window.location.href = 'login.html';
    return;
  }

  const email = form.email.value.trim();
  const password = form.password.value.trim();

  if (!email || !password) {
    alert('Por favor completa todos los campos.');
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert('Error: ' + error.message);
    return;
  }

  alert('Inicio de sesión exitoso.');

  // Redirigir a página de referencias
  window.location.href = 'refer.html';
}


// =============================
// 🔹 DOM READY
// =============================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogin);
} else {
  initLogin();
}