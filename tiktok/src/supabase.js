// src/supabase.js
import { createClient } from '@supabase/supabase-js';

// Asegúrate de reemplazar estas variables con tus propias claves de Supabase
const SUPABASE_URL = 'https://xmfazjdbzqrtisoyvylu.supabase.co'; // Tu URL de proyecto de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZmF6amRienFydGlzb3l2eWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNDQyMzIsImV4cCI6MjA2MzcyMDIzMn0.ERAXOkMElnRMtY0pm_SekZUxSfyZEUMDeYIGtoDCKjk'; // Tu clave anon pública

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

// --- NUEVA FUNCIÓN: Cambiar Contraseña ---
export async function updateUserPassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });
    return { data, error };
}

// --- FUNCIÓN MODIFICADA: Eliminar Cuenta (ahora usa la función de base de datos) ---
export async function deleteUserAccount() {
    // No necesitamos pasar el userId aquí porque la función SQL usa auth.uid()
    // y se asegura de que solo el usuario actual se elimine.
    const { error } = await supabase.rpc('delete_self_user'); // Llama a la función de base de datos

    if (error) {
        console.error('Error al llamar a delete_self_user:', error);
        throw new Error(`Error al eliminar la cuenta: ${error.message}`);
    }

    // La función de base de datos ya eliminó el usuario,
    // pero es buena práctica cerrar la sesión en el cliente también.
    await supabase.auth.signOut();

    return { data: { message: "Account deleted successfully" }, error: null }; // Simula un retorno exitoso
}


// --- Funciones de Comentarios ---
export async function addComment(videoId, userId, content) {
    const { data, error } = await supabase
        .from('comments')
        .insert([
            {
                video_id: videoId,
                user_id: userId,
                content: content
            }
        ]);
    return { data, error };
}

export async function getCommentsByVideoId(videoId) {
    const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id') // Solo seleccionamos el user_id
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });
    return { data, error };
}