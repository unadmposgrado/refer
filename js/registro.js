// registro.js
// Maneja el registro de usuarios con Supabase

// =============================
// 🔹 CONFIGURACIÓN SUPABASE (cliente centralizado)
// =============================
import { supabase } from './supabaseClient.js';
import { getNiveles, getDivisiones, getProgramas, getProgramasPorNivel } from './catalogos/programas.js';


// =============================
// 🔹 INICIALIZACIÓN
// =============================
async function initRegister() {
  // sólo manejamos el envío del formulario; la navegación del botón se hace en header.js
  const form = document.getElementById('registerForm');
  if (form) {
    form.addEventListener('submit', handleRegister);
    
    // Inicializar selects de programas
    await initProgramSelects();
    
    // Agregar listeners para cambios en nivel y división
    const nivelSelect = document.getElementById('nivel');
    const divisionSelect = document.getElementById('division');
    
    if (nivelSelect) nivelSelect.addEventListener('change', handleNivelChange);
    if (divisionSelect) divisionSelect.addEventListener('change', handleDivisionChange);
  }
}

// =============================
// 🔹 INICIALIZAR SELECTS DE PROGRAMAS
// =============================
async function initProgramSelects() {
  const nivelSelect = document.getElementById('nivel');
  
  if (!nivelSelect) return;
  
  try {
    let niveles = await getNiveles();
    console.log('Niveles obtenidos de BD (orden alfabético):', niveles);
    
    // ordenar los niveles en el orden específico requerido por diseño.
    // cualquier valor inesperado se coloca al final en orden alfabético para
    // no romper la lógica existente.
    const ordenDeseado = [
      'Licenciatura',
      'Posgrado',
      'Técnico superior universitario',
      'Otro'
    ];

    // crear arreglo nuevo combinando primero los pedidos y luego el resto
    const restantes = niveles.filter(n => !ordenDeseado.includes(n)).sort((a, b) => a.localeCompare(b));
    niveles = ordenDeseado.filter(n => niveles.includes(n)).concat(restantes);
    
    console.log('Niveles reordenados para renderizar:', niveles);

    nivelSelect.innerHTML = '<option value="">Selecciona un nivel</option>';
    
    niveles.forEach(nivel => {
      const option = document.createElement('option');
      option.value = nivel;
      option.textContent = nivel;
      nivelSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar niveles:', error);
  }
}

// =============================
// 🔹 MANEJAR CAMBIO DE NIVEL
// =============================
async function handleNivelChange(event) {
  const nivel = event.target.value;
  const divisionSelect = document.getElementById('division');
  const divisionContainer = document.getElementById('division-container');
  const programaSelect = document.getElementById('programa');
  
  // Limpiar división y programa
  if (divisionSelect) divisionSelect.innerHTML = '<option value="">Selecciona una división</option>';
  if (programaSelect) {
    programaSelect.innerHTML = '<option value="">Selecciona un programa</option>';
    programaSelect.disabled = true;
  }
  if (divisionContainer) divisionContainer.style.display = 'none';
  
  if (!nivel) return;
  
  try {
    // Obtener divisiones para este nivel
    const divisiones = await getDivisiones(nivel);
    
    if (divisiones.length > 0) {
      // Si existen divisiones, mostrarlas
      if (divisionContainer) divisionContainer.style.display = 'flex';
      if (divisionSelect) {
        divisionSelect.innerHTML = '<option value="">Selecciona una división</option>';
        divisiones.forEach(division => {
          const option = document.createElement('option');
          option.value = division;
          option.textContent = division;
          divisionSelect.appendChild(option);
        });
      }
    } else {
      // Si no hay divisiones, cargar programas directamente
      await loadProgramasPorNivel(nivel);
    }
  } catch (error) {
    console.error('Error al cambiar nivel:', error);
  }
}

// =============================
// 🔹 MANEJAR CAMBIO DE DIVISIÓN
// =============================
async function handleDivisionChange(event) {
  const division = event.target.value;
  const nivelSelect = document.getElementById('nivel');
  const programaSelect = document.getElementById('programa');
  
  if (!division || !nivelSelect) return;
  
  const nivel = nivelSelect.value;
  
  try {
    const programas = await getProgramas(nivel, division);
    
    if (programaSelect) {
      programaSelect.innerHTML = '<option value="">Selecciona un programa</option>';
      programaSelect.disabled = false;
      
      programas.forEach(programa => {
        const option = document.createElement('option');
        option.value = programa.id;
        option.textContent = programa.nombre;
        programaSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error al cambiar división:', error);
  }
}

// =============================
// 🔹 CARGAR PROGRAMAS POR NIVEL (SIN DIVISIÓN)
// =============================
async function loadProgramasPorNivel(nivel) {
  const programaSelect = document.getElementById('programa');
  
  try {
    const programas = await getProgramasPorNivel(nivel);
    
    if (programaSelect) {
      programaSelect.innerHTML = '<option value="">Selecciona un programa</option>';
      programaSelect.disabled = false;
      
      programas.forEach(programa => {
        const option = document.createElement('option');
        option.value = programa.id;
        option.textContent = programa.nombre;
        programaSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error al cargar programas por nivel:', error);
  }
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
  const programa = form.programa.value.trim();
  const matricula = form.matricula.value.trim(); // opcional

  // validaciones básicas
  if (!email || !password || !confirmPassword || !fullName || !programa) {
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
        program_id: programa,
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
