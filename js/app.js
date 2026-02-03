// Lógica mínima para generar y copiar la referencia APA 7 en español.
// Nota: la fecha incluida en el paréntesis se toma del año de la "fecha de consulta" como valor por defecto.

(function(){
  const form = document.getElementById('refForm');
  const referenceEl = document.getElementById('reference');
  const copyBtn = document.getElementById('copyBtn');

  function formatDateSpanish(dateStr){
    if(!dateStr) return '';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric'}).format(d);
  }

  function buildAPA({organization, modelName, modelVersion, accessDate, platformUrl}){
    const year = accessDate ? new Date(accessDate).getFullYear() : '';
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
    const values = {
      organization: (data.get('organization') || '').trim(),
      modelName: (data.get('modelName') || '').trim(),
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
