// auth.js
// Capa centralizada de autenticación para la aplicación.

import { supabase } from './supabaseClient.js';

// --- sesiones y usuario ---------------------------------------------------

/**
 * Devuelve la sesión actual (o null si no hay ninguna).
 */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

/**
 * Devuelve el usuario de la sesión actual o null si no existe.
 */
export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Recupera el perfil asociado al usuario en la tabla `profiles`.
 * Si no hay usuario logueado devuelve null.
 */
export async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error obteniendo perfil:', error);
    return null;
  }
  return data;
}

/**
 * Obtiene el rol real del usuario consultando la tabla `profiles`.
 * Nunca lee el rol desde JWT ni user_metadata.
 */
export async function getUserRole() {
  const profile = await getProfile();
  return profile?.role || null;
}

// --- protección de páginas ------------------------------------------------

/**
 * Redirige a la página pública si no hay sesión.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    location.href = 'index.html';
  }
}

/**
 * Redirige al panel si ya existe una sesión.
 */
export async function requireGuest() {
  const session = await getSession();
  if (session) {
    location.href = 'refer.html';
  }
}

/**
 * Asegura que el usuario logueado sea administrador.
 * Si no hay sesión va a la página pública, si el rol no es "admin" va a refer.html.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    location.href = 'index.html';
    return;
  }
  const role = await getUserRole();
  if (role !== 'admin') {
    location.href = 'refer.html';
  }
}

// --- listener global de estado ------------------------------------------

/**
 * Inicializa un solo listener de autenticación para toda la aplicación.
 * Se encarga de redirigir en los casos de login/logout.
 */
export function initAuthListener() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      // cuando alguien llega y está en la página pública, lo enviamos al panel
      if (location.pathname.split('/').pop() === 'index.html') {
        location.href = 'refer.html';
      }
    } else if (event === 'SIGNED_OUT') {
      location.href = 'index.html';
    }
  });
}
