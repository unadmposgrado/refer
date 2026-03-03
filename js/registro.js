// registro.js
// Maneja el registro de usuarios con Supabase

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
function initRegister() {
  // sólo manejamos el envío del formulario; la navegación del botón se hace en header.js
  const form = document.getElementById('registerForm');
  if (form) form.addEventListener('submit', handleRegister);
}


// =============================
// 🔹 REGISTRO
// =============================
async function handleRegister(event) {
  event.preventDefault();

  const form = document.getElementById('registerForm');

  if (!form) {
    window.location.href = 'registro.html';
    return;
  }

  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const fullName = form.fullName.value.trim();
  const program = form.program.value.trim();
  const matricula = form.matricula.value.trim(); // opcional

  if (!email || !password || !fullName || !program) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  // pasamos los datos extra como user_metadata a Supabase
  const { data, error } = await supabaseClient.auth.signUp(
    {
      email,
      password
    },
    {
      data: {
        full_name: fullName,
        program: program,
        matricula: matricula || null
      }
    }
  );

  if (error) {
    alert('Error: ' + error.message);
    return;
  }

  alert('Registro exitoso. Revisa tu correo si la confirmación está activada.');
  
  // Redirigir a login
  window.location.href = 'login.html';
}


// =============================
// 🔹 DOM READY
// =============================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRegister);
} else {
  initRegister();
}
