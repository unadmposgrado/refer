import { supabase } from '../../../js/supabaseClient.js';
import { saveCitation } from '../../../js/citations.js';
import { catalogoModelosIA } from './ia.js';

const supportTypes = [
  'Búsqueda y exploración de información',
  'Investigación documental',
  'Generación de ideas',
  'Organización de información',
  'Elaboración de esquemas',
  'Redacción de textos',
  'Corrección y revisión de estilo',
  'Síntesis de información',
  'Análisis e interpretación',
  'Traducción',
  'Programación',
  'Otro'
];

export function initAIDeclaration(container) {
  if (!container) return;

  container.innerHTML = `
    <p class="welcome-text ai-declaration-warning">
      La Inteligencia Artificial Generativa no puede ser considerada como autora, por lo que no sería correcto crear una referencia del contenido generado por la misma. Lo recomendable en este caso es declarar su uso.<br>
      Introduce los datos que se solicitan para crear un prompt que introducirás en la IA de tu elección, de manera que te ayude en la construcción de un texto de declaratoria de uso de inteligencia artificial.
    </p>
    <form id="aiDeclarationForm" class="form" novalidate>
      <fieldset>
        <legend>Datos para la declaratoria</legend>
        <div class="form-row">
          <label for="aiSupportType">Tipo de apoyo <span class="required">*</span></label>
          <select id="aiSupportType" name="supportType" required>
            <option value="">-- Selecciona el tipo de apoyo --</option>
            ${supportTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
          </select>
        </div>
        <div class="form-row" id="customSupportRow" style="display:none;">
          <label for="customSupport">Especifica el tipo de apoyo <span class="required">*</span></label>
          <input id="customSupport" name="customSupport" type="text" disabled>
        </div>
        <div class="form-row">
          <label for="aiToolSelect">Herramienta de inteligencia artificial <span class="required">*</span></label>
          <select id="aiToolSelect" name="tool" required>
            <option value="">-- Selecciona una herramienta --</option>
            <option value="otro">Otra herramienta</option>
          </select>
        </div>
        <div class="form-row" id="customToolRow" style="display:none;">
          <label for="customTool">Nombre de la herramienta <span class="required">*</span></label>
          <input id="customTool" name="customTool" type="text" disabled>
        </div>
        <div class="form-row">
          <label for="aiModelUsed">Modelo utilizado</label>
          <input id="aiModelUsed" name="modelUsed" type="text" placeholder="Ej. GPT-5">
        </div>
        <div class="form-row">
          <label for="aiDeveloper">Desarrollador del LLM <span class="required">*</span></label>
          <input id="aiDeveloper" name="developer" type="text" required placeholder="Ej. OpenIA">
        </div>
        <div class="form-row">
          <label for="aiUseDate">Fecha de utilización <span class="required">*</span></label>
          <input id="aiUseDate" name="useDate" type="date" required>
        </div>
        <div class="form-row">
          <label for="aiAcademicActivity">Tema o actividad académica <span class="required">*</span></label>
          <textarea id="aiAcademicActivity" name="activity" rows="5" required placeholder="Ej. El uso de la inteligencia artificial con integridad académica."></textarea>
        </div>
      </fieldset>
      <div id="aiDeclarationError" class="form-error" aria-live="polite" style="color:var(--error);margin-bottom:1rem;"></div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Generar prompt</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#aiDeclarationForm');
  const errorEl = container.querySelector('#aiDeclarationError');
  const supportSelect = container.querySelector('#aiSupportType');
  const customSupportRow = container.querySelector('#customSupportRow');
  const customSupportInput = container.querySelector('#customSupport');
  const toolSelect = container.querySelector('#aiToolSelect');
  const customToolRow = container.querySelector('#customToolRow');
  const customToolInput = container.querySelector('#customTool');
  const modelInput = container.querySelector('#aiModelUsed');
  const developerInput = container.querySelector('#aiDeveloper');
  const activityInput = container.querySelector('#aiAcademicActivity');
  const resultEl = document.getElementById('reference');
  const models = new Map();

  function showError(message) {
    errorEl.textContent = message;
  }

  function populateStaticTools() {
    Object.keys(catalogoModelosIA).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      toolSelect.insertBefore(option, toolSelect.querySelector('option[value="otro"]'));
    });
  }

  function localDate(dateValue) {
    const [year, month, day] = dateValue.split('-').map(Number);
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(year, month - 1, day));
  }

  async function loadModels() {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('id, name, organization_responsible')
        .order('name');

      if (error) {
        console.error('Error cargando modelos de IA:', error);
        populateStaticTools();
        showError('No se pudo cargar el listado de herramientas. Puedes seleccionar “Otra herramienta” e ingresar sus datos.');
        return;
      }

      (data || []).forEach(model => {
        models.set(model.id, model);
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        toolSelect.insertBefore(option, toolSelect.querySelector('option[value="otro"]'));
      });
    } catch (error) {
      console.error('Excepción al cargar modelos de IA:', error);
      populateStaticTools();
      showError('No se pudo cargar el listado de herramientas. Puedes seleccionar “Otra herramienta” e ingresar sus datos.');
    }
  }

  supportSelect.addEventListener('change', () => {
    const isCustom = supportSelect.value === 'Otro';
    customSupportRow.style.display = isCustom ? '' : 'none';
    customSupportInput.disabled = !isCustom;
    customSupportInput.required = isCustom;
    if (!isCustom) customSupportInput.value = '';
    showError('');
  });

  toolSelect.addEventListener('change', () => {
    const selectedTool = models.get(toolSelect.value);
    const isCustom = toolSelect.value === 'otro';
    customToolRow.style.display = isCustom ? '' : 'none';
    customToolInput.disabled = !isCustom;
    customToolInput.required = isCustom;
    if (!isCustom) customToolInput.value = '';
    developerInput.value = selectedTool?.organization_responsible
      || catalogoModelosIA[toolSelect.value]?.organizacion
      || '';
    showError('');
  });

  form.addEventListener('input', () => showError(''));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    showError('');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const supportType = supportSelect.value === 'Otro'
      ? customSupportInput.value.trim()
      : supportSelect.value;
    const selectedTool = toolSelect.value;
    const tool = selectedTool === 'otro'
      ? customToolInput.value.trim()
      : (models.get(selectedTool)?.name || selectedTool);
    const developer = developerInput.value.trim();
    const model = modelInput.value.trim();
    const date = container.querySelector('#aiUseDate').value;
    const activity = activityInput.value.trim();
    const generatedPrompt = [
      'Actúa como especialista en redacción académica. Elabora una declaratoria formal de uso de inteligencia artificial a partir de los siguientes datos:',
      `- Herramienta: ${tool}.`,
      `- Desarrollador: ${developer}.`,
      `- Modelo: ${model || 'No especificado'}.`,
      `- Fecha: ${localDate(date)}.`,
      `- Actividad: ${activity}.`,
      `- Uso: ${supportType}.`,
      'Redacta en primera persona, con lenguaje académico, sin inventar información y diferenciando claramente las actividades realizadas con asistencia de IA de aquellas que no fueron declaradas.'
    ].join('\n');

    if (resultEl) {
      resultEl.textContent = `Prompt generado:\n${generatedPrompt}`;
      resultEl.focus();
    }

    const selectedModel = models.get(selectedTool);
    try {
      const { error } = await saveCitation({
        source_type: 'ai_declaration',
        model_id: selectedModel?.id || null,
        model_name_custom: selectedModel ? null : tool,
        organization_custom: developer,
        version: model,
        consulta_fecha: date,
        tema: activity,
        prompt: supportType,
        citation_text: generatedPrompt
      });

      if (error) {
        console.error('Error guardando declaratoria de uso de IA:', error);
        showError(`El prompt se generó, pero no se pudo guardar en el historial: ${error.message}`);
      }
    } catch (error) {
      console.error('Excepción al guardar declaratoria de uso de IA:', error);
      const message = error instanceof Error ? error.message : String(error);
      showError(`El prompt se generó, pero no se pudo guardar en el historial: ${message}`);
    }
  });

  loadModels();
}
