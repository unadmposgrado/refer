// Nota: la fecha incluida en el paréntesis se toma del año de la "fecha de consulta" como valor por defecto.

// 🔹 CONFIGURACIÓN SUPABASE - usar cliente centralizado
import { supabase } from './supabaseClient.js';
import { initAuthListener } from './auth.js';
import { saveCitation } from './citations.js';

// cache local para evitar múltiples consultas a la misma fila y para
// facilitar la traducción nombre→id que usa el autocompletado por URL
const modelCache = {}; // { [id]: {name, organization, url} }


// ------------------------------------------------------
// Autenticación: listener centralizado
// ------------------------------------------------------

// iniciamos el listener una sola vez para toda la aplicación
// las redirecciones específicas de cada página se delegan a auth.js
initAuthListener();

// ------------------------------------------------------
// Carga dinámicamente la lista de modelos desde Supabase
// ------------------------------------------------------

/**
 * Obtiene los modelos registrados en la tabla `models` de Supabase,
 * ordenados por nombre, y rellena el <select> correspondiente.
 * Cualquier opción existente se elimina antes de añadir las nuevas.
 *
 * NOTA: no se deben hardcodear UUIDs ni modificar el esquema.
 */
export async function loadModels(){
  const select = document.getElementById('model-select');
  if(!select) return;

  try{
    const { data, error } = await supabase
      .from('models')
      // obtenemos también organización y url para rellenado automático
      .select('id, name, organization_responsible, model_url')
      .order('name');

    if(error){
      console.error('Error cargando modelos:', error);
      return;
    }

    // eliminar todas las opciones previas
    select.innerHTML = '';

    // opción de marcador de posición inicial
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Selecciona un modelo --';
    select.appendChild(placeholder);

    data.forEach(model => {
      // guardar en caché para otras partes del script
      modelCache[model.id] = {
        name: model.name,
        organization: model.organization_responsible || '',
        url: model.model_url || ''
      };

      const opt = document.createElement('option');
      opt.value = model.id;
      opt.textContent = model.name;
      select.appendChild(opt);
    });

    // mantener la opción "Otro modelo" para permitir entrada manual
    const otro = document.createElement('option');
    otro.value = 'otro';
    otro.textContent = 'Otro modelo';
    select.appendChild(otro);
  }catch(err){
    console.error('Excepción al cargar modelos:', err);
  }
}

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', loadModels);

// ------------------------------------------------------
// Código existente de la aplicación (formulario, catálogo, etc.)
// ------------------------------------------------------
// ------------------------------------------------------
// Código existente de la aplicación (formulario, catálogo, etc.)
// ------------------------------------------------------

(function(){
  const form = document.getElementById('refForm');
  const formError = document.getElementById('formError');
  const referenceEl = document.getElementById('reference');
  const copyBtn = document.getElementById('copyBtn');

  // si la página no tiene formulario de citas (por ejemplo index.html), abandonamos
  if (!form) {
    // nada que hacer aquí, el resto del script solo se utiliza en refer.html
    return;
  }

    // Catálogo de modelos de lenguaje IA
  
  const catalogoModelosIA = {
    "ChatGPT": { organizacion: "OpenAI", url: "https://chatgpt.com" },
    "Gemini": { organizacion: "Google DeepMind", url: "https://gemini.google.com" },
    "Claude": { organizacion: "Anthropic", url: "https://www.anthropic.com/claude" },
    "Copilot": { organizacion: "Microsoft", url: "https://copilot.microsoft.com" },
    "LLaMA": { organizacion: "Meta AI", url: "https://ai.meta.com/llama" },
    "Qwen": { organizacion: "Alibaba Cloud", url: "https://qwenlm.ai" },
    "DeepSeek": { organizacion: "DeepSeek AI", url: "https://www.deepseek.com" },
    "Grok": { organizacion: "xAI", url: "https://x.ai" },
    "Perplexity": { organizacion: "Perplexity AI", url: "https://www.perplexity.ai" },
    "Consensus": { organizacion: "Consensus", url: "https://consensus.app" },
  };

  // Catálogo indexado por dominio para autocompletado desde URL

  const catalogoIAporDominio = {
    "chatgpt.com": { modelo: "ChatGPT", organizacion: "OpenAI", url: "https://chatgpt.com" },
    "gemini.google.com": { modelo: "Gemini", organizacion: "Google DeepMind", url: "https://gemini.google.com" },
    "claude.ai": { modelo: "Claude", organizacion: "Anthropic", url: "https://www.anthropic.com/claude" },
    "copilot.microsoft.com": { modelo: "Copilot", organizacion: "Microsoft", url: "https://copilot.microsoft.com" },
    "www.meta.ai": { modelo: "LLaMA", organizacion: "Meta AI", url: "https://www.meta.ai/" },
    "chat.qwen.ai": { modelo: "Qwen", organizacion: "Alibaba Cloud", url: "https://chat.qwen.ai" },
    "chat.deepseek.com": { modelo: "DeepSeek", organizacion: "DeepSeek AI", url: "https://chat.deepseek.com/" },
    "grok.com": { modelo: "Grok", organizacion: "xAI", url: "https://grok.com/" },
    "www.perplexity.ai": { modelo: "Perplexity", organizacion: "Perplexity AI", url: "https://www.perplexity.ai" },
    "consensus.app": { modelo: "Consensus", organizacion: "Consensus", url: "https://consensus.app" },
  };

  // Elementos del DOM para interacción con el catálogo
  const modelSelect = document.getElementById('model-select');
  const modelNameCustom = document.getElementById('model-name-custom');
  // Fila que contiene el label + input para "Otro modelo" — se muestra/oculta completa para mantener orden visual
  const modelOtherRow = document.getElementById('model-other-row');
  const organizationInput = document.getElementById('organization-custom');
  const platformUrlInput = document.getElementById('platformUrl');

  // Poblar el <select> con las entradas del catálogo (orden en el objeto)
  (function populateModelSelect(){
    if(!modelSelect) return;
    Object.keys(catalogoModelosIA).forEach(function(modelName){
      const opt = document.createElement('option');
      opt.value = modelName;
      opt.textContent = modelName;
      modelSelect.appendChild(opt);
    });
    const optOtro = document.createElement('option');
    optOtro.value = 'otro';
    optOtro.textContent = 'Otro modelo';
    modelSelect.appendChild(optOtro);
  })();

  // Gestionar cambios en la selección del modelo
  if(modelSelect){
    /*
      Cuando el usuario elige un modelo del <select> principal los datos
      de `organization_responsible` y `model_url` se obtienen directamente
      desde la tabla `models` de Supabase. Se conservan los casos de
      placeholder y "otro" como estaban antes. Se añaden logs para
      depuración y se transforman valores vacíos a cadenas vacías que más
      tarde se convierten a `null` en saveCitation().
    */
    modelSelect.addEventListener('change', async function(){
      const v = this.value;
      console.debug('Cambio de modelo seleccionado:', v);

      if(!v){
        // placeholder seleccionado
        console.debug('Placeholder seleccionado, limpiando campos.');
        if(modelOtherRow) modelOtherRow.style.display = 'none';
        if(modelNameCustom) { modelNameCustom.setAttribute('aria-hidden','true'); modelNameCustom.required = false; modelNameCustom.value = ''; }
        if (organizationInput) organizationInput.value = '';
        if (platformUrlInput) platformUrlInput.value = '';
        this.removeAttribute('aria-disabled');
        return;
      }

      if(v === 'otro'){
        console.debug('"Otro modelo" seleccionado, habilitando ingreso manual.');
        // Mostrar fila para escribir otro modelo (se oculta/monitored como bloque para mantener orden)
        if(modelOtherRow) modelOtherRow.style.display = '';
        if(modelNameCustom){ modelNameCustom.removeAttribute('aria-hidden'); modelNameCustom.required = true; modelNameCustom.value = ''; modelNameCustom.focus(); }
        // Limpiar organización y URL para que el usuario pueda escribirlas
        if (organizationInput) organizationInput.value = '';
        if (platformUrlInput) platformUrlInput.value = '';
        // Indicar visualmente que el select está en modo "otro"
        this.setAttribute('aria-disabled','true');
        return;
      }

      // Modelo válido seleccionado; ocultar el campo "otro" y normalizar el select
      if(modelOtherRow) modelOtherRow.style.display = 'none';
      if(modelNameCustom){ modelNameCustom.setAttribute('aria-hidden','true'); modelNameCustom.required = false; }
      this.removeAttribute('aria-disabled');

      // Intentar primero aprovechar cualquier información previamente cargada
      // en la caché (populateModelSelect / loadModels guarda organisation/url).
      let org = '';
      let url = '';
      if(modelCache[v]){
        org = modelCache[v].organization || '';
        url = modelCache[v].url || '';
      }
      // si no tenemos nada útil, hacemos una consulta puntual a Supabase
      if(!org && !url){
        try{
          const { data: modelData, error } = await supabase
            .from('models')
            .select('organization_responsible, model_url')
            .eq('id', v)
            .single();
          if(error){
            console.error('Error al consultar modelo en Supabase:', error);
          }
          if(modelData){
            org = modelData.organization_responsible || '';
            url = modelData.model_url || '';
            // almacenar en caché para el futuro
            modelCache[v] = modelCache[v] || {};
            modelCache[v].organization = org;
            modelCache[v].url = url;
          }
        }catch(err){
          console.error('Excepción al obtener detalles del modelo:', err);
        }
      }

      // Si por alguna razón no obtuvimos datos, usar catálogo local como respaldo
      if((!org && !url) && catalogoModelosIA[v]){
        const entry = catalogoModelosIA[v];
        org = entry.organizacion || '';
        url = entry.url || '';
      }

      if (organizationInput) organizationInput.value = org;
      if (platformUrlInput) platformUrlInput.value = url;
      console.debug('Valores rellenados -> organización:', org, 'url:', url);
    });
  }

  // Mantener sincronía si el usuario escribe manualmente en "Otro modelo"
  if(modelNameCustom){
    modelNameCustom.addEventListener('input', function(){
      if(this.value && this.value.trim().length) this.setCustomValidity('');
      if(formError) formError.textContent = '';
    });
  }

  // limpiar mensaje de error cuando el usuario corrige datos de modelo/organización
  if(modelSelect){
    modelSelect.addEventListener('change', ()=>{ if(formError) formError.textContent = ''; });
  }
  if(organizationInput){
    organizationInput.addEventListener('input', ()=>{ if(formError) formError.textContent = ''; });
  }

  // Función auxiliar para extraer dominio de una URL
  function extractDomainFromUrl(urlStr){
    if(!urlStr || typeof urlStr !== 'string') return null;
    try{
      const url = new URL(urlStr);
      return url.hostname.toLowerCase();
    }catch(e){
      return null;
    }
  }

  // Autocompletado desde URL: escuchar cambios en el campo "URL de la plataforma"
  if(platformUrlInput){
    platformUrlInput.addEventListener('blur', function(){
      const urlValue = (this.value || '').trim();
      if(!urlValue) return;

      // Extraer el dominio de la URL
      const domain = extractDomainFromUrl(urlValue);
      if(!domain) return;

      // Buscar en el catálogo por dominio
      const entry = catalogoIAporDominio[domain];

      if(entry){
        // Caso: coincidencia encontrada
        // Autocompletar modelo, organización, URL y fecha de consulta
        const modelName = entry.modelo;
        const organization = entry.organizacion;
        const officialUrl = entry.url;

        // Buscar el modelo en el select para activarlo (convertir nombre → id usando caché)
        if(modelSelect){
          const idMatch = Object.keys(modelCache).find(id => modelCache[id].name === modelName);
          if(idMatch){
            // Seleccionar el modelo en el select (esto también dispara el change listener)
            modelSelect.value = idMatch;
            modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }else{
            // El modelo no está en el select, activar "Otro modelo"
            modelSelect.value = 'otro';
            modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
            if(modelNameCustom){
              modelNameCustom.value = modelName;
            }
          }
        }

        // Autocompletar organización
        if (organizationInput) organizationInput.value = organization;

        // Reemplazar la URL por la oficial del catálogo
        if (this) this.value = officialUrl;

        // Autocompletar fecha de consulta con la fecha actual
        const today = new Date();
        const isoDate = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const accessDateInput = document.getElementById('consulta-fecha');
        if(accessDateInput && !accessDateInput.value){
          accessDateInput.value = isoDate;
        }
      }else{
        // Caso: sin coincidencia
        // Activar "Otro modelo" para que el usuario pueda escribir manualmente
        if(modelSelect){
          modelSelect.value = 'otro';
          modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Limpiar organización (el usuario debe llenarla manualmente)
        if (organizationInput) organizationInput.value = '';
        // Mantener la URL que escribió el usuario
        // Autocompletar fecha de consulta con la fecha actual
        const today = new Date();
        const isoDate = today.toISOString().split('T')[0];
        const accessDateInput = document.getElementById('consulta-fecha');
        if(accessDateInput && !accessDateInput.value){
          accessDateInput.value = isoDate;
        }
      }
    });
  }

  function parseLocalDate(dateStr){
    // Si ya es Date, devolverlo
    if(dateStr instanceof Date) return dateStr;
    if(!dateStr) return null;
    // <input type="date"> devuelve 'YYYY-MM-DD' — crear Date en zona local para evitar desfase por UTC
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if(isoMatch){
      const y = Number(isoMatch[1]);
      const m = Number(isoMatch[2]) - 1; // monthIndex
      const d = Number(isoMatch[3]);
      return new Date(y, m, d);
    }
    // Fallback a parsing estándar para otros formatos
    return new Date(dateStr);
  }

  function formatDateSpanish(dateStr){
    const d = parseLocalDate(dateStr);
    if(!d) return '';
    return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric'}).format(d);
  }

  function buildAPA({organization, modelName, modelVersion, accessDate, platformUrl}){
    // Helper para escapar texto y evitar inyección HTML (solo permitimos <em> explícitamente)
    function escapeHtml(str){
      return String(str || '').replace(/[&<>\"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; });
    }

    // Tomar la fecha de consulta si existe, o la fecha actual como valor por defecto
    const dateObj = accessDate ? parseLocalDate(accessDate) : new Date();
    const year = dateObj ? dateObj.getFullYear() : '';
    const day = dateObj ? dateObj.getDate() : '';
    const monthName = dateObj ? new Intl.DateTimeFormat('es-ES',{month:'long'}).format(dateObj) : '';
    const dateParen = `(${year}${day ? `, ${day} de ${monthName}` : ''})`;

    // Escapar valores de usuario antes de inyectar en HTML
    const orgSafe = escapeHtml(organization);
    const modelSafe = escapeHtml(modelName);
    const versionSafe = escapeHtml(modelVersion);
    const urlSafe = escapeHtml(platformUrl);

    // Asegurar que la versión incluya la palabra "versión" por consistencia con la plantilla
    const versionPart = versionSafe ? ` (versión ${versionSafe})` : '';

    // Construir la referencia con el nombre del modelo en cursivas (<em>)
    const pieces = [];
    pieces.push(`${orgSafe} ${dateParen}.`);
    pieces.push(`<em>${modelSafe}</em>${versionPart} [Modelo de lenguaje de gran escala].`);
    if(urlSafe) pieces.push(urlSafe);

    return pieces.join(' ');
  }

  if (form) {
    form.addEventListener('submit', function(evt){
    evt.preventDefault();
    // limpiar mensajes previos
    if(formError) formError.textContent = '';

    // Dejar que HTML nativo valide los campos básicos
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }

    const data = new FormData(form);

    // Determinar el nombre del modelo final: seleccionado en el <select> o escrito en "Otro modelo"
    let finalModelName = '';
    const selValue = modelSelect ? modelSelect.value : '';
    if(selValue === 'otro'){
      finalModelName = (modelNameCustom ? modelNameCustom.value : '').trim();
      if(!finalModelName){
        if(modelNameCustom){
          modelNameCustom.setCustomValidity('Por favor ingrese el nombre del modelo.');
          modelNameCustom.reportValidity();
        }
        return;
      }
    }else{
      // cuando la lista viene de Supabase, el valor es el id; buscar nombre en caché
      if(selValue && modelCache[selValue]){
        finalModelName = modelCache[selValue].name || '';
      } else {
        finalModelName = selValue ? selValue.trim() : '';
      }
    }

    // Validación extra: si no hay model_id válido, debe haber nombre y organización personalizados
    const orgVal = organizationInput ? organizationInput.value.trim() : '';
    if((!selValue || selValue === '') || selValue === 'otro'){
      // Aquí estamos en el caso de no seleccionar modelo oficial o usar "otro"
      if(!finalModelName || !orgVal){
        if(formError) formError.textContent = 'Debe proporcionar un modelo (o datos personalizados: nombre y organización).';
        return;
      }
    }

    const values = {
      organization: (data.get('organization-custom') || '').trim(),
      modelName: finalModelName,
      modelVersion: (data.get('model-version') || '').trim(),
      accessDate: data.get('consulta-fecha') || '',
      platformUrl: (data.get('platformUrl') || '').trim(),
      tema: (data.get('tema') || '').trim(),
      prompt: (data.get('prompt') || '').trim(),
      llm_response: (data.get('llm-response') || '').trim()
    };

    const apa = buildAPA(values);
    // `apa` contiene HTML seguro (solo <em> intencional) — mostrar con innerHTML para cursivas
    if (referenceEl) {
      referenceEl.innerHTML = apa;
      referenceEl.focus();
    }

    // después de generar la referencia, intentar guardar en la tabla citations
    (async function(){
      // determinar campos de modelo / personalizados según las reglas de negocio
      const selectedModel = modelSelect ? modelSelect.value : '';

      let model_id = null;
      let model_name_custom = null;
      let organization_custom = null;

      if (selectedModel && selectedModel !== 'otro') {
        // sólo tratamos como `model_id` cuando tenemos un UUID legítimo
        // (lo verificamos por caché o por patrón simple) para evitar enviar
        // nombres como "ChatGPT" cuando se agregan opciones estáticas al
        // <select>.
        const looksLikeUuid = /^[0-9a-fA-F\-]{36}$/.test(selectedModel);
        if (modelCache[selectedModel] || looksLikeUuid) {
          model_id = selectedModel;
        } else {
          // si no es un id conocido, retrocedemos a modo manual
          model_name_custom = finalModelName || null;
          organization_custom = values.organization || null;
        }
      } else if (selectedModel === 'otro') {
        // usuario escribió los datos a mano
        model_name_custom = finalModelName || null;
        organization_custom = values.organization || null;
      }

      const citationData = {
        model_id,
        model_name_custom,
        organization_custom,
        version: values.modelVersion || null,
        consulta_fecha: values.accessDate || null,
        tema: values.tema || null,
        prompt: values.prompt || null,
        llm_response: values.llm_response || null,
        citation_text: apa
      };

      try {
        const { error } = await saveCitation(citationData);
        if (error) {
          console.error('Error guardando cita:', error);
        } else {
          // guardado exitoso: limpiar campos opcionales manteniendo modelo
          if(document.getElementById('model-version')) document.getElementById('model-version').value = '';
          if(document.getElementById('tema')) document.getElementById('tema').value = '';
          if(document.getElementById('prompt')) document.getElementById('prompt').value = '';
          if(document.getElementById('llm-response')) document.getElementById('llm-response').value = '';
          // no tocamos consulta-fecha ni selección de modelo
        }
      } catch (err) {
        console.error('Error inesperado guardando cita:', err);
      }
    })();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', async function(){
      const text = referenceEl.textContent && referenceEl.textContent.trim();
      if(!text){
        copyBtn.setAttribute('aria-disabled','true');
        return;
      }
      try{
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copiado ✓';
        setTimeout(()=> copyBtn.textContent = 'Copiar referencia', 2000);
      }catch(e){
        console.error('No se pudo copiar', e);
        copyBtn.textContent = 'Error al copiar';
        setTimeout(()=> copyBtn.textContent = 'Copiar referencia', 2000);
      }
    });
  }
  }
})();
