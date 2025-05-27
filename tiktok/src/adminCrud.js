// src/adminCrud.js
import { supabase } from './supabase.js'; // Asegúrate de que esto apunte a tu cliente Supabase

const ADMIN_FUNCTION_URL = 'https://xmfazjdbzqrtisoyvylu.supabase.co/functions/v1/admin-users'; // ¡CAMBIA ESTO!
// Ejemplo: https://xmfazjdbzqrtisoyvylu.supabase.co/functions/v1/admin-users

async function callAdminFunction(type, userId = null, updates = null) {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
        throw new Error('No user authenticated.');
    }

    const response = await fetch(ADMIN_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({ type, userId, updates }),
    });

    const result = await response.json();

    if (!response.ok) {
        console.error('Error from admin Edge Function:', result.error);
        throw new Error(result.error || 'Failed to perform admin operation.');
    }

    return result;
}

// --- Funciones CRUD de Usuarios para el Administrador (Frontend) ---

export async function adminReadUsers(userId = null) {
    try {
        return { data: await callAdminFunction('read', userId), error: null };
    } catch (error) {
        return { data: null, error: error };
    }
}

export async function adminUpdateUser(userId, updates) {
    try {
        return { data: await callAdminFunction('update', userId, updates), error: null };
    } catch (error) {
        return { data: null, error: error };
    }
}

export async function adminDeleteUser(userId) {
    try {
        return { data: await callAdminFunction('delete', userId), error: null };
    } catch (error) {
        return { data: null, error: error };
    }
}

export async function adminCreateUser(email, password, username, role = 'user', profile_picture_url = null) {
    try {
        const updates = { email, password, username, role, profile_picture_url };
        return { data: await callAdminFunction('create', null, updates), error: null };
    } catch (error) {
        return { data: null, error: error };
    }
}