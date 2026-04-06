// citations.js
// Módulo para gestionar CRUD de citas en la tabla "citations" de Supabase.

import { supabase } from './supabaseClient.js';
import { getUser } from './auth.js';

/**
 * Normaliza las claves del objeto metadata para estandarizar formato.
 * Acepta claves en inglés o español y convierte al formato esperado (español).
 * @param {Object} meta Objeto metadata con claves potencialmente inconsistentes.
 * @returns {Object|null} Objeto metadata normalizado, o null si meta no es válido.
 */
function normalizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return null;

  return {
    autor: meta.autor || meta.author || '',
    titulo: meta.titulo || meta.title || '',
    anio: meta.anio || meta.year || '',
    editorial: meta.editorial || '',
    revista: meta.revista || '',
    volumen: meta.volumen || '',
    numero: meta.numero || meta.issue || '',
    paginas: meta.paginas || meta.pages || '',
    doi_url: meta.doi_url || meta.url || '',
    sitio: meta.sitio || meta.website || '',
    fecha: meta.fecha || meta.date || ''
  };
}

/**
 * Guarda una nueva cita asociada al usuario actual.
 * @param {Object} data Campos de la cita según especificación.
 * @returns {Object} Resultado de la inserción ({ data, error }).
 * @throws Error si no hay usuario autenticado.
 */
export async function saveCitation(data) {
  const user = await getUser();
  if (!user) {
    throw new Error('No hay usuario autenticado');
  }
  console.debug('[citations] guardando cita para user', user.id);

  // crear el registro con user_id y los campos proporcionados
  const payload = {
    user_id: user.id,
    model_id: data.model_id || null,
    model_name_custom: data.model_name_custom || null,
    organization_custom: data.organization_custom || null,
    version: data.version || null,
    consulta_fecha: data.consulta_fecha || null,
    tema: data.tema || null,
    prompt: data.prompt || null,
    llm_response: data.llm_response || null,
    citation_text: data.citation_text || null,
    source_type: data.source_type || 'ia',
    metadata: data.metadata ? normalizeMetadata(data.metadata) : null
  };

  const { data: inserted, error } = await supabase
    .from('citations')
    .insert([payload]);

  return { data: inserted, error };
}

/**
 * Recupera las citas del usuario actual ordenadas por fecha reciente.
 * @returns {Object} Resultado de la consulta ({ data, error }).
 * @throws Error si no hay usuario autenticado.
 */
export async function getUserCitations(userParam) {
  let user = userParam;
  if (!user) {
    user = await getUser();
  }
  if (!user) {
    throw new Error('No hay usuario autenticado');
  }
  console.debug('[citations] user id:', user.id);

  // pedimos solamente los campos que realmente usamos y la relación con models
  // esto hace el join en Supabase; `*` podría traer campos adicionales indeseados.
  const { data, error } = await supabase
    .from('citations')
    .select(`
      id,
      created_at,
      citation_text,
      source_type,
      metadata,
      tema,
      prompt,
      llm_response,
      consulta_fecha,
      model_id,
      model_name_custom,
      organization_custom,
      models (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[citations] error obteniendo citas para user', user.id, error);
  } else {
    console.debug('[citations] returned', (data || []).length, 'rows');
  }

  return { data, error };
}