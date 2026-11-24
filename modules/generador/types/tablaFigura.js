import { supabase } from '../../../js/supabaseClient.js';
import { saveCitation } from '../../../js/citations.js';

export function initTablaFigura(container) {
  if (!container) return;

  container.innerHTML = `
    <form id="tableFigureForm" class="form" novalidate>
      <fieldset>
        <legend>Información de la tabla o figura</legend>

        <div class="form-row">
          <label for="tableFigureType">Tipo <span class="required">*</span></label>
          <select id="tableFigureType" name="tableFigureType" required>
            <option value="figura">Figura</option>
            <option value="tabla">Tabla</option>
          </select>
        </div>

        <div class="form-row">
          <label for="tableFigureNumber">Número de tabla o figura <span class="required">*</span></label>
          <input type="text" id="tableFigureNumber" name="tableFigureNumber" required placeholder="Ej. 1">
        </div>

        <div class="form-row">
          <label for="tableFigureTitle">Título de la tabla o figura <span class="required">*</span></label>
          <input type="text" id="tableFigureTitle" name="tableFigureTitle" required placeholder="Escribe el título">
        </div>

        <div class="form-row">
          <label for="aiModelSelect">Herramienta de IA <span class="required">*</span></label>
          <div class="input-group">
            <select id="aiModelSelect" name="aiModelSelect" required>
              <option value="">-- Selecciona un modelo --</option>
              <option value="otro">Otro modelo</option>
            </select>
          </div>
        </div>

        <div class="form-row" id="customModelRow" style="display:none;">
          <label for="customModelName">Nombre de la herramienta <span class="required">*</span></label>
          <input type="text" id="customModelName" name="customModelName" placeholder="Escribe el nombre del modelo" disabled>
        </div>

        <div class="form-row">
          <label for="aiOrganization">Desarrollador / organización responsable <span class="required">*</span></label>
          <input type="text" id="aiOrganization" name="aiOrganization" required placeholder="Ej. OpenAI">
        </div>
      </fieldset>

      <div id="formError" class="form-error" aria-live="polite" style="color:var(--error);margin-bottom:1rem;"></div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Generar referencia</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#tableFigureForm');
  const formError = container.querySelector('#formError');
  const modelSelect = container.querySelector('#aiModelSelect');
  const customModelRow = container.querySelector('#customModelRow');
  const customModelName = container.querySelector('#customModelName');
  const organizationInput = container.querySelector('#aiOrganization');
  const referenceEl = document.getElementById('reference');
  const models = new Map();

  function showError(message) {
    if (formError) formError.textContent = message;
  }

  async function loadModels() {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('id, name, organization_responsible')
        .order('name');

      if (error) {
        console.error('Error cargando modelos de IA:', error);
        showError('No se pudo cargar el listado de modelos. Puedes seleccionar “Otro modelo” y escribir los datos manualmente.');
        return;
      }

      data.forEach((model) => {
        models.set(model.id, model);
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.insertBefore(option, modelSelect.querySelector('option[value="otro"]'));
      });
    } catch (error) {
      console.error('Excepción al cargar modelos de IA:', error);
      showError('No se pudo cargar el listado de modelos. Puedes seleccionar “Otro modelo” y escribir los datos manualmente.');
    }
  }

  modelSelect.addEventListener('change', () => {
    const selectedModel = models.get(modelSelect.value);
    const isCustom = modelSelect.value === 'otro';

    customModelRow.style.display = isCustom ? '' : 'none';
    customModelName.disabled = !isCustom;
    customModelName.required = isCustom;
    if (!isCustom) customModelName.value = '';
    organizationInput.value = selectedModel?.organization_responsible || '';
    showError('');
  });

  form.addEventListener('input', () => showError(''));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const type = String(formData.get('tableFigureType')).trim();
    const number = String(formData.get('tableFigureNumber')).trim();
    const title = String(formData.get('tableFigureTitle')).trim();
    const organization = String(formData.get('aiOrganization')).trim();
    const selectedModelId = modelSelect.value;
    const modelName = selectedModelId === 'otro'
      ? String(formData.get('customModelName')).trim()
      : (models.get(selectedModelId)?.name || '');

    if (!modelName || !organization) {
      showError('Indica la herramienta de IA y su desarrollador u organización responsable.');
      return;
    }

    const typeLabel = type === 'tabla' ? 'Tabla' : 'Figura';
    const generatedLabel = type === 'tabla' ? 'Tabla generada' : 'Imagen generada';
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
    const citation = `${typeLabel} ${escapeHtml(number)}. ${escapeHtml(title)}. ${generatedLabel} por ${escapeHtml(modelName)} desarrollado por ${escapeHtml(organization)}`;

    if (referenceEl) {
      referenceEl.innerHTML = citation;
      referenceEl.focus();
    }

    const selectedModel = models.get(selectedModelId);
    try {
      const { error } = await saveCitation({
        source_type: 'table_figure',
        model_id: selectedModel?.id || null,
        model_name_custom: selectedModel ? null : modelName,
        organization_custom: organization,
        citation_text: citation,
        consulta_fecha: new Date().toISOString().split('T')[0],
        metadata: {
          titulo: title,
          numero: number,
          organization
        }
      });

      if (error) {
        console.error('Error guardando referencia de tabla o figura:', error);
        showError(`La referencia se generó, pero no se pudo guardar en el historial: ${error.message}`);
      }
    } catch (error) {
      console.error('Excepción al guardar referencia de tabla o figura:', error);
      const message = error instanceof Error ? error.message : String(error);
      showError(`La referencia se generó, pero no se pudo guardar en el historial: ${message}`);
    }
  });

  loadModels();
}
