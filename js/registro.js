// registro.js
// Maneja el registro de usuarios con Supabase
// Reestructurado con tipo_usuario como eje principal

// =============================
// 🔹 CONFIGURACIÓN SUPABASE (cliente centralizado)
// =============================
import { supabase } from './supabaseClient.js';
import { getNiveles, getDivisiones, getProgramas, getProgramasPorNivel } from './catalogos/programas.js';
import { loadMarkdownContent } from './markdownRenderer.js';

// =============================
// 🔹 MAPEOS DE NORMALIZACIÓN
// =============================
/**
 * Función para normalizar texto: minúsculas, sin acentos, trim
 */
function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const NIVEL_MAP = {
  'licenciatura': 'licenciatura',
  'posgrado': 'posgrado',
  'tecnico superior universitario': 'tsu'
};

// =============================
// 🔹 CONFIGURACIÓN DE UI DINÁMICA
// =============================
const UI_STRINGS = {
  'estudiante_universidad': {
    divisionLabel: 'División',
    divisionPlaceholder: 'Selecciona una división',
    divisionError: 'Por favor selecciona una división.',
    otherLabel: 'Otra'
  },
  'academico_universidad': {
    divisionLabel: 'División o Coordinación',
    divisionPlaceholder: 'Selecciona una división o coordinación',
    divisionError: 'Por favor selecciona una división o coordinación.',
    otherLabel: 'Otra área',
    extraOptions: [
      { value: 'Coordinación Académica y de Investigación (CAI)', label: 'Coordinación Académica y de Investigación (CAI)' }
    ]
  }
};

/**
 * Agrega opciones adicionales y la opción "Otra" a un select de división
 */
function populateDivisionOptions(selectElement, divisiones, strings) {
  if (!selectElement) return;
  
  selectElement.innerHTML = `<option value="">${strings.divisionPlaceholder}</option>`;
  
  // Agregar divisiones reales
  divisiones.forEach(division => {
    const option = document.createElement('option');
    option.value = division.trim();
    option.textContent = division;
    selectElement.appendChild(option);
  });
  
  // Agregar opciones extra si existen (ej. CAI)
  if (strings.extraOptions) {
    strings.extraOptions.forEach(extra => {
      const option = document.createElement('option');
      option.value = extra.value;
      option.textContent = extra.label;
      selectElement.appendChild(option);
    });
  }
  
  // Agregar opción "Otra" adaptada
  const otraOption = document.createElement('option');
  otraOption.value = 'Otra'; // El valor se mantiene como 'Otra' para lógica interna/DB
  otraOption.textContent = strings.otherLabel;
  selectElement.appendChild(otraOption);
}

/**
 * Actualiza los textos de la interfaz según el tipo de usuario
 */
function updateDivisionUI(tipoUsuario) {
  const strings = UI_STRINGS[tipoUsuario] || UI_STRINGS['estudiante_universidad'];
  
  // Actualizar Label Académico
  const labelAcademico = document.querySelector('label[for="divisionAcademico"]');
  if (labelAcademico) {
    labelAcademico.innerHTML = `${strings.divisionLabel} <span class="required">*</span>`;
  }
  
  // Actualizar Label Estudiante
  const labelEstudiante = document.querySelector('label[for="division"]');
  if (labelEstudiante) {
    labelEstudiante.textContent = strings.divisionLabel;
  }
  
  // Actualizar Placeholders si los selects ya existen
  const selectAcademico = document.getElementById('divisionAcademico');
  if (selectAcademico && selectAcademico.options.length > 0) {
    selectAcademico.options[0].textContent = strings.divisionPlaceholder;
  }
  
  const selectEstudiante = document.getElementById('division');
  if (selectEstudiante && selectEstudiante.options.length > 0) {
    selectEstudiante.options[0].textContent = strings.divisionPlaceholder;
  }
}

// =============================
// 🔹 ESTADO GLOBAL DEL TIPO DE USUARIO
// =============================
let tipoUsuarioActual = null;


// =============================
// 🔹 HELPER: MOSTRAR/OCULTAR CAMPOS
// =============================
function toggleField(containerId, visible, clearInput = true) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (visible) {
    container.style.display = ''; // Dejar que CSS controle el display
  } else {
    container.style.display = 'none';
    // Limpiar inputs/selects si está oculto
    if (clearInput) {
      const inputs = container.querySelectorAll('input, select');
      inputs.forEach(input => {
        input.value = '';
      });
    }
  }
}

// =============================
// 🔹 ACTUALIZAR VALIDACIÓN DE CAMPOS
// =============================
function updateFieldRequired(fieldId, isRequired) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  if (isRequired) {
    field.setAttribute('required', 'required');
  } else {
    field.removeAttribute('required');
  }
}

// =============================
// 🔹 LIMPIAR CAMPOS POR TIPO DE USUARIO
// =============================
function clearFieldsByType(tipoUsuario) {
  // Limpiar todos los campos
  document.querySelectorAll('#registerForm input, #registerForm select').forEach(field => {
    if (field.id !== 'fullName' && field.id !== 'tipoUsuario' && 
        field.id !== 'email' && field.id !== 'password' && field.id !== 'confirmPassword' &&
        field.id !== 'privacyAgree') {
      field.value = '';
    }
  });
  
  // Remover atributo required de todos los campos dinámicos
  ['nivel', 'nivelExterno', 'division', 'divisionAcademico', 'programa', 
   'programaExterno', 'matricula', 'matriculaAcademico', 'tipoExterno', 
   'externoInstitucion', 'externoDisciplina'].forEach(id => {
    updateFieldRequired(id, false);
  });
}

// =============================
// 🔹 ACTUALIZAR ESTADO DEL BOTÓN DE REGISTRO
// =============================
function updateButtonState() {
  const privacyCheckbox = document.getElementById('privacyAgree');
  const registerBtn = document.getElementById('registerSubmitBtn');
  
  if (!privacyCheckbox || !registerBtn) return;
  
  const isChecked = privacyCheckbox.checked;
  registerBtn.disabled = !isChecked;
  
  if (isChecked) {
    // Restaurar estilos originales (quitar inline)
    registerBtn.style.backgroundColor = '';
    registerBtn.style.color = '';
    registerBtn.style.cursor = '';
  } else {
    // Aplicar estilos deshabilitados
    registerBtn.style.backgroundColor = '#ccc';
    registerBtn.style.color = '#666';
    registerBtn.style.cursor = 'not-allowed';
  }
}

// =============================
// 🔹 MANEJAR CAMBIO DE TIPO DE USUARIO (LÓGICA PRINCIPAL)
// =============================
async function handleTipoUsuarioChange(event) {
  const tipoUsuario = event.target.value;
  tipoUsuarioActual = tipoUsuario;
  
  // Ocultar todos los contenedores dinámicos primero
  toggleField('estudiante-universidad-container', false);
  toggleField('estudiante-externo-container', false);
  toggleField('academico-universidad-container', false);
  toggleField('externo-container', false);
  toggleField('externo-academico-container', false);
  
  // Actualizar textos de UI dinámicamente
  updateDivisionUI(tipoUsuario);
  
  // Limpiar todos los campos dinámicos
  clearFieldsByType(tipoUsuario);
  
  // Mostrar campos según tipo de usuario
  if (tipoUsuario === 'estudiante_universidad') {
    // CASO A: nivel -> división -> programa + matricula
    toggleField('estudiante-universidad-container', true, false);
    await initProgramSelects();
    
    updateFieldRequired('nivel', true);
    updateFieldRequired('programa', true);
    
  } else if (tipoUsuario === 'estudiante_externo') {
    // CASO B: nivel + programa (texto libre)
    toggleField('estudiante-externo-container', true, false);
    await initProgramSelectsExterno();
    
    updateFieldRequired('nivelExterno', true);
    updateFieldRequired('programaExterno', true);
    
  } else if (tipoUsuario === 'academico_universidad') {
    // CASO C: división única, SIN matrícula
    toggleField('academico-universidad-container', true, false);
    toggleField('matricula-academico-container', false, true); // Ocultar matrícula
    await initDivisionsAcademico();
    
    updateFieldRequired('divisionAcademico', true);
    
  } else if (tipoUsuario === 'externo') {
    // CASO D: sub-selector + campos según sub-tipo
    toggleField('externo-container', true, false);
    
    updateFieldRequired('tipoExterno', true);
  }
}

// =============================
// 🔹 MANEJAR CAMBIO DE TIPO EXTERNO (sub-selector)
// =============================
function handleTipoExternoChange(event) {
  const tipoExterno = event.target.value;
  
  if (tipoExterno === 'academico') {
    toggleField('externo-academico-container', true, false);
  } else {
    toggleField('externo-academico-container', false, true);
  }
}

// =============================
// 🔹 INICIALIZAR DIVISIONES PARA ACADÉMICOS
// =============================
async function initDivisionsAcademico() {
  const divisionSelect = document.getElementById('divisionAcademico');
  
  if (!divisionSelect) return;
  
  try {
    const nivelesExistentes = await getNiveles();
    const allDivisiones = new Set();
    
    for (const nivel of nivelesExistentes) {
      const divisiones = await getDivisiones(nivel);
      divisiones.forEach(d => allDivisiones.add(d));
    }
    
    // Convertir a array y ordenar
    const divisionesArray = Array.from(allDivisiones).sort((a, b) => a.localeCompare(b));
    
    console.log('Divisiones cargadas para académicos:', divisionesArray);
    
    const strings = UI_STRINGS[tipoUsuarioActual] || UI_STRINGS['estudiante_universidad'];
    populateDivisionOptions(divisionSelect, divisionesArray, strings);
    
  } catch (error) {
    console.error('Error al cargar divisiones para académicos:', error);
  }
}

// =============================
async function initRegister() {
  // Manejar envío del formulario
  const form = document.getElementById('registerForm');
  if (form) {
    form.addEventListener('submit', handleRegister);
  }
  
  // Cargar contenido Markdown del aviso de privacidad
  try {
    await loadMarkdownContent('./content/aviso-privacidad.md', 'aviso-privacidad');
  } catch (error) {
    console.warn('No se pudo cargar el aviso de privacidad:', error);
  }
  
  // Agregar listener principal para cambio de tipo de usuario
  const tipoUsuarioSelect = document.getElementById('tipoUsuario');
  if (tipoUsuarioSelect) {
    tipoUsuarioSelect.addEventListener('change', handleTipoUsuarioChange);
    
    // Inicializar UI si hay un valor seleccionado (por persistencia de sesión/recarga)
    if (tipoUsuarioSelect.value) {
      updateDivisionUI(tipoUsuarioSelect.value);
    }
  }
  
  // Agregar listener para sub-selector de tipo externo
  const tipoExternoSelect = document.getElementById('tipoExterno');
  if (tipoExternoSelect) {
    tipoExternoSelect.addEventListener('change', handleTipoExternoChange);
  }
  
  // Agregar listeners para cambios en nivel y división (CASO A: estudiante_universidad)
  const nivelSelect = document.getElementById('nivel');
  const divisionSelect = document.getElementById('division');
  
  if (nivelSelect) nivelSelect.addEventListener('change', handleNivelChange);
  if (divisionSelect) divisionSelect.addEventListener('change', handleDivisionChange);
  
  // Agregar listener para nivel externo (CASO B)
  const nivelExternoSelect = document.getElementById('nivelExterno');
  if (nivelExternoSelect) {
    // Inicializar niveles para estudiante externo
    await initProgramSelectsExterno();
  }
  
  // Inicializar estado del botón de registro
  updateButtonState();
  
  // Agregar listener para el checkbox de privacidad
  const privacyCheckbox = document.getElementById('privacyAgree');
  if (privacyCheckbox) {
    privacyCheckbox.addEventListener('change', updateButtonState);
  }
}

// =============================
// 🔹 INICIALIZAR SELECTS DE PROGRAMAS - ESTUDIANTE UNIVERSIDAD
// =============================
async function initProgramSelects() {
  const nivelSelect = document.getElementById('nivel');
  
  if (!nivelSelect) return;
  
  try {
    let niveles = await getNiveles();
    
    // Orden deseado (valores originales para referencia)
    const ordenDeseado = [
      "Licenciatura",
      "Posgrado",
      "Técnico superior universitario"
    ];
    
    // Filtrar "Otro" completamente
    niveles = niveles.filter(nivel => normalizarTexto(nivel) !== normalizarTexto('Otro'));
    
    // Versiones normalizadas para comparación
    const ordenNormalizado = ordenDeseado.map(n => normalizarTexto(n));
    
    // Ordenar niveles usando comparación normalizada, pero manteniendo valores originales
    niveles.sort((a, b) => {
      const aNorm = normalizarTexto(a);
      const bNorm = normalizarTexto(b);
    
      const posA = ordenNormalizado.indexOf(aNorm);
      const posB = ordenNormalizado.indexOf(bNorm);
    
      if (posA === -1 && posB === -1) {
        return a.localeCompare(b); // Si ninguno está en ordenDeseado, orden alfabético
      }
      if (posA === -1) return 1; // Los no deseados van al final
      if (posB === -1) return -1;
    
      return posA - posB; // Orden según ordenDeseado
    });
    
    console.log('Niveles ordenados para estudiante universidad:', niveles);

    nivelSelect.innerHTML = '<option value="">Selecciona un nivel</option>';
    
    niveles.forEach(nivel => {
      const option = document.createElement('option');
      // Normalizar el value para la base de datos (slug), pero mantener label original de BD
      const norm = normalizarTexto(nivel);
      option.value = NIVEL_MAP[norm] || norm;
      option.textContent = nivel;
      nivelSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar niveles:', error);
  }
}

// =============================
// 🔹 INICIALIZAR SELECTS DE NIVELES - ESTUDIANTE EXTERNO
// =============================
async function initProgramSelectsExterno() {
  const nivelExternoSelect = document.getElementById('nivelExterno');
  
  if (!nivelExternoSelect) return;
  
  try {
    let niveles = await getNiveles();
    
    // Orden deseado
    const ordenDeseado = [
      "Licenciatura",
      "Posgrado",
      "Técnico superior universitario"
    ];
    
    // Versiones normalizadas
    const ordenNormalizado = ordenDeseado.map(n => normalizarTexto(n));
    
    // Ordenar niveles
    niveles.sort((a, b) => {
      const aNorm = normalizarTexto(a);
      const bNorm = normalizarTexto(b);
    
      const posA = ordenNormalizado.indexOf(aNorm);
      const posB = ordenNormalizado.indexOf(bNorm);
    
      if (posA === -1 && posB === -1) {
        return a.localeCompare(b);
      }
      if (posA === -1) return 1;
      if (posB === -1) return -1;
    
      return posA - posB;
    });
    
    console.log('Niveles ordenados para estudiante externo:', niveles);

    nivelExternoSelect.innerHTML = '<option value="">Selecciona un nivel</option>';
    
    niveles.forEach(nivel => {
      const option = document.createElement('option');
      // Normalizar el value para la base de datos, pero mantener label visible
      const norm = normalizarTexto(nivel);
      option.value = NIVEL_MAP[norm] || norm;
      option.textContent = nivel;
      nivelExternoSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar niveles para externo:', error);
  }
}

// =============================
// 🔹 MANEJAR CAMBIO DE NIVEL
// =============================
async function handleNivelChange(event) {
  const nivelNormalizado = event.target.value;
  const divisionSelect = document.getElementById('division');
  const divisionContainer = document.getElementById('division-container');
  const programaSelect = document.getElementById('programa');
  
  const strings = UI_STRINGS[tipoUsuarioActual] || UI_STRINGS['estudiante_universidad'];
  
  // Limpiar división y programa
  if (divisionSelect) divisionSelect.innerHTML = `<option value="">${strings.divisionPlaceholder}</option>`;
  if (programaSelect) {
    programaSelect.innerHTML = '<option value="">Selecciona un programa</option>';
    programaSelect.disabled = true;
  }
  if (divisionContainer) divisionContainer.style.display = 'none';
  
  if (!nivelNormalizado) return;
  
  // Obtener el texto original del option (el que está en la base de datos)
  const nivelOriginal = event.target.options[event.target.selectedIndex].text;
  
  try {
    // Obtener divisiones para este nivel
    const divisiones = await getDivisiones(nivelOriginal);
    
    if (divisiones.length > 0) {
      // Si existen divisiones, mostrarlas
      if (divisionContainer) divisionContainer.style.display = ''; // Dejar que CSS controle
      if (divisionSelect) {
        populateDivisionOptions(divisionSelect, divisiones, strings);
      }
    } else {
      // Si no hay divisiones, cargar programas directamente
      await loadProgramasPorNivel(nivelOriginal);
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
  
  // Obtener el texto original del nivel seleccionado
  const nivelOriginal = nivelSelect.options[nivelSelect.selectedIndex].text;
  
  try {
    const programas = await getProgramas(nivelOriginal, division);
    
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
// 🔹 CONSTRUIR PAYLOAD DINÁMICO SEGÚN TIPO DE USUARIO
// =============================
function buildPayload(form, tipoUsuario) {
  const fullName = (form.fullName.value || '').trim();
  const strings = UI_STRINGS[tipoUsuario] || UI_STRINGS['estudiante_universidad'];
  
  let payload = {
    full_name: fullName || null,
    tipo_usuario: (tipoUsuario || '').trim() || null,
    matricula: null,
    nivel_educativo: null,
    division: null,
    program_id: null,
    metadata: {}
  };
  
  if (tipoUsuario === 'estudiante_universidad') {
    // CASO A: nivel -> división -> programa + matricula
    const nivel = (form.nivel.value || '').trim();
    const division = (form.division.value || '').trim();
    const programa = (form.programa.value || '').trim();
    const matricula = (form.matricula.value || '').trim();
    
    if (!nivel || !programa) {
      throw new Error('Por favor completa nivel y programa educativo.');
    }
    
    payload.nivel_educativo = nivel || null;
    payload.division = division || null;
    payload.program_id = programa || null;
    payload.matricula = matricula || null;
    
  } else if (tipoUsuario === 'estudiante_externo') {
    // CASO B: nivel + programa (texto libre)
    const nivelExterno = (form.nivelExterno.value || '').trim();
    const programaExterno = (form.programaExterno.value || '').trim();
    
    if (!nivelExterno || !programaExterno) {
      throw new Error('Por favor completa nivel y programa educativo.');
    }
    
    payload.nivel_educativo = nivelExterno || null;
    payload.metadata.programa_educativo = programaExterno || null;
    
  } else if (tipoUsuario === 'academico_universidad') {
    // CASO C: división (estática) + matricula (opcional)
    const divisionAcademico = (form.divisionAcademico.value || '').trim();
    const matriculaAcademico = (form.matriculaAcademico.value || '').trim();
    
    if (!divisionAcademico) {
      throw new Error(strings.divisionError);
    }
    
    payload.division = divisionAcademico || null;
    payload.matricula = matriculaAcademico || null;
    
  } else if (tipoUsuario === 'externo') {
    // CASO D: sub-selector + campos según sub-tipo
    const tipoExterno = (form.tipoExterno.value || '').trim();
    
    if (!tipoExterno) {
      throw new Error('Por favor selecciona si eres académico o usuario.');
    }
    
    if (tipoExterno === 'academico') {
      const institucion = (form.externoInstitucion.value || '').trim();
      const disciplina = (form.externoDisciplina.value || '').trim();
      
      payload.metadata.tipo_externo = 'academico';
      if (institucion) payload.metadata.institucion = institucion;
      if (disciplina) payload.metadata.disciplina = disciplina;
    } else if (tipoExterno === 'usuario') {
      payload.metadata.tipo_externo = 'usuario';
    }
  }
  
  // Limpiar metadatos vacíos si es necesario
  if (Object.keys(payload.metadata).length === 0) {
    // Mantener como objeto vacío para cumplir con el trigger si es necesario
    // o asegurar que sea un objeto válido
  }
  
  return payload;
}

// =============================
// 🔹 VALIDAR FORMULARIO SEGÚN TIPO DE USUARIO
// =============================
function validateFormByType(form, tipoUsuario) {
  const email = (form.email.value || '').trim();
  const password = form.password.value; // No trim para contraseñas
  const confirmPassword = form.confirmPassword.value;
  const fullName = (form.fullName.value || '').trim();
  const strings = UI_STRINGS[tipoUsuario] || UI_STRINGS['estudiante_universidad'];
  
  // Validaciones básicas comunes
  if (!email || !password || !confirmPassword || !fullName) {
    throw new Error('Por favor completa los campos obligatorios.');
  }
  
  if (password !== confirmPassword) {
    throw new Error('Las contraseñas no coinciden.');
  }
  
  if (!tipoUsuario) {
    throw new Error('Por favor selecciona un tipo de usuario.');
  }
  
  // Validaciones específicas por tipo
  if (tipoUsuario === 'estudiante_universidad') {
    const nivel = (form.nivel.value || '').trim();
    const programa = (form.programa.value || '').trim();
    
    if (!nivel || !programa) {
      throw new Error('Por favor completa nivel y programa educativo.');
    }
  } else if (tipoUsuario === 'estudiante_externo') {
    const nivelExterno = (form.nivelExterno.value || '').trim();
    const programaExterno = (form.programaExterno.value || '').trim();
    
    if (!nivelExterno || !programaExterno) {
      throw new Error('Por favor completa nivel y programa educativo.');
    }
  } else if (tipoUsuario === 'academico_universidad') {
    const divisionAcademico = (form.divisionAcademico.value || '').trim();
    
    if (!divisionAcademico) {
      throw new Error(strings.divisionError);
    }
  } else if (tipoUsuario === 'externo') {
    const tipoExterno = (form.tipoExterno.value || '').trim();
    
    if (!tipoExterno) {
      throw new Error('Por favor selecciona si eres académico o usuario.');
    }
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

  const email = (form.email.value || '').trim();
  const password = form.password.value;
  const tipoUsuario = (form.tipoUsuario.value || '').trim();

  try {
    // Validar formulario según tipo de usuario
    validateFormByType(form, tipoUsuario);
    
    // Construir payload dinámico
    const payload = buildPayload(form, tipoUsuario);
    
    console.log('Enviando payload normalizado:', payload);
    
    // Enviar a Supabase con los datos en options.data
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: payload
      }
    });

    if (error) {
      // Manejar errores de constraint de la base de datos que vienen a través de Auth
      if (error.message.includes('profiles_nivel_educativo_check')) {
        alert('Error: El nivel educativo seleccionado no es válido para el sistema.');
      } else {
        alert('Error: ' + error.message);
      }
      return;
    }

    alert('Registro exitoso. Revisa tu correo si la confirmación está activada.');
    
    // Redirigir a login
    location.href = 'login.html';
    
  } catch (error) {
    alert(error.message);
    console.error('Error en registro:', error);
  }
}


// export initialization function for header or entry point
export { initRegister };
