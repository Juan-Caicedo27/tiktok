// src/supabase.js
import { createClient } from '@supabase/supabase-js';

// Asegúrate de reemplazar estas variables con tus propias claves de Supabase
const SUPABASE_URL = 'https://xmfazjdbzqrtisoyvylu.supabase.co'; // Tu URL de proyecto de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZmF6amRienFydGlzb3l2eWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ5NDk2MTIsImV4cCI6MTczMDcyNTYxMn0.iK2A1gB-iA-04dY_lI214M1XnC0p4Yd810G2yB0Nq9M'; // Tu clave anon pública

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Funciones de Autenticación ---
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

// --- Funciones de Comentarios ---
export async function addComment(videoId, userId, content) {
    const { data, error } = await supabase
        .from('Comments')
        .insert([
            {
                video_id: videoId,
                user_id: userId,
                content: content
            }
        ]);
    return { data, error };
}

// Corregido: Ya no intenta hacer embedding de la tabla Users
export async function getCommentsByVideoId(videoId) {
    const { data, error } = await supabase
        .from('Comments')
        .select('id, content, created_at, user_id') // Solo seleccionamos el user_id
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });
    return { data, error };
}

