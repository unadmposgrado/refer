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
    <style>
      #aiDeclarationForm .checkbox-list {
        width: 100%;
        min-width: 0;
      }
      @media (min-width: 640px) {
        #aiDeclarationForm .declaration-row-label {
          width: 220px;
          flex: 0 0 220px;
        }
      }
    </style>
    <p class="welcome-text ai-declaration-warning">
      La Inteligencia Artificial Generativa no puede ser considerada como autora, por lo que no sería correcto crear una referencia del contenido generado por la misma. Lo recomendable en este caso es declarar su uso.<br>
      Completa los datos para generar un ejemplo de declaratoria de uso de Inteligencia Artificial Generativa.
    </p>
    <form id="aiDeclarationForm" class="form" novalidate>
      <fieldset>
        <legend>Datos para la declaratoria</legend>
        <div class="form-row">
          <strong id="aiSupportTypeLabel" class="declaration-row-label">Tipos de apoyo <span class="required">*</span></strong>
          <div id="aiSupportType" class="checkbox-list" role="group" aria-labelledby="aiSupportTypeLabel">
            ${supportTypes.map((type, index) => `
              <label class="checkbox-option" style="display:flex;align-items:center;gap:.5rem;width:auto;margin:0;">
                <input type="checkbox" name="supportType" value="${type}" id="supportType-${index}" style="width:auto;margin:0;">
                <span>${type}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-row" id="customSupportRow" style="display:none;">
          <label for="customSupport">Especifica el tipo de apoyo <span class="required">*</span></label>
          <input id="customSupport" name="customSupport" type="text" disabled>
        </div>
        <div class="form-row">
          <strong id="aiToolSelectLabel" class="declaration-row-label">Herramientas de inteligencia artificial <span class="required">*</span></strong>
          <div id="aiToolSelect" class="checkbox-list" role="group" aria-labelledby="aiToolSelectLabel"></div>
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
  const toolList = container.querySelector('#aiToolSelect');
  const toolDetailsContainer = container.querySelector('#toolDetails');
  const activityInput = container.querySelector('#aiAcademicActivity');
  const resultEl = document.getElementById('reference');
  const models = new Map();
  const toolDetails = new Map();

  function styleCheckboxList(list) {
    Object.assign(list.style, {
      display: 'grid',
      gap: '.35rem',
      flex: '1',
      maxHeight: '180px',
      overflowY: 'auto',
      overflowX: 'hidden',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '.5rem',
      boxSizing: 'border-box',
      alignContent: 'start',
      justifyItems: 'start',
      textAlign: 'left',
      direction: 'ltr',
      scrollbarGutter: 'stable'
    });
  }

  styleCheckboxList(supportSelect);
  styleCheckboxList(toolList);

  function showError(message) {
    errorEl.textContent = message;
  }

  function createCheckboxOption({ id, name, value, labelText }) {
    const label = document.createElement('label');
    label.className = 'checkbox-option';
    label.htmlFor = id;
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '.5rem';
    label.style.width = 'auto';
    label.style.margin = '0';

    const input = document.createElement('input');
    input.id = id;
    input.name = name;
    input.type = 'checkbox';
    input.value = value;
    input.style.width = 'auto';
    input.style.margin = '0';

    const text = document.createElement('span');
    text.textContent = labelText;
    label.append(input, text);
    return label;
  }

  function getSelectedSupportOptions() {
    return Array.from(supportSelect.querySelectorAll('input[type="checkbox"]:checked'));
  }

  function getSelectedToolOptions() {
    return Array.from(toolList.querySelectorAll('input[type="checkbox"]:checked'))
      .map(input => ({
        value: input.value,
        name: input.dataset.toolName
      }));
  }

  function renderToolOptions(options) {
    const selectedValues = new Set(getSelectedToolOptions().map(option => option.value));
    toolList.replaceChildren();
    options.forEach((option, index) => {
      const checkbox = createCheckboxOption({
        id: `aiToolOption-${index}`,
        name: 'tool',
        value: option.value,
        labelText: option.name
      });
      const input = checkbox.querySelector('input');
      input.dataset.toolName = option.name;
      input.checked = selectedValues.has(option.value);
      toolList.appendChild(checkbox);
    });

    const otherOption = createCheckboxOption({
      id: 'aiToolOption-other',
      name: 'tool',
      value: 'otro',
      labelText: 'Otra herramienta'
    });
    otherOption.querySelector('input').checked = selectedValues.has('otro');
    toolList.appendChild(otherOption);
  }

  function populateStaticTools() {
    renderToolOptions(Object.keys(catalogoModelosIA).map(name => ({ value: name, name })));
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
    return models.get(option.value)?.name || option.name;
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
    const selectedOptions = getSelectedToolOptions();
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
      });
      renderToolOptions((data || []).map(model => ({ value: model.id, name: model.name })));
      renderToolDetails();
    } catch (error) {
      console.error('Excepción al cargar modelos de IA:', error);
      populateStaticTools();
      showError('No se pudo cargar el listado de herramientas. Puedes seleccionar una herramienta del listado alternativo.');
    }
  }

  supportSelect.addEventListener('change', () => {
    const isCustom = getSelectedSupportOptions()
      .some(option => option.value === 'Otro');
    customSupportRow.style.display = isCustom ? '' : 'none';
    customSupportInput.disabled = !isCustom;
    customSupportInput.required = isCustom;
    if (!isCustom) customSupportInput.value = '';
    showError('');
  });

  toolList.addEventListener('change', () => {
    renderToolDetails();
    showError('');
  });

  form.addEventListener('input', () => showError(''));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    showError('');

    const selectedSupportOptions = getSelectedSupportOptions();
    const selectedToolOptions = getSelectedToolOptions();
    if (!selectedSupportOptions.length || !selectedToolOptions.length) {
      showError(!selectedSupportOptions.length
        ? 'Selecciona al menos un tipo de apoyo.'
        : 'Selecciona al menos una herramienta de inteligencia artificial.');
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const selectedSupportTypes = selectedSupportOptions
      .map(option => option.value === 'Otro' ? customSupportInput.value.trim() : option.value)
      .filter(Boolean)
      .map(lowercaseFirst);
    const selectedTools = selectedToolOptions
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

  renderToolOptions([]);
  loadModels();
}
