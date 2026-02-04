// Nota: la fecha incluida en el paréntesis se toma del año de la "fecha de consulta" como valor por defecto.

(function(){
  const form = document.getElementById('refForm');
  const referenceEl = document.getElementById('reference');
  const copyBtn = document.getElementById('copyBtn');

  // ------------------------------
  // Catálogo de modelos de lenguaje IA
  // Estructura:
  // const catalogoModelosIA = {
  //   "ChatGPT": { organizacion: "OpenAI", url: "https://chatgpt.com" },
  //   ...
  // };
  // ------------------------------
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
    "Leo": { organizacion: "Brave Software", url: "https://brave.com/leo" },
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
      // No forzamos ninguna copia en inputs ocultos: el valor final se calculará al enviar.
      // Solo limpiamos posibles mensajes de error mientras escribe.
      if(this.value && this.value.trim().length) this.setCustomValidity('');
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
    const year = accessDate ? parseLocalDate(accessDate).getFullYear() : '';
    const versionPart = modelVersion ? ` (${modelVersion})` : '';
    const displayDate = accessDate ? `Consultado el ${formatDateSpanish(accessDate)}, de ${platformUrl}` : `Recuperado de ${platformUrl}`;

    // Ejemplo: OpenAI. (2026). GPT-4 (v4.1) [Modelo de lenguaje]. Consultado el 3 de febrero de 2026, de https://...
    const pieces = [];
    pieces.push(`${organization}.`);
    pieces.push(`(${year}).`);
    pieces.push(`${modelName}${versionPart} [Modelo de lenguaje].`);
    pieces.push(displayDate);

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
    referenceEl.textContent = apa;
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
