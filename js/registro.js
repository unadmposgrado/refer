// registro.js
// Maneja el registro de usuarios con Supabase

// =============================
// 🔹 CONFIGURACIÓN SUPABASE (cliente centralizado)
// =============================
import { supabase } from './supabaseClient.js';


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
    location.href = 'registro.html';
    return;
  }

  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const confirmPassword = form.confirmPassword.value.trim();
  const fullName = form.fullName.value.trim();
  const program = form.program.value.trim();
  const matricula = form.matricula.value.trim(); // opcional

  // validaciones básicas
  if (!email || !password || !confirmPassword || !fullName || !program) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  if (password !== confirmPassword) {
    alert('Las contraseñas no coinciden.');
    return;
  }

  // pasamos los datos extra como user_metadata a Supabase (v2 API requiere "options.data")
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        program: program,
        matricula: matricula || null
      }
    }
  });

  if (error) {
    alert('Error: ' + error.message);
    return;
  }

  alert('Registro exitoso. Revisa tu correo si la confirmación está activada.');
  
  // Redirigir a login
  location.href = 'login.html';
}


// export initialization function for header or entry point
export { initRegister };
