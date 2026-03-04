// citations.js
// Módulo para gestionar CRUD de citas en la tabla "citations" de Supabase.

import { supabase } from './supabaseClient.js';
import { getUser } from './auth.js';

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
    citation_text: data.citation_text || null
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
export async function getUserCitations() {
  const user = await getUser();
  if (!user) {
    throw new Error('No hay usuario autenticado');
  }

  const { data, error } = await supabase
    .from('citations')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
}