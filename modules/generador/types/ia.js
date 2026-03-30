// Nota: la fecha incluida en el paréntesis se toma del año de la "fecha de consulta" como valor por defecto.

// 🔹 CONFIGURACIÓN SUPABASE - usar cliente centralizado
import { supabase } from '../../../js/supabaseClient.js';
import { initAuthListener } from '../../../js/auth.js';
import { saveCitation } from '../../../js/citations.js';

// cache local para evitar múltiples consultas a la misma fila y para
// facilitar la traducción nombre→id que usa el autocompletado por URL
const modelCache = {}; // { [id]: {name, organization, url} }

// iniciamos el listener una sola vez para toda la aplicación
initAuthListener();

export function initIA(container) {
  if (!container) return;

  const referenceEl = document.getElementById('reference');
  const copyBtn = document.getElementById('copyBtn');

  function getEl(selector) {
    return container.querySelector(selector);
  }

  async function loadModels() {
    const select = getEl('#model-select');
    if (!select) return;

    try {
      const { data, error } = await supabase
        .from('models')
        .select('id, name, organization_responsible, model_url')
        .order('name');

      if (error) {
        console.error('Error cargando modelos:', error);
        return;
      }

      select.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '-- Selecciona un modelo --';
      select.appendChild(placeholder);

      data.forEach(model => {
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

      const otro = document.createElement('option');
      otro.value = 'otro';
      otro.textContent = 'Otro modelo';
      select.appendChild(otro);
    } catch (err) {
      console.error('Excepción al cargar modelos:', err);
    }
  }

  const catalogoModelosIA = {
    ChatGPT: { organizacion: 'OpenAI', url: 'https://chatgpt.com' },
    Gemini: { organizacion: 'Google DeepMind', url: 'https://gemini.google.com' },
    Claude: { organizacion: 'Anthropic', url: 'https://www.anthropic.com/claude' },
    Copilot: { organizacion: 'Microsoft', url: 'https://copilot.microsoft.com' },
    LLaMA: { organizacion: 'Meta AI', url: 'https://ai.meta.com/llama' },
    Qwen: { organizacion: 'Alibaba Cloud', url: 'https://qwenlm.ai' },
    DeepSeek: { organizacion: 'DeepSeek AI', url: 'https://www.deepseek.com' },
    Grok: { organizacion: 'xAI', url: 'https://x.ai' },
    Perplexity: { organizacion: 'Perplexity AI', url: 'https://www.perplexity.ai' },
    Consensus: { organizacion: 'Consensus', url: 'https://consensus.app' }
  };

  const catalogoIAporDominio = {
    'chatgpt.com': { modelo: 'ChatGPT', organizacion: 'OpenAI', url: 'https://chatgpt.com' },
    'gemini.google.com': { modelo: 'Gemini', organizacion: 'Google DeepMind', url: 'https://gemini.google.com' },
    'claude.ai': { modelo: 'Claude', organizacion: 'Anthropic', url: 'https://www.anthropic.com/claude' },
    'copilot.microsoft.com': { modelo: 'Copilot', organizacion: 'Microsoft', url: 'https://copilot.microsoft.com' },
    'www.meta.ai': { modelo: 'LLaMA', organizacion: 'Meta AI', url: 'https://www.meta.ai/' },
    'chat.qwen.ai': { modelo: 'Qwen', organizacion: 'Alibaba Cloud', url: 'https://chat.qwen.ai' },
    'chat.deepseek.com': { modelo: 'DeepSeek', organizacion: 'DeepSeek AI', url: 'https://chat.deepseek.com/' },
    'grok.com': { modelo: 'Grok', organizacion: 'xAI', url: 'https://grok.com/' },
    'www.perplexity.ai': { modelo: 'Perplexity', organizacion: 'Perplexity AI', url: 'https://www.perplexity.ai' },
    'consensus.app': { modelo: 'Consensus', organizacion: 'Consensus', url: 'https://consensus.app' }
  };

  const form = getEl('#refForm');
  const formError = getEl('#formError');
  const modelSelect = getEl('#model-select');
  const modelNameCustom = getEl('#model-name-custom');
  const modelOtherRow = getEl('#model-other-row');
  const organizationInput = getEl('#organization-custom');
  const platformUrlInput = getEl('#platformUrl');

  function populateModelSelect() {
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
  }

  function extractDomainFromUrl(urlStr){
    if(!urlStr || typeof urlStr !== 'string') return null;
    try{
      const url = new URL(urlStr);
      return url.hostname.toLowerCase();
    }catch(e){
      return null;
    }
  }

  function parseLocalDate(dateStr){
    if(dateStr instanceof Date) return dateStr;
    if(!dateStr) return null;
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if(isoMatch){
      const y = Number(isoMatch[1]);
      const m = Number(isoMatch[2]) - 1;
      const d = Number(isoMatch[3]);
      return new Date(y, m, d);
    }
    return new Date(dateStr);
  }

  function formatDateSpanish(dateStr){
    const d = parseLocalDate(dateStr);
    if(!d) return '';
    return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric'}).format(d);
  }

  function buildAPA({organization, modelName, modelVersion, accessDate, platformUrl}){
    function escapeHtml(str){
      return String(str || '').replace(/[&<>\"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; });
    }

    const dateObj = accessDate ? parseLocalDate(accessDate) : new Date();
    const year = dateObj ? dateObj.getFullYear() : '';
    const day = dateObj ? dateObj.getDate() : '';
    const monthName = dateObj ? new Intl.DateTimeFormat('es-ES',{month:'long'}).format(dateObj) : '';
    const dateParen = `(${year}${day ? `, ${day} de ${monthName}` : ''})`;

    const orgSafe = escapeHtml(organization);
    const modelSafe = escapeHtml(modelName);
    const versionSafe = escapeHtml(modelVersion);
    const urlSafe = escapeHtml(platformUrl);

    const versionPart = versionSafe ? ` (versión ${versionSafe})` : '';
    const pieces = [];
    pieces.push(`${orgSafe} ${dateParen}.`);
    pieces.push(`<em>${modelSafe}</em>${versionPart} [Modelo de lenguaje de gran escala].`);
    if(urlSafe) pieces.push(urlSafe);

    return pieces.join(' ');
  }

  if(!form) {
    return;
  }

  if(modelSelect){
    modelSelect.addEventListener('change', async function(){
      const v = this.value;
      console.debug('Cambio de modelo seleccionado:', v);

      if(!v){
        if(modelOtherRow) modelOtherRow.style.display = 'none';
        if(modelNameCustom) { modelNameCustom.setAttribute('aria-hidden','true'); modelNameCustom.required = false; modelNameCustom.value = ''; }
        if (organizationInput) organizationInput.value = '';
        if (platformUrlInput) platformUrlInput.value = '';
        this.removeAttribute('aria-disabled');
        return;
      }

      if(v === 'otro'){
        if(modelOtherRow) modelOtherRow.style.display = '';
        if(modelNameCustom){ modelNameCustom.removeAttribute('aria-hidden'); modelNameCustom.required = true; modelNameCustom.value = ''; modelNameCustom.focus(); }
        if (organizationInput) organizationInput.value = '';
        if (platformUrlInput) platformUrlInput.value = '';
        this.setAttribute('aria-disabled','true');
        return;
      }

      if(modelOtherRow) modelOtherRow.style.display = 'none';
      if(modelNameCustom){ modelNameCustom.setAttribute('aria-hidden','true'); modelNameCustom.required = false; }
      this.removeAttribute('aria-disabled');

      let org = '';
      let url = '';
      if(modelCache[v]){
        org = modelCache[v].organization || '';
        url = modelCache[v].url || '';
      }

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
            modelCache[v] = modelCache[v] || {};
            modelCache[v].organization = org;
            modelCache[v].url = url;
          }
        }catch(err){
          console.error('Excepción al obtener detalles del modelo:', err);
        }
      }

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

  if(modelNameCustom){
    modelNameCustom.addEventListener('input', function(){
      if(this.value && this.value.trim().length) this.setCustomValidity('');
      if(formError) formError.textContent = '';
    });
  }

  if(modelSelect){
    modelSelect.addEventListener('change', ()=>{ if(formError) formError.textContent = ''; });
  }
  if(organizationInput){
    organizationInput.addEventListener('input', ()=>{ if(formError) formError.textContent = ''; });
  }

  if(platformUrlInput){
    platformUrlInput.addEventListener('blur', function(){
      const urlValue = (this.value || '').trim();
      if(!urlValue) return;

      const domain = extractDomainFromUrl(urlValue);
      if(!domain) return;

      const entry = catalogoIAporDominio[domain];

      if(entry){
        const modelName = entry.modelo;
        const organization = entry.organizacion;
        const officialUrl = entry.url;

        if(modelSelect){
          const idMatch = Object.keys(modelCache).find(id => modelCache[id].name === modelName);
          if(idMatch){
            modelSelect.value = idMatch;
            modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }else{
            modelSelect.value = 'otro';
            modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
            if(modelNameCustom){ modelNameCustom.value = modelName; }
          }
        }

        if (organizationInput) organizationInput.value = organization;
        if (this) this.value = officialUrl;

        const today = new Date();
        const isoDate = today.toISOString().split('T')[0];
        const accessDateInput = getEl('#consulta-fecha');
        if(accessDateInput && !accessDateInput.value){ accessDateInput.value = isoDate; }
      } else {
        if(modelSelect){
          modelSelect.value = 'otro';
          modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (organizationInput) organizationInput.value = '';

        const today = new Date();
        const isoDate = today.toISOString().split('T')[0];
        const accessDateInput = getEl('#consulta-fecha');
        if(accessDateInput && !accessDateInput.value){ accessDateInput.value = isoDate; }
      }
    });
  }

  form.addEventListener('submit', function(evt){
    evt.preventDefault();
    if(formError) formError.textContent = '';

    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }

    const data = new FormData(form);

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
    } else {
      if(selValue && modelCache[selValue]){
        finalModelName = modelCache[selValue].name || '';
      } else {
        finalModelName = selValue ? selValue.trim() : '';
      }
    }

    const orgVal = (organizationInput ? organizationInput.value.trim() : '');
    if((!selValue || selValue === '') || selValue === 'otro'){
      if(!finalModelName || !orgVal){
        if(formError) formError.textContent = 'Debe proporcionar un modelo (o datos personalizados: nombre y organización).';
        return;
      }
    }

    const temaValue = (data.get('tema') || '').trim();
    if(!temaValue){
      if(formError) formError.textContent = 'El campo Tema es obligatorio.';
      const temaInput = getEl('#tema');
      if(temaInput){
        temaInput.setCustomValidity('Por favor complete el campo Tema.');
        temaInput.reportValidity();
        temaInput.setCustomValidity('');
      }
      return;
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
    if (referenceEl) {
      referenceEl.innerHTML = apa;
      referenceEl.focus();
    }

    (async function(){
      const selectedModel = modelSelect ? modelSelect.value : '';

      let model_id = null;
      let model_name_custom = null;
      let organization_custom = null;

      if (selectedModel && selectedModel !== 'otro') {
        const looksLikeUuid = /^[0-9a-fA-F\-]{36}$/.test(selectedModel);
        if (modelCache[selectedModel] || looksLikeUuid) {
          model_id = selectedModel;
        } else {
          model_name_custom = finalModelName || null;
          organization_custom = values.organization || null;
        }
      } else if (selectedModel === 'otro') {
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
          const modelVersionEl = getEl('#model-version');
          const temaEl = getEl('#tema');
          const promptEl = getEl('#prompt');
          const llmResponseEl = getEl('#llm-response');

          if(modelVersionEl) modelVersionEl.value = '';
          if(temaEl) temaEl.value = '';
          if(promptEl) promptEl.value = '';
          if(llmResponseEl) llmResponseEl.value = '';
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

  // Inicializar datos y listeners
  loadModels();
  populateModelSelect();
}
