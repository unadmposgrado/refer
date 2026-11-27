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
      Completa los datos para generar un ejemplo de declaratoria de uso de Inteligencia Artificial Generativa.
    </p>
    <form id="aiDeclarationForm" class="form" novalidate>
      <fieldset>
        <legend>Datos para la declaratoria</legend>
        <div class="form-row">
          <label for="aiSupportType">Tipos de apoyo <span class="required">*</span></label>
          <select id="aiSupportType" name="supportType" multiple size="5" required>
            ${supportTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
          </select>
          <small class="form-help">Mantén presionada Ctrl (o Cmd en Mac) para seleccionar varias opciones.</small>
        </div>
        <div class="form-row" id="customSupportRow" style="display:none;">
          <label for="customSupport">Especifica el tipo de apoyo <span class="required">*</span></label>
          <input id="customSupport" name="customSupport" type="text" disabled>
        </div>
        <div class="form-row">
          <label for="aiToolSelect">Herramientas de inteligencia artificial <span class="required">*</span></label>
          <select id="aiToolSelect" name="tool" multiple size="6" required>
            <option value="otro">Otra herramienta</option>
          </select>
          <small class="form-help">Mantén presionada Ctrl (o Cmd en Mac) para seleccionar varias opciones.</small>
        </div>
        <div id="toolDetails"></div>
        <div class="form-row">
          <label for="aiAcademicActivity">Tema o actividad académica <span class="required">*</span></label>
          <textarea id="aiAcademicActivity" name="activity" rows="5" required placeholder="Ej. El uso de la inteligencia artificial con integridad académica."></textarea>
        </div>
      </fieldset>
      <div id="aiDeclarationError" class="form-error" aria-live="polite" style="color:var(--error);margin-bottom:1rem;"></div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Generar ejemplo</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#aiDeclarationForm');
  const errorEl = container.querySelector('#aiDeclarationError');
  const supportSelect = container.querySelector('#aiSupportType');
  const customSupportRow = container.querySelector('#customSupportRow');
  const customSupportInput = container.querySelector('#customSupport');
  const toolSelect = container.querySelector('#aiToolSelect');
  const toolDetailsContainer = container.querySelector('#toolDetails');
  const activityInput = container.querySelector('#aiAcademicActivity');
  const resultEl = document.getElementById('reference');
  const models = new Map();
  const toolDetails = new Map();

  function showError(message) {
    errorEl.textContent = message;
  }

  function populateStaticTools() {
    Object.keys(catalogoModelosIA).forEach(name => {
      if (Array.from(toolSelect.options).some(option => option.value === name)) return;
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

  function formatNaturalList(items) {
    if (items.length < 2) return items[0] || '';
    if (items.length === 2) return `${items[0]} y ${items[1]}`;
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
  }

  function lowercaseFirst(value) {
    return value ? value.charAt(0).toLocaleLowerCase('es') + value.slice(1) : '';
  }

  function getToolName(option, customName = '') {
    if (option.value === 'otro') return customName || 'Otra herramienta';
    return models.get(option.value)?.name || option.textContent.trim();
  }

  function createToolField({ index, key, field, labelText, type, value, required }) {
    const row = document.createElement('div');
    row.className = 'form-row';

    const inputId = `aiTool-${index}-${field}`;
    const label = document.createElement('label');
    label.htmlFor = inputId;
    label.textContent = labelText;
    if (required) {
      const requiredMark = document.createElement('span');
      requiredMark.className = 'required';
      requiredMark.textContent = ' *';
      label.appendChild(requiredMark);
    }

    const input = document.createElement('input');
    input.id = inputId;
    input.name = `${field}-${index}`;
    input.type = type;
    input.value = value || '';
    input.required = required;
    input.dataset.toolKey = key;
    input.dataset.toolField = field;
    input.addEventListener('input', () => {
      const details = toolDetails.get(key);
      details[field] = input.value;
    });

    row.append(label, input);
    return row;
  }

  function renderToolDetails() {
    const selectedOptions = Array.from(toolSelect.selectedOptions)
      .filter(option => option.value);
    toolDetailsContainer.replaceChildren();

    selectedOptions.forEach((option, index) => {
      const key = option.value;
      const selectedModel = models.get(key);
      const toolLabel = key === 'otro'
        ? 'Otra herramienta'
        : getToolName(option);

      if (!toolDetails.has(key)) {
        toolDetails.set(key, {
          customTool: '',
          developer: selectedModel?.organization_responsible
            || catalogoModelosIA[toolLabel]?.organizacion
            || '',
          model: '',
          date: ''
        });
      }

      const values = toolDetails.get(key);
      const group = document.createElement('div');
      group.className = 'ai-tool-details';

      if (key === 'otro') {
        group.appendChild(createToolField({
          index,
          key,
          field: 'customTool',
          labelText: 'Nombre de la herramienta (Otra herramienta)',
          type: 'text',
          value: values.customTool,
          required: true
        }));
      }

      group.append(
        createToolField({
          index,
          key,
          field: 'developer',
          labelText: `Desarrollador (${toolLabel})`,
          type: 'text',
          value: values.developer,
          required: true
        }),
        createToolField({
          index,
          key,
          field: 'model',
          labelText: `Modelo utilizado (${toolLabel})`,
          type: 'text',
          value: values.model,
          required: false
        }),
        createToolField({
          index,
          key,
          field: 'date',
          labelText: `Fecha de utilización (${toolLabel})`,
          type: 'date',
          value: values.date,
          required: true
        })
      );

      toolDetailsContainer.appendChild(group);
    });
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
        showError('No se pudo cargar el listado de herramientas. Puedes seleccionar una herramienta del listado alternativo.');
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
      showError('No se pudo cargar el listado de herramientas. Puedes seleccionar una herramienta del listado alternativo.');
    }
  }

  supportSelect.addEventListener('change', () => {
    const isCustom = Array.from(supportSelect.selectedOptions)
      .some(option => option.value === 'Otro');
    customSupportRow.style.display = isCustom ? '' : 'none';
    customSupportInput.disabled = !isCustom;
    customSupportInput.required = isCustom;
    if (!isCustom) customSupportInput.value = '';
    showError('');
  });

  toolSelect.addEventListener('change', () => {
    renderToolDetails();
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

    const selectedSupportTypes = Array.from(supportSelect.selectedOptions)
      .map(option => option.value === 'Otro' ? customSupportInput.value.trim() : option.value)
      .filter(Boolean)
      .map(lowercaseFirst);
    const selectedTools = Array.from(toolSelect.selectedOptions)
      .filter(option => option.value)
      .map(option => {
        const values = toolDetails.get(option.value);
        const name = getToolName(option, values.customTool.trim());
        return {
          key: option.value,
          name,
          developer: values.developer.trim(),
          model: values.model.trim(),
          date: values.date
        };
      });
    const activity = activityInput.value.trim();

    const toolDescriptions = selectedTools.map(tool => {
      const modelText = tool.model ? ` (modelo ${tool.model})` : '';
      return `${tool.name}${modelText} de ${tool.developer} el ${localDate(tool.date)}`;
    });
    const declarationText = `A lo largo de la elaboración del presente documento, se emplearon herramientas de Inteligencia Artificial Generativa como ${formatNaturalList(toolDescriptions)}, en calidad de recursos auxiliares. Estos sirvieron para ${formatNaturalList(selectedSupportTypes)}. El autor(a) del texto examinó, cotejó y corrigió todo el material elaborado o mediado por dichos modelos de lenguaje. Asimismo, comprobó las citas empleadas y asume la responsabilidad total sobre los razonamientos, los enfoques, la veracidad de los datos y el resultado definitivo de la publicación. En ningún caso la inteligencia artificial generativa fungió como creadora del texto ni se le otorgó el estatus de referente o autoridad en el ámbito académico.`;

    if (resultEl) {
      resultEl.textContent = declarationText;
      resultEl.focus();
    }

    const singleSelectedModel = selectedTools.length === 1
      ? models.get(selectedTools[0].key)
      : null;
    const toolNamesForHistory = selectedTools.length === 1
      ? (singleSelectedModel ? null : selectedTools[0].name)
      : selectedTools.map(tool => tool.name).join(', ');
    const developersForHistory = selectedTools.length === 1
      ? selectedTools[0].developer
      : selectedTools.map(tool => `${tool.name}: ${tool.developer}`).join('; ');
    const modelsForHistory = selectedTools
      .filter(tool => tool.model)
      .map(tool => `${tool.name}: ${tool.model}`)
      .join('; ');
    const datesForHistory = selectedTools.length === 1
      ? selectedTools[0].date
      : selectedTools.map(tool => `${tool.name}: ${tool.date}`).join('; ');

    try {
      const { error } = await saveCitation({
        source_type: 'ai_declaration',
        model_id: singleSelectedModel?.id || null,
        model_name_custom: toolNamesForHistory,
        organization_custom: developersForHistory,
        version: modelsForHistory,
        consulta_fecha: datesForHistory,
        tema: activity,
        prompt: selectedSupportTypes.join(', '),
        citation_text: declarationText
      });

      if (error) {
        console.error('Error guardando declaratoria de uso de IA:', error);
        showError(`El ejemplo se generó, pero no se pudo guardar en el historial: ${error.message}`);
      }
    } catch (error) {
      console.error('Excepción al guardar declaratoria de uso de IA:', error);
      const message = error instanceof Error ? error.message : String(error);
      showError(`El ejemplo se generó, pero no se pudo guardar en el historial: ${message}`);
    }
  });

  loadModels();
}
