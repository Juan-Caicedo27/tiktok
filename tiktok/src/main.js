// src/main.js
import {
    supabase,
    signUpUser,
    signInUser,
    signOutUser,
    updateUserPassword,
    deleteUserAccount,
    addComment,
    getCommentsByVideoId,
} from './supabase.js';

// Importa tus videos predeterminados desde videos.js
import { DUMMY_VIDEOS } from './videos.js';

// --- Importa las nuevas funciones de adminCrud.js ---
import {
    adminReadUsers,
    adminUpdateUser,
    adminDeleteUser,
    adminCreateUser
} from './adminCrud.js'; //

// --- Elementos del DOM ---
const videoFeed = document.getElementById('video-feed');
const authButton = document.getElementById('auth-button');
const authModal = document.getElementById('auth-modal');
const commentsModal = document.getElementById('comments-modal');
const closeButtons = document.querySelectorAll('.close-button');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const signInBtn = document.getElementById('signin-btn');
const signUpBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const commentsList = document.getElementById('comments-list');
const commentText = document.getElementById('comment-text');
const postCommentBtn = document.getElementById('post-comment-btn');

// Nuevos elementos del DOM (existentes en tu código, pero se resaltan para el contexto)
const changePasswordBtn = document.getElementById('change-password-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');

// --- NUEVOS ELEMENTOS DEL DOM PARA EL PANEL DE ADMINISTRADOR ---
const adminPanelBtn = document.getElementById('admin-panel-btn'); //
const adminPanelModal = document.getElementById('admin-panel-modal'); //
const adminUsersList = document.getElementById('admin-users-list'); //
const adminCreateUserForm = document.getElementById('admin-create-user-form'); //
const newAdminUserEmail = document.getElementById('new-admin-user-email'); //
const newAdminUserPassword = document.getElementById('new-admin-user-password'); //
const newAdminUsername = document.getElementById('new-admin-username'); //
const newAdminUserRole = document.getElementById('new-admin-user-role'); //
const adminCloseButton = adminPanelModal.querySelector('.close-button'); //


let currentUser = null; // Almacenará el usuario actual de Supabase
let currentVideoYoutubeIdForComments = null; // Para saber a qué video (YouTube ID) se están añadiendo comentarios

// --- Funciones de Utilidad ---

// Función para obtener el estado de autenticación
async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error.message);
        return null;
    }
    return session;
}

// Función para actualizar el estado de la UI según la autenticación
async function updateAuthUI() {
    const session = await getSession();
    const h2AuthModal = authModal.querySelector('h2');

    if (session) {
        currentUser = session.user;
        authButton.textContent = 'Perfil';
        logoutBtn.classList.remove('hidden');
        changePasswordBtn.classList.remove('hidden');
        deleteAccountBtn.classList.remove('hidden');
        signInBtn.classList.add('hidden');
        signUpBtn.classList.add('hidden');
        authEmail.classList.add('hidden');
        authPassword.classList.add('hidden');
        if (h2AuthModal) {
            h2AuthModal.textContent = `Bienvenido, ${currentUser.email}`;
        }

        // --- Lógica para mostrar/ocultar el botón del panel de administrador ---
        const { data: profile, error } = await supabase.from('users').select('role').eq('id', currentUser.id).single(); //
        if (error || !profile || profile.role !== 'admin') { //
            adminPanelBtn.classList.add('hidden'); // Ocultar si no es admin
        } else {
            adminPanelBtn.classList.remove('hidden'); // Mostrar si es admin
        }

    } else {
        currentUser = null;
        authButton.textContent = 'Iniciar Sesión';
        logoutBtn.classList.add('hidden');
        changePasswordBtn.classList.add('hidden');
        deleteAccountBtn.classList.add('hidden');
        signInBtn.classList.remove('hidden');
        signUpBtn.classList.remove('hidden');
        authEmail.classList.remove('hidden');
        authPassword.classList.remove('hidden');
        if (h2AuthModal) {
            h2AuthModal.textContent = 'Autenticación';
        }
        adminPanelBtn.classList.add('hidden'); // Ocultar si no hay sesión
    }
    // Siempre resetear los campos del formulario cuando cambia el estado de autenticación
    authEmail.value = '';
    authPassword.value = '';
}

// Función para crear una tarjeta de video
function createVideoCard(videoData) {
    const videoCard = document.createElement('div');
    videoCard.classList.add('video-card');
    videoCard.dataset.videoId = videoData.id; // videoData.id es el youtube_id

    const creatorUsername = videoData.username || 'Usuario Anónimo';
    const creatorAvatarUrl = videoData.profile_picture_url || 'src/assets/images/img1.png'; // Usamos tu imagen local

    // Construir la URL de incrustación de YouTube usando el youtube_id (videoData.id)
    const youtubeEmbedUrl = `https://www.youtube.com/embed/${videoData.id}?autoplay=0&controls=1&showinfo=0&rel=0&modestbranding=1`; // Corregida la URL de YouTube

    videoCard.innerHTML = `
        <div class="video-player-container">
            <iframe
                width="100%"
                height="100%"
                src="${youtubeEmbedUrl}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                class="youtube-iframe"
                title="YouTube video player"
            ></iframe>
        </div>
        <div class="video-info">
            <div class="creator-info">
                <img src="${creatorAvatarUrl}" alt="${creatorUsername}">
                <span>@${creatorUsername}</span>
            </div>
            <p>${videoData.description || 'Sin descripción.'}</p>
            <p class="hashtags">${videoData.description ? videoData.description.split(' ').filter(word => word.startsWith('#')).map(tag => `<span>${tag}</span>`).join(' ') : ''}</p>
            <div class="music">
                <i class="fas fa-music"></i>
                <span>${videoData.musicInfo || 'Música Desconocida'}</span>
            </div>
        </div>
        <div class="interaction-buttons">
            <div class="interaction-item like-btn" data-video-id="${videoData.id}">
                <i class="fas fa-heart"></i>
                <span class="like-count">${videoData.likes || 0}</span>
            </div>
            <div class="interaction-item comment-btn" data-video-id="${videoData.id}">
                <i class="fas fa-comment-dots"></i>
                <span class="comment-count">${videoData.comments || 0}</span>
            </div>
            <div class="interaction-item share-btn">
                <i class="fas fa-share"></i>
                <span>Compartir</span>
            </div>
            <div class="interaction-item save-btn">
                <i class="fas fa-bookmark"></i>
                <span>Guardar</span>
            </div>
        </div>
    `;

    // --- Lógica para el botón de "Me Gusta" (Localmente y persistente por navegador) ---
    const likeButton = videoCard.querySelector('.like-btn');
    const likeCountSpan = likeButton.querySelector('.like-count');
    const heartIcon = likeButton.querySelector('i');

    let likedVideos = JSON.parse(localStorage.getItem('likedVideos')) || {};
    if (likedVideos[videoData.id]) {
        heartIcon.classList.add('liked');
    }

    likeButton.addEventListener('click', () => {
        const videoYoutubeId = videoData.id;
        let currentLikeCount = parseInt(likeCountSpan.textContent);

        if (heartIcon.classList.contains('liked')) {
            heartIcon.classList.remove('liked');
            likeCountSpan.textContent = currentLikeCount - 1;
            delete likedVideos[videoYoutubeId];
            localStorage.setItem('likedVideos', JSON.stringify(likedVideos));
        } else {
            heartIcon.classList.add('liked');
            likeCountSpan.textContent = currentLikeCount + 1;
            likedVideos[videoYoutubeId] = true;
            localStorage.setItem('likedVideos', JSON.stringify(likedVideos));
        }
    });

    // --- Lógica para el botón de Comentarios (con Supabase) ---
    const commentButton = videoCard.querySelector('.comment-btn');
    commentButton.addEventListener('click', async () => {
        currentVideoYoutubeIdForComments = videoData.id; // Guarda el YouTube ID del video
        await loadComments(currentVideoYoutubeIdForComments);
        commentsModal.style.display = 'flex';
    });

    return videoCard;
}

// --- Manejo del modal de comentarios ---
async function loadComments(youtubeId) {
    commentsList.innerHTML = 'Cargando comentarios...';
    const { data: comments, error } = await getCommentsByVideoId(youtubeId);

    if (error) {
        console.error('Error al cargar comentarios:', error.message);
        commentsList.innerHTML = 'Error al cargar comentarios.';
        return;
    }

    commentsList.innerHTML = ''; // Limpiar antes de añadir
    if (comments.length === 0) {
        commentsList.innerHTML = '<p>No hay comentarios aún. ¡Sé el primero!</p>';
    } else {
        // --- NUEVA LÓGICA: Obtener datos de usuario por separado ---
        const userIds = [...new Set(comments.map(comment => comment.user_id))];
        let usersData = {};

        if (userIds.length > 0) {
            const { data: fetchedUsers, error: usersError } = await supabase
                .from('users') // Asegúrate de que esta tabla 'users' exista y contenga profile_picture_url
                .select('id, username, profile_picture_url') //
                .in('id', userIds); // Obtener solo los usuarios que comentaron

            if (usersError) {
                console.error('Error fetching comment users:', usersError.message);
                // Si hay error, usersData queda vacío y se usará el fallback
            } else {
                fetchedUsers.forEach(user => {
                    usersData[user.id] = user; // Mapear por ID para fácil acceso
                });
            }
        }
        // --- FIN NUEVA LÓGICA ---

        comments.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.classList.add('comment-item');

            // Acceder a la información del usuario desde el objeto usersData
            const author = usersData[comment.user_id];
            const authorUsername = author ? author.username : 'Usuario Desconocido';
            const authorAvatar = author && author.profile_picture_url ? author.profile_picture_url : 'src/assets/images/img1.png';

            commentItem.innerHTML = `
                <img src="${authorAvatar}" alt="${authorUsername}">
                <div class="comment-info">
                    <div class="comment-author">@${authorUsername}</div>
                    <div class="comment-text">${comment.content}</div>
                </div>
            `;
            commentsList.appendChild(commentItem);
        });
    }
    commentsList.scrollTop = commentsList.scrollHeight; // Scroll al final
}

postCommentBtn.addEventListener('click', async () => {
    if (!currentUser) {
        alert('Debes iniciar sesión para comentar.');
        authModal.style.display = 'flex';
        return;
    }
    if (!currentVideoYoutubeIdForComments) {
        alert('Error: No se seleccionó un video para comentar.');
        return;
    }

    const content = commentText.value.trim();
    if (content.length === 0) {
        alert('El comentario no puede estar vacío.');
        return;
    }

    const { data, error } = await addComment(currentVideoYoutubeIdForComments, currentUser.id, content);

    if (!error) {
        commentText.value = ''; // Limpiar input
        await loadComments(currentVideoYoutubeIdForComments); // Recargar comentarios

        // Opcional: Actualizar contador de comentarios en la tarjeta del video localmente
        const videoCard = document.querySelector(`.video-card[data-video-id="${currentVideoYoutubeIdForComments}"]`);
        if (videoCard) {
            const commentCountSpan = videoCard.querySelector('.comment-count');
            commentCountSpan.textContent = parseInt(commentCountSpan.textContent) + 1;
        }
    } else {
        console.error('Error al publicar comentario:', error.message);
        alert('Error al publicar comentario.');
    }
});


// --- Manejo de Modales (Autenticación y Comentarios) ---
authButton.addEventListener('click', () => {
    authModal.style.display = 'flex';
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        authModal.style.display = 'none';
        commentsModal.style.display = 'none';
        adminPanelModal.style.display = 'none'; // CERRAR MODAL ADMIN
    });
});

// Cerrar modal al hacer clic fuera del contenido
window.addEventListener('click', (event) => {
    if (event.target === authModal) {
        authModal.style.display = 'none';
    }
    if (event.target === commentsModal) {
        commentsModal.style.display = 'none';
    }
    if (event.target === adminPanelModal) { // CERRAR MODAL ADMIN
        adminPanelModal.style.display = 'none'; //
    }
});

// Manejo del formulario de autenticación
authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = authEmail.value;
    const password = authPassword.value;

    if (event.submitter.id === 'signin-btn') {
        const { data, error } = await signInUser(email, password);
        if (error) {
            alert(`Error al iniciar sesión: ${error.message}`);
            console.error('Sign In Error:', error);
        } else {
            alert('¡Sesión iniciada con éxito!');
            console.log('User signed in:', data.user);
            authModal.style.display = 'none';
            await updateAuthUI();
        }
    }
});

signUpBtn.addEventListener('click', async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    const { data, error } = await signUpUser(email, password);
    if (error) {
        alert(`Error al registrarse: ${error.message}`);
        console.error('Sign Up Error:', error);
    } else {
        alert('¡Registro exitoso! Por favor, verifica tu correo electrónico.');
        console.log('User signed up:', data.user);
        // Opcional: Cerrar modal o mantenerlo abierto para el inicio de sesión
    }
});

logoutBtn.addEventListener('click', async () => {
    const { error } = await signOutUser();
    if (error) {
        alert(`Error al cerrar sesión: ${error.message}`);
        console.error('Sign Out Error:', error);
    } else {
        alert('Sesión cerrada con éxito.');
        console.log('User signed out.');
        authModal.style.display = 'none';
        await updateAuthUI();
    }
});

// --- NUEVA LÓGICA: Cambiar Contraseña ---
changePasswordBtn.addEventListener('click', async () => {
    if (!currentUser) {
        alert('Debes iniciar sesión para cambiar tu contraseña.');
        return;
    }
    const newPassword = prompt('Ingresa tu nueva contraseña:');
    if (newPassword && newPassword.length >= 6) { // Supabase requiere un mínimo de 6 caracteres
        const confirmNewPassword = prompt('Confirma tu nueva contraseña:');
        if (newPassword === confirmNewPassword) {
            const { data, error } = await updateUserPassword(newPassword);
            if (error) {
                alert(`Error al cambiar contraseña: ${error.message}`);
                console.error('Change Password Error:', error);
            } else {
                alert('Contraseña cambiada con éxito. Por favor, vuelve a iniciar sesión con tu nueva contraseña.');
                // Forzar un cierre de sesión para que el usuario se autentique de nuevo
                await signOutUser();
                authModal.style.display = 'none';
                await updateAuthUI();
            }
        } else {
            alert('Las contraseñas no coinciden.');
        }
    } else if (newPassword) { // Solo si el usuario no canceló el prompt
        alert('La contraseña debe tener al menos 6 caracteres.');
    }
});

// --- LÓGICA MODIFICADA: Eliminar Cuenta ---
deleteAccountBtn.addEventListener('click', async () => {
    if (!currentUser) {
        alert('Debes iniciar sesión para eliminar tu cuenta.');
        return;
    }

    const confirmDelete = confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y eliminará todos tus datos asociados.');

    if (confirmDelete) {
        const confirmEmail = prompt('Para confirmar, ingresa tu correo electrónico:');
        if (confirmEmail === currentUser.email) {
            try {
                // Llama a la función de Supabase que utiliza la función de base de datos
                const { data, error } = await deleteUserAccount(); // Ya no necesita currentUser.id aquí

                if (error) {
                    throw new Error(error.message); // Lanza el error para que sea capturado
                }

                alert('Tu cuenta ha sido eliminada con éxito. Redirigiendo...');
                // signOutUser() ya es llamado dentro de deleteUserAccount en supabase.js
                authModal.style.display = 'none';
                await updateAuthUI();
                window.location.reload(); // Recarga para asegurar que la UI se actualiza
            } catch (error) {
                alert(`Error al eliminar la cuenta: ${error.message}`);
                console.error('Delete Account Error:', error);
            }
        } else {
            alert('El correo electrónico no coincide. La cuenta no fue eliminada.');
        }
    }
});


// Escuchar cambios de estado de autenticación de Supabase
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    updateAuthUI();
});

// --- NUEVA LÓGICA: Panel de Administración de Usuarios ---
if (adminPanelBtn) { //
    adminPanelBtn.addEventListener('click', async () => { //
        if (!currentUser) { //
            alert('Debes iniciar sesión para acceder al panel de administrador.'); //
            return; //
        }

        // Ya se verificó el rol en updateAuthUI, pero se puede redundar aquí si se desea más seguridad
        const { data: profile, error } = await supabase.from('users').select('role').eq('id', currentUser.id).single(); //
        if (error || !profile || profile.role !== 'admin') { //
            alert('No tienes permisos de administrador para acceder a este panel.'); //
            console.error('Admin panel access denied:', error?.message); //
            return; //
        }

        adminPanelModal.style.display = 'flex'; //
        await loadAdminUsers(); //
    });
}

// Cerrar el modal de administrador
if (adminCloseButton) { //
    adminCloseButton.addEventListener('click', () => { //
        adminPanelModal.style.display = 'none'; //
    });
}

async function loadAdminUsers() { //
    adminUsersList.innerHTML = 'Cargando usuarios...'; //
    const { data: users, error } = await adminReadUsers(); //

    if (error) { //
        adminUsersList.innerHTML = `<p>Error al cargar usuarios: ${error.message}</p>`; //
        return; //
    }

    adminUsersList.innerHTML = ''; // Limpiar antes de añadir
    if (users.length === 0) { //
        adminUsersList.innerHTML = '<p>No hay usuarios registrados.</p>'; //
    } else { //
        users.forEach(user => { //
            const userItem = document.createElement('div'); //
            userItem.classList.add('admin-user-item'); //
            userItem.innerHTML = ` //
                <p><strong>ID:</strong> ${user.id}</p> //
                <p><strong>Email:</strong> ${user.email}</p> //
                <p><strong>Username:</strong> ${user.username || 'N/A'}</p> //
                <p><strong>Rol:</strong> ${user.role || 'user'}</p> //
                <button data-user-id="${user.id}" class="edit-user-btn">Editar</button> //
                <button data-user-id="${user.id}" class="delete-user-btn" style="background-color: #dc3545;">Eliminar</button> //
                <hr> //
            `;
            adminUsersList.appendChild(userItem); //
        });

        // Añadir event listeners a los botones de editar y eliminar
        adminUsersList.querySelectorAll('.edit-user-btn').forEach(button => { //
            button.addEventListener('click', async (e) => { //
                const userIdToEdit = e.target.dataset.userId; //
                const { data: userToEdit, error: readError } = await adminReadUsers(userIdToEdit); //
                if (readError) { //
                    alert(`Error al obtener datos del usuario: ${readError.message}`); //
                    return; //
                }

                const newEmail = prompt(`Editar email para ${userToEdit.email}:`, userToEdit.email); //
                if (newEmail === null) return; // User cancelled

                const newUsername = prompt(`Editar nombre de usuario para ${userToEdit.username}:`, userToEdit.username); //
                if (newUsername === null) return; // User cancelled

                const newRole = prompt(`Editar rol para ${userToEdit.username} (actual: ${userToEdit.role || 'user'}):`, userToEdit.role || 'user'); //
                if (newRole === null) return; // User cancelled

                const updates = { email: newEmail, username: newUsername, role: newRole }; //

                const { error } = await adminUpdateUser(userIdToEdit, updates); //
                if (error) { //
                    alert(`Error al actualizar usuario: ${error.message}`); //
                } else { //
                    alert('Usuario actualizado con éxito.'); //
                    await loadAdminUsers(); // Recargar lista
                }
            });
        });

        adminUsersList.querySelectorAll('.delete-user-btn').forEach(button => { //
            button.addEventListener('click', async (e) => { //
                const userIdToDelete = e.target.dataset.userId; //
                if (confirm(`¿Estás seguro de que quieres eliminar al usuario con ID: ${userIdToDelete}? Esta acción es irreversible.`)) { //
                    const { error } = await adminDeleteUser(userIdToDelete); //
                    if (error) { //
                        alert(`Error al eliminar usuario: ${error.message}`); //
                    } else { //
                        alert('Usuario eliminado con éxito.'); //
                        await loadAdminUsers(); // Recargar la lista
                    }
                }
            });
        });
    }
}

// Manejo del formulario de creación de usuario
if (adminCreateUserForm) { //
    adminCreateUserForm.addEventListener('submit', async (e) => { //
        e.preventDefault(); //
        const email = newAdminUserEmail.value.trim(); //
        const password = newAdminUserPassword.value.trim(); //
        const username = newAdminUsername.value.trim(); //
        const role = newAdminUserRole.value.trim(); //

        if (!email || !password || !username) { //
            alert('Email, contraseña y nombre de usuario son obligatorios.'); //
            return; //
        }

        const { data, error } = await adminCreateUser(email, password, username, role); //

        if (error) { //
            alert(`Error al crear usuario: ${error.message}`); //
        } else { //
            alert(`Usuario ${data.email} creado con éxito.`); //
            adminCreateUserForm.reset(); // Limpiar formulario
            await loadAdminUsers(); // Recargar la lista
        }
    });
}

// --- Inicialización de la aplicación ---
async function initApp() {
    await updateAuthUI(); // Asegurarse de que el estado de auth esté actualizado al inicio

    // Simplemente usamos los DUMMY_VIDEOS directamente
    const videos = DUMMY_VIDEOS;

    if (videos && videos.length > 0) {
        videoFeed.innerHTML = ''; // Limpiar el feed antes de añadir nuevos videos
        videos.forEach(video => {
            const videoCard = createVideoCard(video);
            videoFeed.appendChild(videoCard);
        });
    } else {
        videoFeed.innerHTML = '<p>No hay videos disponibles.</p>';
    }
}

// Iniciar la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', initApp);