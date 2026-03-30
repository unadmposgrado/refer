import { saveCitation } from '../../../js/citations.js';

export function initLibro(container) {
  if (!container) return;

  container.innerHTML = `
    <form id="bookForm" class="form" novalidate>
      <fieldset>
        <legend>Información del libro</legend>

        <div class="form-row">
          <label for="autor">Autor <span class="required">*</span></label>
          <input type="text" id="autor" name="autor" required placeholder="Ej. Santander, J.">
        </div>

        <div class="form-row">
          <label for="anio">Año <span class="required">*</span></label>
          <input type="number" id="anio" name="anio" required placeholder="Ej. 2018" min="1000" max="9999">
        </div>

        <div class="form-row">
          <label for="titulo">Título del libro <span class="required">*</span></label>
          <input type="text" id="titulo" name="titulo" required placeholder="Ej. Psicología cognitiva">
        </div>

        <div class="form-row">
          <label for="editorial">Editorial <span class="required">*</span></label>
          <input type="text" id="editorial" name="editorial" required placeholder="Ej. Pirámide">
        </div>

        <div class="form-row">
          <label for="doi_url">DOI o URL</label>
          <input type="text" id="doi_url" name="doi_url" placeholder="Ej. https://doi.org/xxx">
        </div>
      </fieldset>

      <div id="formError" class="form-error" aria-live="polite" style="color:var(--error);margin-bottom:1rem;"></div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Generar referencia</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#bookForm');
  const formError = container.querySelector('#formError');
  const referenceEl = document.getElementById('reference');
  const copyBtn = document.getElementById('copyBtn');

  function buildBookAPA({ autor, anio, titulo, editorial, doi_url }) {
    const autorSafe = String(autor || '').trim();
    const anioSafe = String(anio || '').trim();
    const tituloSafe = String(titulo || '').trim();
    const editorialSafe = String(editorial || '').trim();
    const doiUrlSafe = String(doi_url || '').trim();

    const pieces = [];
    pieces.push(`${autorSafe} (${anioSafe}).`);
    pieces.push(`<em>${tituloSafe}</em>.`);
    pieces.push(`${editorialSafe}.`);
    if (doiUrlSafe) {
      pieces.push(doiUrlSafe);
    }

    return pieces.join(' ');
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (formError) formError.textContent = '';

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const autor = container.querySelector('#autor').value.trim();
    const anio = container.querySelector('#anio').value.trim();
    const titulo = container.querySelector('#titulo').value.trim();
    const editorial = container.querySelector('#editorial').value.trim();
    const doi_url = container.querySelector('#doi_url').value.trim();

    if (!autor || !anio || !titulo || !editorial) {
      if (formError) formError.textContent = 'Todos los campos obligatorios deben completarse.';
      return;
    }

    const apa = buildBookAPA({ autor, anio, titulo, editorial, doi_url });
    if (referenceEl) {
      referenceEl.innerHTML = '';
      referenceEl.innerHTML = apa;
      referenceEl.focus();
    }

    const citationData = {
      source_type: 'book',
      citation_text: apa,
      metadata: {
        autor,
        anio,
        titulo,
        editorial,
        doi_url: doi_url || null
      },
      consulta_fecha: new Date().toISOString().split('T')[0]
    };

    try {
      const { error } = await saveCitation(citationData);
      if (error) {
        console.error('Error guardando cita libro:', error);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
    }
  });

  // No crear ni manejar listeners de copiar local en el módulo Libro.
  // El botón global #copyBtn ya se maneja por initIA (y persiste en la página).
}
