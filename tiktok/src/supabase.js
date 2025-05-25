// src/supabase.js

import { createClient } from '@supabase/supabase-js';

// Reemplaza con tus credenciales de Supabase
const SUPABASE_URL = 'https://xmfazjdbzqrtisoyvylu.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZmF6amRienFydGlzb3l2eWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNDQyMzIsImV4cCI6MjA2MzcyMDIzMn0.ERAXOkMElnRMtY0pm_SekZUxSfyZEUMDeYIGtoDCKjk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- FUNCIONES DE AUTENTICACIÓN (SIN CAMBIOS) ---

export async function signUpUser(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });
    return { data, error };
}

export async function signInUser(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    return { data, error };
}

export async function signOutUser() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

// --- FUNCIONES PARA LIKES (¡CORREGIDAS PARA USAR LA TABLA 'Interactions'!) ---

// Verifica si un usuario ya dio like a un video
export async function checkLike(user_id, video_id) {
    const { data, error } = await supabase
        .from('Interactions') // <-- ¡CAMBIO AQUÍ! Usar 'Interactions'
        .select('interaction_id') // Puedes seleccionar cualquier columna, 'id' o 'interaction_id'
        .eq('user_id', user_id)
        .eq('video_id', video_id)
        .eq('interaction_type', 'like') // <-- ¡AÑADIDO AQUÍ! Filtrar por tipo 'like'
        .maybeSingle();

    if (error && error.code !== 'PGRST116') {
        console.error('Error checking like:', error.message);
        return { data: null, error };
    }
    return { data: !!data, error: null };
}

// Añade un like
export async function addLike(user_id, video_id) {
    const { data, error } = await supabase
        .from('Interactions') // <-- ¡CAMBIO AQUÍ! Usar 'Interactions'
        .insert([{ user_id, video_id, interaction_type: 'like' }]) // <-- ¡AÑADIDO AQUÍ! Especificar tipo 'like'
        .select();

    if (error) {
        console.error('Error adding like:', error.message);
        return { data: null, error };
    }
    return { data, error: null };
}

// Remueve un like
export async function removeLike(user_id, video_id) {
    const { error } = await supabase
        .from('Interactions') // <-- ¡CAMBIO AQUÍ! Usar 'Interactions'
        .delete()
        .eq('user_id', user_id)
        .eq('video_id', video_id)
        .eq('interaction_type', 'like'); // <-- ¡AÑADIDO AQUÍ! Filtrar por tipo 'like'

    if (error) {
        console.error('Error removing like:', error.message);
        return { error };
    }
    return { error: null };
}

// Actualiza el contador de likes en la tabla Videos (SIN CAMBIOS)
export async function updateVideoLikeCount(video_id, change) {
    const { data: video, error: fetchError } = await supabase
        .from('Videos')
        .select('like_count')
        .eq('video_id', video_id)
        .single();

    if (fetchError) {
        console.error('Error fetching video for like count update:', fetchError.message);
        return { data: null, error: fetchError };
    }

    const newLikeCount = (video.like_count || 0) + change;

    const { data, error } = await supabase
        .from('Videos')
        .update({ like_count: newLikeCount })
        .eq('video_id', video_id)
        .select();

    if (error) {
        console.error('Error updating video like count:', error.message);
        return { data: null, error };
    }
    return { data, error: null };
}

// --- FUNCIONES PARA COMENTARIOS (SIN CAMBIOS) ---

export async function addComment(video_id, user_id, content) {
    const { data, error } = await supabase
        .from('Comments')
        .insert([{ video_id, user_id, content }])
        .select();

    if (error) {
        console.error('Error adding comment:', error.message);
        return { data: null, error };
    }
    return { data, error: null };
}

export async function getCommentsByVideoId(video_id) {
    const { data, error } = await supabase
        .from('Comments')
        .select(`
            id,
            content,
            created_at,
            Users (
                username,
                profile_picture_url
            )
        `)
        .eq('video_id', video_id)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching comments:', error.message);
        return { data: null, error };
    }
    return { data, error: null };
}

export async function updateVideoCommentCount(video_id, change) {
    const { data: video, error: fetchError } = await supabase
        .from('Videos')
        .select('comment_count')
        .eq('video_id', video_id)
        .single();

    if (fetchError) {
        console.error('Error fetching video for comment count update:', fetchError.message);
        return { data: null, error: fetchError };
    }

    const newCommentCount = (video.comment_count || 0) + change;

    const { data, error } = await supabase
        .from('Videos')
        .update({ comment_count: newCommentCount })
        .eq('video_id', video_id)
        .select();

    if (error) {
        console.error('Error updating video comment count:', error.message);
        return { data: null, error };
    }
    return { data, error: null };
}