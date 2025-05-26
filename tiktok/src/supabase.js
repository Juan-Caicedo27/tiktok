import { createClient } from '@supabase/supabase-js';

// Reemplaza con tus credenciales de Supabase
const SUPABASE_URL = 'https://xmfazjdbzqrtisoyvylu.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZmF6amRienFydGlzb3l2eWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNDQyMzIsImV4cCI6MjA2MzcyMDIzMn0.ERAXOkMElnRMtY0pm_SekZUxSfyZEUMDeYIGtoDCKjk'; // TU CLAVE ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- FUNCIONES DE AUTENTICACIÓN ---
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

// --- FUNCIONES PARA LIKES (Usando la tabla 'Interactions') ---

export async function checkLike(user_id, video_id) {
    if (!user_id || !video_id) return { data: false, error: null }; // Evitar consultas inválidas

    const { data, error } = await supabase
        .from('Interactions')
        .select('interaction_id')
        .eq('user_id', user_id)
        .eq('video_id', video_id)
        .eq('interaction_type', 'like')
        .maybeSingle(); // maybeSingle retorna null si no encuentra, sin error si no hay múltiples

    if (error && error.code !== 'PGRST116') { // PGRST116 es "no rows found", que no es un error real para maybeSingle
        console.error('Error checking like:', error.message);
        return { data: null, error };
    }
    return { data: !!data, error: null }; // Retorna true si encontró un like, false si no
}

export async function addLike(user_id, video_id) {
    if (!user_id || !video_id) {
        console.error('User ID or Video ID is missing for addLike');
        return { data: null, error: { message: 'Missing user_id or video_id' } };
    }
    const { data, error } = await supabase
        .from('Interactions')
        .insert([{ user_id, video_id, interaction_type: 'like' }])
        .select();

    if (error) {
        console.error('Error adding like:', error.message);
        return { data: null, error };
    }
    return { data, error: null };
}

export async function removeLike(user_id, video_id) {
    if (!user_id || !video_id) {
        console.error('User ID or Video ID is missing for removeLike');
        return { error: { message: 'Missing user_id or video_id' } };
    }
    const { error } = await supabase
        .from('Interactions')
        .delete()
        .eq('user_id', user_id)
        .eq('video_id', video_id)
        .eq('interaction_type', 'like');

    if (error) {
        console.error('Error removing like:', error.message);
        return { error };
    }
    return { error: null };
}

// Actualiza el contador de likes en la tabla Videos
export async function updateVideoLikeCount(video_id, change) {
    if (!video_id) return { data: null, error: { message: 'Video ID is missing for like count update' } };

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

// --- FUNCIONES PARA COMENTARIOS ---

export async function addComment(video_id, user_id, content) {
    if (!video_id || !user_id || !content) {
        console.error('Missing data for addComment');
        return { data: null, error: { message: 'Missing video_id, user_id, or content' } };
    }
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
    if (!video_id) return { data: null, error: { message: 'Video ID is missing for getComments' } };

    const { data, error } = await supabase
        .from('Comments')
        .select(`
            id,
            content,
            created_at,
            Users (
                username,
                profile_picture_url,
                id
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
    if (!video_id) return { data: null, error: { message: 'Video ID is missing for comment count update' } };

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

// --- FUNCIONES PARA VIDEOS (Obtener todos los videos) ---
export async function getAllVideosWithUsers() {
    const { data, error } = await supabase
        .from('Videos')
        .select(`
            video_id,
            youtube_id,
            thumbnail_url,
            description,
            music_info,
            view_count,
            like_count,
            comment_count,
            share_count,
            created_at,
            Users (
                id,
                username,
                profile_picture_url
            )
        `)
        .order('created_at', { ascending: false }); // Mostrar los más recientes primero

    if (error) {
        console.error('Error fetching videos:', error.message);
        return { data: null, error };
    }
    return { data, error: null };
}