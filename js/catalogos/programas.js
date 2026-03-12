import { supabase } from '../supabaseClient.js';

/**
 * Obtiene los niveles educativos únicos de la tabla programs
 * @returns {Promise<Array>} Array de objetos con nivel único, ordenados alfabéticamente
 */
export async function getNiveles() {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('nivel')
      .order('nivel', { ascending: true });

    if (error) throw new Error(`Error al obtener niveles: ${error.message}`);

    // Remover duplicados y ordenar
    const nivelesUnicos = [...new Set(data.map(item => item.nivel))];
    return nivelesUnicos.sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Error en getNiveles:', error);
    return [];
  }
}

/**
 * Obtiene las divisiones únicas para un nivel específico
 * @param {string} nivel - El nivel educativo
 * @returns {Promise<Array>} Array de divisiones únicas, ordenadas alfabéticamente
 */
export async function getDivisiones(nivel) {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('division')
      .eq('nivel', nivel)
      .order('division', { ascending: true });

    if (error) throw new Error(`Error al obtener divisiones: ${error.message}`);

    // Remover duplicados y ordenar
    const divisionesUnicas = [...new Set(data.map(item => item.division).filter(Boolean))];
    return divisionesUnicas.sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Error en getDivisiones:', error);
    return [];
  }
}

/**
 * Obtiene los programas filtrados por nivel y división
 * @param {string} nivel - El nivel educativo
 * @param {string} division - La división educativa
 * @returns {Promise<Array>} Array de programas, ordenados alfabéticamente por nombre
 */
export async function getProgramas(nivel, division) {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('nivel', nivel)
      .eq('division', division)
      .order('nombre', { ascending: true });

    if (error) throw new Error(`Error al obtener programas: ${error.message}`);

    return data || [];
  } catch (error) {
    console.error('Error en getProgramas:', error);
    return [];
  }
}

/**
 * Obtiene los programas por nivel (sin filtro de división)
 * Usado para niveles que no tienen división (ej. Posgrado)
 * @param {string} nivel - El nivel educativo
 * @returns {Promise<Array>} Array de programas, ordenados alfabéticamente por nombre
 */
export async function getProgramasPorNivel(nivel) {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('nivel', nivel)
      .order('nombre', { ascending: true });

    if (error) throw new Error(`Error al obtener programas por nivel: ${error.message}`);

    return data || [];
  } catch (error) {
    console.error('Error en getProgramasPorNivel:', error);
    return [];
  }
}
