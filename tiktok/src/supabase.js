// supabase.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xmfazjdbzqrtisoyvylu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZmF6amRienFydGlzb3l2eWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNDQyMzIsImV4cCI6MjA2MzcyMDIzMn0.ERAXOkMElnRMtY0pm_SekZUxSfyZEUMDeYIGtoDCKjk';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Error: Las variables de entorno de Supabase no están configuradas.");
    console.error("Asegúrate de tener un archivo .env en la raíz de tu proyecto con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Registra un nuevo usuario.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} { data, error }
 */
export async function signUpUser(email, password) {
    return supabase.auth.signUp({ email, password });
}

/**
 * Inicia sesión a un usuario.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} { data, error }
 */
export async function signInUser(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Cierra la sesión del usuario actual.
 * @returns {Promise<Object>} { error }
 */
export async function signOutUser() {
    return supabase.auth.signOut();
}

/**
 * Obtiene los videos del feed, incluyendo la información del creador.
 * @returns {Promise<Object>} { data, error }
 */
export async function fetchVideos() {
    return supabase
        .from('Videos')
        .select(`
            video_id,
            video_url,
            thumbnail_url,
            description,
            music_info,
            view_count,
            like_count,
            comment_count,
            share_count,
            created_at,
            Users ( -- Hacemos un join con la tabla Users para obtener información del creador
                username,
                profile_picture_url
            )
        `)
        .order('created_at', { ascending: false }); // Ordena por los más recientes
}

/**
 * Sube un archivo de video al Storage de Supabase.
 * @param {string} userId El ID del usuario autenticado.
 * @param {File} videoFile El objeto File a subir.
 * @returns {Promise<Object>} { data, error, publicUrl }
 */
export async function uploadVideoFile(userId, videoFile) {
    const filePath = `${userId}/${Date.now()}-${videoFile.name}`; // Carpeta por usuario
    const { data, error } = await supabase.storage
        .from('videos') // Asegúrate de que este bucket exista en Supabase Storage
        .upload(filePath, videoFile);

    if (error) {
        return { data: null, error };
    }

    // Obtener la URL pública del archivo subido
    const { data: publicUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

    return { data, error: null, publicUrl: publicUrlData.publicUrl };
}

/**
 * Inserta los detalles de un video en la tabla 'Videos'.
 * @param {Object} videoDetails Objeto con los detalles del video.
 * @returns {Promise<Object>} { data, error }
 */
export async function insertVideoDetails(videoDetails) {
    return supabase.from('Videos').insert(videoDetails);
}

/**
 * Verifica si un usuario ya dio like a un video.
 * @param {string} userId
 * @param {number} videoId
 * @returns {Promise<Object>} { data, error }
 */
export async function checkLike(userId, videoId) {
    return supabase
        .from('Interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .eq('interaction_type', 'like');
}

/**
 * Agrega un like a un video.
 * @param {string} userId
 * @param {number} videoId
 * @returns {Promise<Object>} { data, error }
 */
export async function addLike(userId, videoId) {
    return supabase
        .from('Interactions')
        .insert({ user_id: userId, video_id: videoId, interaction_type: 'like' });
}

/**
 * Elimina un like de un video.
 * @param {string} userId
 * @param {number} videoId
 * @returns {Promise<Object>} { data, error }
 */
export async function removeLike(userId, videoId) {
    return supabase
        .from('Interactions')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .eq('interaction_type', 'like');
}

/**
 * Actualiza el contador de likes de un video en la tabla Videos.
 * @param {number} videoId
 * @param {number} newCount
 * @returns {Promise<Object>} { data, error }
 */
export async function updateVideoLikeCount(videoId, newCount) {
    return supabase
        .from('Videos')
        .update({ like_count: newCount })
        .eq('video_id', videoId);
}
