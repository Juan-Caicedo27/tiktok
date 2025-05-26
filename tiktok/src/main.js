import {
    supabase,
    signUpUser,
    signInUser,
    signOutUser,
    addComment,
    getCommentsByVideoId,
    // updateVideoCommentCount // Ya no es necesario si la tabla Videos no existe
} from './supabase.js';

// Importa tus videos predeterminados desde videos.js
import { DUMMY_VIDEOS } from './videos.js';

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
    const h2AuthModal = authModal.querySelector('h2'); // Selecciona el h2 dentro del modal

    if (session) {
        currentUser = session.user;
        authButton.textContent = 'Perfil';
        logoutBtn.classList.remove('hidden');
        signInBtn.classList.add('hidden');
        signUpBtn.classList.add('hidden');
        authEmail.classList.add('hidden');
        authPassword.classList.add('hidden');
        if (h2AuthModal) { // Asegura que el h2 exista antes de modificarlo
            h2AuthModal.textContent = `Bienvenido, ${currentUser.email}`;
        }
    } else {
        currentUser = null;
        authButton.textContent = 'Iniciar Sesión';
        logoutBtn.classList.add('hidden');
        signInBtn.classList.remove('hidden');
        signUpBtn.classList.remove('hidden');
        authEmail.classList.remove('hidden');
        authPassword.classList.remove('hidden');
        if (h2AuthModal) { // Asegura que el h2 exista antes de modificarlo
            h2AuthModal.textContent = 'Autenticación';
        }
    }
}

// Función para crear una tarjeta de video
function createVideoCard(videoData) {
    const videoCard = document.createElement('div');
    videoCard.classList.add('video-card');
    // Usamos el ID de YouTube como nuestro identificador único para el video
    videoCard.dataset.videoId = videoData.id; // videoData.id es el youtube_id

    // Aquí asumimos que los datos del creador vienen junto con videoData en DUMMY_VIDEOS.
    // Si tus DUMMY_VIDEOS no tienen 'username' o 'profile_picture_url', ajusta esto.
    const creatorUsername = videoData.username || 'Usuario Anónimo';
    const creatorAvatarUrl = videoData.profile_picture_url || 'https://via.placeholder.com/40';

    // Construir la URL de incrustación de YouTube usando el youtube_id (videoData.id)
    const youtubeEmbedUrl = `https://www.youtube.com/embed/${videoData.id}?autoplay=0&controls=1&showinfo=0&rel=0&modestbranding=1`;

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

    // Cargar el estado del like desde localStorage al crear la tarjeta
    let likedVideos = JSON.parse(localStorage.getItem('likedVideos')) || {};
    if (likedVideos[videoData.id]) {
        heartIcon.classList.add('liked');
        // Asegurarse de que el color también se aplique si usas CSS para 'liked' class
    }

    likeButton.addEventListener('click', () => {
        const videoYoutubeId = videoData.id; // Usamos el ID de YouTube como identificador
        let currentLikeCount = parseInt(likeCountSpan.textContent);

        if (heartIcon.classList.contains('liked')) {
            // Ya le dio like, ahora lo quita (localmente)
            heartIcon.classList.remove('liked');
            likeCountSpan.textContent = currentLikeCount - 1;
            delete likedVideos[videoYoutubeId]; // Eliminar del objeto de likes
            localStorage.setItem('likedVideos', JSON.stringify(likedVideos));
            // Si tuvieras una tabla de Interacciones para registrar likes individuales:
            // if (currentUser) removeLike(currentUser.id, videoYoutubeId);
        } else {
            // No le ha dado like, ahora lo añade (localmente)
            heartIcon.classList.add('liked');
            likeCountSpan.textContent = currentLikeCount + 1;
            likedVideos[videoYoutubeId] = true; // Guardar que ya le dio like a este video
            localStorage.setItem('likedVideos', JSON.stringify(likedVideos));
            // Si tuvieras una tabla de Interacciones para registrar likes individuales:
            // if (currentUser) addLike(currentUser.id, videoYoutubeId);
            // else alert('Debes iniciar sesión para registrar likes.'); // Si requieres login
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
    // Asumimos que getCommentsByVideoId puede tomar el ID de YouTube (TEXT)
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
        comments.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.classList.add('comment-item');
            // Asegúrate de que los datos de usuario vienen correctamente con el comentario
            // via join/rpc si usas la tabla Users, o ten un fallback
            const authorUsername = comment.Users ? comment.Users.username : 'Anónimo';
            const authorAvatar = comment.Users ? comment.Users.profile_picture_url : 'https://via.placeholder.com/40';

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

    // Usamos currentVideoYoutubeIdForComments como el video_id (TEXT) para la tabla Comments
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
            await updateAuthUI(); // Actualizar UI después de iniciar sesión
            // Recargar videos para asegurar el estado de likes (aunque con localStorage es menos crítico)
            // initApp(); // Esto no es estrictamente necesario ya que los videos son estáticos
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
        await updateAuthUI(); // Actualizar UI después de cerrar sesión
        // initApp(); // No es estrictamente necesario ya que los videos son estáticos
    }
});

// Escuchar cambios de estado de autenticación de Supabase
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    updateAuthUI();
});

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