// src/main.js

import {
    supabase,
    signUpUser,
    signInUser,
    signOutUser,
    checkLike,
    addLike,
    removeLike,
    updateVideoLikeCount,
    // ¡Nuevas funciones importadas!
    addComment,
    getCommentsByVideoId,
    updateVideoCommentCount
} from './supabase.js';

// --- VIDEOS DE PRUEBA PERMANENTES ---
// Asegúrate de que estos video_id coincidan con los que insertaste en tu tabla Videos
const DUMMY_VIDEOS = [
    {
        video_id: 1, // ¡Importante que coincida con la DB!
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        thumbnail_url: 'https://via.placeholder.com/400x600/000000/FFFFFF?text=Video+1',
        description: '¡Primer video de prueba! Un video clásico para el feed. #demo #tiktokclone #frontend',
        music_info: 'Artista Prueba - Canción Demo 1',
        // Los conteos (like_count, comment_count) serán actualizados desde la DB
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        created_at: new Date().toISOString(),
        // Users es para el ejemplo de datos, pero el real vendrá de la DB
        Users: {
            username: 'demouser1',
            profile_picture_url: 'https://via.placeholder.com/40/FF0000/FFFFFF?text=D1'
        }
    },
    {
        video_id: 2, // ¡Importante que coincida con la DB!
        video_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnail_url: 'https://via.placeholder.com/400x600/000000/FFFFFF?text=Video+2',
        description: 'Segundo video de prueba. ¡Un clásico para el feed! #classic #bunny',
        music_info: 'Old School Vibes - Epic Beat',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        Users: {
            username: 'demouser2',
            profile_picture_url: 'https://via.placeholder.com/40/00FF00/FFFFFF?text=D2'
        }
    },
    {
        video_id: 3, // ¡Importante que coincida con la DB!
        video_url: 'http://techslides.com/demos/sample-videos/small.mp4',
        thumbnail_url: 'https://via.placeholder.com/400x600/000000/FFFFFF?text=Video+3',
        description: 'Tercer video de prueba, pequeño y ágil. #small #test',
        music_info: 'Quick Tune - Short Loop',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        created_at: new Date(Date.now() - 7200 * 1000).toISOString(),
        Users: {
            username: 'demouser3',
            profile_picture_url: 'https://via.placeholder.com/40/0000FF/FFFFFF?text=D3'
        }
    }
];


document.addEventListener('DOMContentLoaded', async () => {
    // --- Elementos del DOM ---
    const videoFeed = document.getElementById('videoFeed');
    const authModal = document.getElementById('auth-modal');
    const loginSignupBtn = document.getElementById('login-signup-btn');
    const closeAuthModalBtn = authModal ? authModal.querySelector('#close-auth-modal') : null; // Usa ID si el modal tiene varios close-button

    const signupButton = document.getElementById('signup-button');
    const loginButton = document.getElementById('login-button');
    const logoutBtn = document.getElementById('logout-btn');

    // Elementos para el modal de comentarios
    const commentsModal = document.getElementById('comments-modal');
    const closeCommentsModalBtn = commentsModal ? commentsModal.querySelector('#close-comments-modal') : null;
    const commentsList = document.getElementById('comments-list');
    const commentTextInput = document.getElementById('comment-text-input');
    const postCommentButton = document.getElementById('post-comment-button');
    const commentStatusMessage = document.getElementById('comment-status-message');

    let currentVideoIdForComments = null; // Variable para saber qué video estamos comentando

    // --- Ocultar el botón de subir video y el modal de subida (ahora no se usan) ---
    // Si tu HTML aún los tiene, puedes ocultarlos con JS por si acaso.
    // También asegúrate de haberlos comentado/eliminado en tu index.html
    const uploadVideoBtn = document.getElementById('upload-video-btn');
    if (uploadVideoBtn) {
        uploadVideoBtn.style.display = 'none';
    }
    const uploadModal = document.getElementById('upload-modal');
    if (uploadModal) {
        uploadModal.style.display = 'none';
    }


    // --- Funciones auxiliares para modales ---
    function openModal(modal) {
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex'; // o 'block' dependiendo de tu CSS
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    // --- Funciones de Autenticación ---
    function updateAuthUI(user) {
        const loginSignupContainer = document.getElementById('login-signup-btn');
        const currentUserProfile = document.getElementById('current-user-profile');
        const logoutButtonContainer = document.getElementById('logout-btn');

        if (user) {
            if (loginSignupContainer) loginSignupContainer.style.display = 'none';
            if (currentUserProfile) {
                currentUserProfile.style.display = 'flex';
                // Opcional: Actualizar info del usuario si la tienes en user_metadata (ej. nombre de usuario, avatar)
                // document.getElementById('user-avatar-small').src = user.user_metadata.avatar_url || 'https://via.placeholder.com/30';
                // document.getElementById('username-small').textContent = user.user_metadata.username || user.email;
            }
            if (logoutButtonContainer) logoutButtonContainer.style.display = 'flex';
        } else {
            if (loginSignupContainer) loginSignupContainer.style.display = 'flex';
            if (currentUserProfile) currentUserProfile.style.display = 'none';
            if (logoutButtonContainer) logoutButtonContainer.style.display = 'none';
        }
    }

    // --- Listeners para abrir/cerrar modales de auth ---
    if (loginSignupBtn) {
        loginSignupBtn.addEventListener('click', () => openModal(authModal));
    }
    if (closeAuthModalBtn) {
        closeAuthModalBtn.addEventListener('click', () => closeModal(authModal));
    }


    // --- Listeners para autenticación ---
    if (loginButton) {
        loginButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('auth-email');
            const passwordInput = document.getElementById('auth-password');
            if (!emailInput || !passwordInput) {
                console.error('Inputs de email/password no encontrados en el modal de autenticación.');
                return;
            }
            const email = emailInput.value;
            const password = passwordInput.value;
            const { error } = await signInUser(email, password);
            if (error) {
                alert(error.message);
            } else {
                closeModal(authModal);
                alert('¡Inicio de sesión exitoso!');
                initApp(); // Recargar videos para que los likes/comments usen el user real
            }
        });
    }

    if (signupButton) {
        signupButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('auth-email');
            const passwordInput = document.getElementById('auth-password');
            if (!emailInput || !passwordInput) {
                console.error('Inputs de email/password no encontrados en el modal de autenticación.');
                return;
            }
            const email = emailInput.value;
            const password = passwordInput.value;
            const { error } = await signUpUser(email, password);
            if (error) {
                alert(error.message);
            } else {
                closeModal(authModal);
                alert('¡Registro exitoso! Por favor, revisa tu email para confirmar tu cuenta.');
                initApp();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await signOutUser();
            if (error) {
                alert(error.message);
            } else {
                alert('Sesión cerrada.');
                initApp(); // Recargar videos para que los likes/comments ya no funcionen (requieren login)
            }
        });
    }


    // --- Función para crear la tarjeta de video ---
    function createVideoCard(videoData) {
        const videoCard = document.createElement('div');
        videoCard.classList.add('video-card');
        videoCard.dataset.videoId = videoData.video_id;

        // Si la tabla Users no tiene el campo username, o si lo obtienes de otra forma, ajusta esto.
        // Asume que videoData.Users.username y profile_picture_url vienen del join con la tabla Users.
        const creatorUsername = videoData.Users ? videoData.Users.username : 'Desconocido';
        const creatorAvatarUrl = videoData.Users ? videoData.Users.profile_picture_url : 'https://via.placeholder.com/40';

        videoCard.innerHTML = `
            <video loop preload="auto" poster="${videoData.thumbnail_url || 'https://via.placeholder.com/400x600/000000/FFFFFF?text=Video'}">
                <source src="${videoData.video_url}" type="video/mp4">
                Tu navegador no soporta el tag de video.
            </video>
            <div class="video-info">
                <div class="creator-info">
                    <img src="${creatorAvatarUrl}" alt="${creatorUsername}">
                    <span>@${creatorUsername}</span>
                </div>
                <p>${videoData.description || 'Sin descripción.'}</p>
                <p class="hashtags">${videoData.description ? videoData.description.split(' ').filter(word => word.startsWith('#')).map(tag => `<span>${tag}</span>`).join('') : ''}</p>
                <div class="music">
                    <i class="fas fa-music"></i>
                    <span>${videoData.music_info || 'Música Desconocida'}</span>
                </div>
            </div>
        `;

        const interactionButtonsContainer = document.createElement('div');
        interactionButtonsContainer.classList.add('video-interaction-overlay');
        interactionButtonsContainer.innerHTML = `
            <div class="interaction-item like-btn" data-video-id="${videoData.video_id}">
                <i class="fas fa-heart"></i>
                <span class="like-count">${videoData.like_count || 0}</span>
            </div>
            <div class="interaction-item comment-btn" data-video-id="${videoData.video_id}">
                <i class="fas fa-comment-dots"></i>
                <span class="comment-count">${videoData.comment_count || 0}</span>
            </div>
            <div class="interaction-item share-btn" data-video-id="${videoData.video_id}">
                <i class="fas fa-share"></i>
                <span class="share-count">${videoData.share_count || 0}</span>
            </div>
            <div class="interaction-item rotate-icon">
                <img src="${videoData.music_thumbnail_url || 'https://via.placeholder.com/40'}" alt="Disco">
            </div>
        `;
        videoCard.appendChild(interactionButtonsContainer);

        // Lógica de reproducción/pausa al scroll
        const videoElement = videoCard.querySelector('video');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    videoElement.play();
                } else {
                    videoElement.pause();
                    videoElement.currentTime = 0;
                }
            });
        }, { threshold: 0.75 });
        observer.observe(videoCard);

        videoElement.addEventListener('click', () => {
            if (videoElement.paused) {
                videoElement.play();
            } else {
                videoElement.pause();
            }
        });

        // --- Lógica para el botón de "Me gusta" ---
        const likeButton = videoCard.querySelector('.like-btn');
        const likeCountSpan = likeButton.querySelector('.like-count');

        // Función para inicializar el estado del like al cargar el video
        async function initializeLikeState(currentUser) {
            if (!currentUser || !currentUser.id) {
                console.warn('No hay usuario logueado para inicializar el estado de likes.');
                likeButton.classList.remove('liked');
                likeButton.classList.add('disabled-like');
                return;
            } else {
                likeButton.classList.remove('disabled-like');
            }

            const { data: isLiked, error: checkError } = await checkLike(currentUser.id, videoData.video_id);
            if (!checkError && isLiked) {
                likeButton.classList.add('liked');
            } else if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error al verificar like inicial:', checkError.message);
            }

            // Obtener y mostrar el contador de likes actual desde la DB (para asegurar que sea el valor real)
            const { data: videoFromDB, error: fetchVideoError } = await supabase
                .from('Videos')
                .select('like_count, comment_count') // También obtenemos comment_count aquí
                .eq('video_id', videoData.video_id)
                .single();

            if (!fetchVideoError && videoFromDB) {
                likeCountSpan.textContent = videoFromDB.like_count || 0;
                commentCountSpan.textContent = videoFromDB.comment_count || 0; // Actualiza también el de comentarios
            } else {
                console.error('Error al cargar conteos para video (initializeLikeState):', fetchVideoError?.message || 'Video no encontrado en DB');
            }
        }

        // Llamar a initializeLikeState DENTRO de createVideoCard
        supabase.auth.getUser().then(({ data: { user } }) => {
            initializeLikeState(user);
        }).catch(err => {
            console.error('Error obteniendo usuario para initializeLikeState:', err);
        });

        if (likeButton) {
            likeButton.addEventListener('click', async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    alert('Debes iniciar sesión para dar "me gusta".');
                    openModal(authModal);
                    return;
                }

                const videoId = videoData.video_id;
                const { data: isLiked, error: checkError } = await checkLike(user.id, videoId);

                if (checkError && checkError.code !== 'PGRST116') {
                    console.error('Error al verificar like:', checkError.message);
                    return;
                }

                if (isLiked) {
                    const { error: removeError } = await removeLike(user.id, videoId);
                    if (!removeError) {
                        likeButton.classList.remove('liked');
                        await updateVideoLikeCount(videoId, -1);
                        const { data: updatedVideo, error: fetchUpdatedError } = await supabase
                            .from('Videos')
                            .select('like_count')
                            .eq('video_id', videoId)
                            .single();
                        if (!fetchUpdatedError) {
                            likeCountSpan.textContent = updatedVideo.like_count;
                        } else {
                            console.error('Error al recargar contador tras remover like:', fetchUpdatedError.message);
                        }
                    } else {
                        console.error('Error al remover like:', removeError.message);
                    }
                } else {
                    const { error: addError } = await addLike(user.id, videoId);
                    if (!addError) {
                        likeButton.classList.add('liked');
                        await updateVideoLikeCount(videoId, 1);
                        const { data: updatedVideo, error: fetchUpdatedError } = await supabase
                            .from('Videos')
                            .select('like_count')
                            .eq('video_id', videoId)
                            .single();
                        if (!fetchUpdatedError) {
                            likeCountSpan.textContent = updatedVideo.like_count;
                        } else {
                            console.error('Error al recargar contador tras añadir like:', fetchUpdatedError.message);
                        }
                    } else {
                        console.error('Error al añadir like:', addError.message);
                    }
                }
            });
        }

        // --- Lógica para el botón de "Comentar" ---
        const commentButton = videoCard.querySelector('.comment-btn');
        const commentCountSpan = commentButton.querySelector('.comment-count');

        if (commentButton) {
            commentButton.addEventListener('click', async () => {
                currentVideoIdForComments = videoData.video_id; // Establece el video ID actual
                commentsList.innerHTML = '<p class="loading-message">Cargando comentarios...</p>'; // Muestra mensaje de carga
                await loadComments(currentVideoIdForComments); // Carga los comentarios para este video
                openModal(commentsModal); // Abre el modal de comentarios
            });
        }

        return videoCard;
    }

    // --- FUNCIONES PARA GESTIONAR COMENTARIOS ---

    // Función para cargar y mostrar comentarios en el modal
    async function loadComments(videoId) {
        commentsList.innerHTML = '<p class="loading-message">Cargando comentarios...</p>';
        commentStatusMessage.textContent = ''; // Limpiar cualquier mensaje de estado anterior

        const { data: comments, error } = await getCommentsByVideoId(videoId);

        if (error) {
            commentsList.innerHTML = '<p class="error-message">Error al cargar comentarios.</p>';
            console.error('Error loading comments:', error.message);
            return;
        }

        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments-message">Sé el primero en comentar.</p>';
            return;
        }

        commentsList.innerHTML = ''; // Limpiar mensaje de carga
        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment-item');
            const username = comment.Users ? comment.Users.username : 'Usuario Desconocido';
            const profilePic = comment.Users ? comment.Users.profile_picture_url : 'https://via.placeholder.com/24';
            const commentDate = new Date(comment.created_at).toLocaleString(); // Formatear fecha

            commentElement.innerHTML = `
                <img src="${profilePic}" alt="${username}" class="comment-avatar">
                <div class="comment-content-wrapper">
                    <span class="comment-username">@${username}</span>
                    <p class="comment-text">${comment.content}</p>
                    <span class="comment-date">${commentDate}</span>
                </div>
            `;
            commentsList.appendChild(commentElement);
        });
        commentsList.scrollTop = commentsList.scrollHeight; // Hacer scroll al final para ver el último comentario
    }

    // Función para publicar un nuevo comentario
    async function postComment() {
        const commentContent = commentTextInput.value.trim();
        if (!commentContent) {
            commentStatusMessage.textContent = 'El comentario no puede estar vacío.';
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesión para comentar.');
            openModal(authModal);
            commentStatusMessage.textContent = '';
            return;
        }

        commentStatusMessage.textContent = 'Publicando...';
        const { error } = await addComment(currentVideoIdForComments, user.id, commentContent);

        if (error) {
            commentStatusMessage.textContent = `Error: ${error.message}`;
            console.error('Error posting comment:', error.message);
        } else {
            commentTextInput.value = ''; // Limpiar input
            commentStatusMessage.textContent = 'Comentario publicado.';

            // Actualizar contador de comentarios en la tabla Videos
            await updateVideoCommentCount(currentVideoIdForComments, 1);

            // Re-cargar la lista de comentarios para ver el nuevo
            await loadComments(currentVideoIdForComments);

            // Opcional: Actualizar el contador de comentarios en la tarjeta de video visible en el feed
            const videoCardElement = document.querySelector(`.video-card[data-video-id="${currentVideoIdForComments}"]`);
            if (videoCardElement) {
                const span = videoCardElement.querySelector('.comment-count');
                if (span) {
                    const currentCount = parseInt(span.textContent) || 0;
                    span.textContent = currentCount + 1;
                }
            }
            setTimeout(() => { commentStatusMessage.textContent = ''; }, 3000); // Limpiar mensaje después de 3 segundos
        }
    }

    // Listeners para el modal de comentarios
    if (closeCommentsModalBtn) {
        closeCommentsModalBtn.addEventListener('click', () => {
            closeModal(commentsModal);
            currentVideoIdForComments = null; // Limpiar el ID del video actual
            commentTextInput.value = ''; // Asegurarse de que el input esté limpio
            commentStatusMessage.textContent = ''; // Limpiar mensaje de estado
        });
    }

    if (postCommentButton) {
        postCommentButton.addEventListener('click', postComment);
    }

    if (commentTextInput) {
        commentTextInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                postComment();
            }
        });
    }

    // --- Función de inicialización de la app ---
    async function initApp() {
        const { data: { user } } = await supabase.auth.getUser();
        updateAuthUI(user);

        videoFeed.innerHTML = ''; // Limpiar el feed de videos

        if (DUMMY_VIDEOS.length === 0) {
            videoFeed.innerHTML = '<p style="text-align:center; margin-top: 50px; color: #aaa;">No hay videos de prueba configurados.</p>';
            return;
        }

        for (const video of DUMMY_VIDEOS) {
            const videoCard = createVideoCard(video);
            videoFeed.appendChild(videoCard);
            // initializeLikeState y la carga de comentarios se llaman dentro de createVideoCard
        }
    }

    // Llama a la función de inicialización de la app
    initApp();

    // Mantener el onAuthStateChange para manejar cambios de autenticación
    supabase.auth.onAuthStateChange((event, session) => {
        updateAuthUI(session ? session.user : null);
        initApp(); // Recargar videos si el estado de autenticación cambia para actualizar likes/comments
    });

}); // Fin de DOMContentLoaded