// Nota: la fecha incluida en el paréntesis se toma del año de la "fecha de consulta" como valor por defecto.

(function(){
  const form = document.getElementById('refForm');
  const referenceEl = document.getElementById('reference');
  const copyBtn = document.getElementById('copyBtn');

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
    "chat.openai.com": { modelo: "ChatGPT", organizacion: "OpenAI", url: "https://chatgpt.com" },
    "openai.com": { modelo: "ChatGPT", organizacion: "OpenAI", url: "https://chatgpt.com" },
    "gemini.google.com": { modelo: "Gemini", organizacion: "Google DeepMind", url: "https://gemini.google.com" },
    "claude.ai": { modelo: "Claude", organizacion: "Anthropic", url: "https://www.anthropic.com/claude" },
    "copilot.microsoft.com": { modelo: "Copilot", organizacion: "Microsoft", url: "https://copilot.microsoft.com" },
    "www.meta.ai": { modelo: "LLaMA", organizacion: "Meta AI", url: "https://www.meta.ai/" },
    "chat.qwen.ai": { modelo: "Qwen", organizacion: "Alibaba Cloud", url: "https://chat.qwen.ai" },
    "chat.deepseek.com": { modelo: "DeepSeek", organizacion: "DeepSeek AI", url: "https://chat.deepseek.com/" },
    "grok.com": { modelo: "Grok", organizacion: "xAI", url: "https://grok.com/" },
    "perplexity.ai": { modelo: "Perplexity", organizacion: "Perplexity AI", url: "https://www.perplexity.ai" },
    "www.perplexity.ai": { modelo: "Perplexity", organizacion: "Perplexity AI", url: "https://www.perplexity.ai" },
    "consensus.app": { modelo: "Consensus", organizacion: "Consensus", url: "https://consensus.app" },
  };

  // Elementos del DOM para interacción con el catálogo
  const modelSelect = document.getElementById('modelSelect');
  const modelOther = document.getElementById('modelOther');
  // Fila que contiene el label + input para "Otro modelo" — se muestra/oculta completa para mantener orden visual
  const modelOtherRow = document.getElementById('modelOtherRow');
  const organizationInput = document.getElementById('organization');
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
    modelSelect.addEventListener('change', function(){
      const v = this.value;
      if(!v){
        // placeholder seleccionado
        if(modelOtherRow) modelOtherRow.style.display = 'none';
        if(modelOther) { modelOther.setAttribute('aria-hidden','true'); modelOther.required = false; modelOther.value = ''; }
        organizationInput.value = '';
        platformUrlInput.value = '';
        this.removeAttribute('aria-disabled');
        return;
      }

      if(v === 'otro'){
        // Mostrar fila para escribir otro modelo (se oculta/monitored como bloque para mantener orden)
        if(modelOtherRow) modelOtherRow.style.display = '';
        if(modelOther){ modelOther.removeAttribute('aria-hidden'); modelOther.required = true; modelOther.value = ''; modelOther.focus(); }
        // Limpiar organización y URL para que el usuario pueda escribirlas
        organizationInput.value = '';
        platformUrlInput.value = '';
        // Indicar visualmente que el select está en modo "otro"
        this.setAttribute('aria-disabled','true');
        return;
      }

      // Modelo del catálogo seleccionado: autocompletar organización y URL
      if(modelOtherRow) modelOtherRow.style.display = 'none';
      if(modelOther){ modelOther.setAttribute('aria-hidden','true'); modelOther.required = false; }
      this.removeAttribute('aria-disabled');

      const entry = catalogoModelosIA[v];
      if(entry){
        organizationInput.value = entry.organizacion || '';
        platformUrlInput.value = entry.url || '';
      }else{
        organizationInput.value = '';
        platformUrlInput.value = '';
      }
    });
  }

  // Mantener sincronía si el usuario escribe manualmente en "Otro modelo"
  if(modelOther){
    modelOther.addEventListener('input', function(){
      // No forzar ninguna copia en inputs ocultos: el valor final se calculará al enviar.
      // Solo limpiar posibles mensajes de error mientras escribe.
      if(this.value && this.value.trim().length) this.setCustomValidity('');
    });
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

        // Buscar el modelo en el select para activarlo
        if(modelSelect){
          const foundOption = Array.from(modelSelect.options).find(opt => opt.value === modelName);
          if(foundOption){
            // Seleccionar el modelo en el select (esto también dispara el change listener)
            modelSelect.value = modelName;
            modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }else{
            // El modelo no está en el select, activar "Otro modelo"
            modelSelect.value = 'otro';
            modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
            if(modelOther){
              modelOther.value = modelName;
            }
          }
        }

        // Autocompletar organización
        organizationInput.value = organization;

        // Reemplazar la URL por la oficial del catálogo
        this.value = officialUrl;

        // Autocompletar fecha de consulta con la fecha actual
        const today = new Date();
        const isoDate = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const accessDateInput = document.getElementById('accessDate');
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
        organizationInput.value = '';
        // Mantener la URL que escribió el usuario
        // Autocompletar fecha de consulta con la fecha actual
        const today = new Date();
        const isoDate = today.toISOString().split('T')[0];
        const accessDateInput = document.getElementById('accessDate');
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
    pieces.push(`<em>${modelSafe}</em>${versionPart} [Modelo de lenguaje grande].`);
    if(urlSafe) pieces.push(urlSafe);

    return pieces.join(' ');
  }

  form.addEventListener('submit', function(evt){
    evt.preventDefault();
    // Dejar que HTML nativo valide los campos
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }

    const data = new FormData(form);

    // Determinar el nombre del modelo final: seleccionado en el <select> o escrito en "Otro modelo"
    let finalModelName = '';
    const selValue = modelSelect ? modelSelect.value : '';
    if(selValue === 'otro'){
      finalModelName = (modelOther ? modelOther.value : '').trim();
      if(!finalModelName){
        // Forzar validación nativa mostrando un mensaje sobre el campo visible
        if(modelOther){
          modelOther.setCustomValidity('Por favor ingrese el nombre del modelo.');
          modelOther.reportValidity();
        }
        return;
      }
    }else{
      finalModelName = selValue ? selValue.trim() : '';
    }

    const values = {
      organization: (data.get('organization') || '').trim(),
      modelName: finalModelName,
      modelVersion: (data.get('modelVersion') || '').trim(),
      accessDate: data.get('accessDate') || '',
      platformUrl: (data.get('platformUrl') || '').trim()
    };

    const apa = buildAPA(values);
    // `apa` contiene HTML seguro (solo <em> intencional) — mostrar con innerHTML para cursivas
    referenceEl.innerHTML = apa;
    referenceEl.focus();
  });

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
})();
