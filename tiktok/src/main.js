// main.js

// Importa el cliente de Supabase y las funciones de interacción desde supabase.js
import {
    supabase, // Necesitas el cliente supabase para el onAuthStateChange
    signUpUser,
    signInUser,
    signOutUser,
    fetchVideos,
    uploadVideoFile,
    insertVideoDetails,
    checkLike,
    addLike,
    removeLike,
    updateVideoLikeCount
} from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Referencias a elementos del DOM ---
    const videoFeed = document.getElementById('videoFeed');
    const authModal = document.getElementById('auth-modal');
    const uploadModal = document.getElementById('upload-modal');
    const closeButtons = document.querySelectorAll('.close-button');
    const loginSignupBtn = document.getElementById('login-signup-btn');
    const uploadVideoBtn = document.getElementById('upload-video-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const currentProfileSection = document.getElementById('current-user-profile');
    const usernameSmall = document.getElementById('username-small');
    const userAvatarSmall = document.getElementById('user-avatar-small');

    // --- Funciones de Interfaz de Usuario (Modals) ---
    function openModal(modal) {
        modal.style.display = 'flex';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
    }

    closeButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            closeModal(event.target.closest('.modal'));
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === authModal) closeModal(authModal);
        if (event.target === uploadModal) closeModal(uploadModal);
    });

    loginSignupBtn.addEventListener('click', () => openModal(authModal));
    uploadVideoBtn.addEventListener('click', async () => {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
            openModal(uploadModal);
        } else {
            alert('Debes iniciar sesión para subir videos.');
            openModal(authModal);
        }
    });
    logoutBtn.addEventListener('click', async () => {
        const { error } = await signOutUser(); // Llama a la función de supabase.js
        if (error) {
            console.error('Error al cerrar sesión:', error.message);
            alert('Error al cerrar sesión.');
        } else {
            console.log('Sesión cerrada.');
            updateAuthUI(null); // Actualiza la UI a estado no logueado
            await loadVideos(); // Recarga videos (si el feed "Para Ti" no necesita autenticación)
        }
    });

    // --- Funciones de Autenticación (ahora usan las funciones de supabase.js) ---
    document.getElementById('signup-button').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const { data, error } = await signUpUser(email, password); // Llama a la función de supabase.js

        if (error) {
            alert('Error al registrarse: ' + error.message);
        } else {
            alert('Registro exitoso. Revisa tu correo para confirmar.');
            closeModal(authModal);
        }
    });

    document.getElementById('login-button').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const { data, error } = await signInUser(email, password); // Llama a la función de supabase.js

        if (error) {
            alert('Error al iniciar sesión: ' + error.message);
        } else {
            alert('Inicio de sesión exitoso.');
            closeModal(authModal);
            updateAuthUI(data.user);
            await loadVideos(); // Recargar videos, si el feed depende de la autenticación
        }
    });

    // Escucha cambios en el estado de autenticación (sigue usando el cliente de supabase directamente)
    supabase.auth.onAuthStateChange((event, session) => {
        updateAuthUI(session ? session.user : null);
    });

    function updateAuthUI(user) {
        if (user) {
            loginSignupBtn.style.display = 'none';
            logoutBtn.style.display = 'flex';
            currentProfileSection.style.display = 'flex';
            // Para el nombre de usuario, si no lo tienes en tu tabla Users, puedes usar parte del email
            usernameSmall.textContent = user.email ? user.email.split('@')[0] : 'Usuario';
            // Si tu tabla Users tiene un 'profile_picture_url' y puedes accederlo
            // userAvatarSmall.src = user.user_metadata?.profile_picture_url || 'https://via.placeholder.com/30';
        } else {
            loginSignupBtn.style.display = 'flex';
            logoutBtn.style.display = 'none';
            currentProfileSection.style.display = 'none';
        }
    }

    // --- Funciones para crear las tarjetas de video ---
    function createVideoCard(videoData) {
        const videoCard = document.createElement('div');
        videoCard.classList.add('video-card');
        videoCard.dataset.videoId = videoData.video_id; // Almacena el ID del video

        // Asegúrate de acceder a los datos del creador correctamente desde el objeto `Users` anidado
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

        // Los botones de interacción ahora se añaden como un overlay dentro de cada tarjeta de video
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


        // Lógica para pausar/reproducir video al estar visible
        const videoElement = videoCard.querySelector('video');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    videoElement.play();
                } else {
                    videoElement.pause();
                    videoElement.currentTime = 0; // Opcional: reiniciar el video al salir de la vista
                }
            });
        }, { threshold: 0.75 }); // 75% del video debe ser visible para interactuar

        observer.observe(videoCard);

        // Reproducir/pausar al hacer clic
        videoElement.addEventListener('click', () => {
            if (videoElement.paused) {
                videoElement.play();
            } else {
                videoElement.pause();
            }
        });

        // Event listener para el botón de "Me gusta"
        const likeButton = videoCard.querySelector('.like-btn');
        if (likeButton) {
            likeButton.addEventListener('click', async () => {
                const user = (await supabase.auth.getUser()).data.user; // Obtener usuario autenticado
                if (!user) {
                    alert('Debes iniciar sesión para dar "me gusta".');
                    openModal(authModal);
                    return;
                }

                const userId = user.id; // El ID del usuario en Supabase Auth
                const videoId = parseInt(likeButton.dataset.videoId); // El ID del video de la tarjeta

                // Verificar si el usuario ya dio like a este video
                const { data: existingLike, error: checkError } = await checkLike(userId, videoId);

                if (checkError) {
                    console.error('Error al verificar like:', checkError.message);
                    return;
                }

                let newLikeCount = parseInt(likeButton.querySelector('.like-count').textContent);

                if (existingLike && existingLike.length > 0) {
                    // Si ya existe el like, eliminarlo (quitar like)
                    const { error: deleteError } = await removeLike(userId, videoId);

                    if (deleteError) {
                        console.error('Error al quitar like:', deleteError.message);
                    } else {
                        newLikeCount--;
                        likeButton.querySelector('.like-count').textContent = newLikeCount;
                        likeButton.classList.remove('liked'); // Quitar estilo de "likeado"
                        await updateVideoLikeCount(videoId, newLikeCount); // Actualizar en la DB
                    }
                } else {
                    // Si no existe, añadirlo (dar like)
                    const { error: insertError } = await addLike(userId, videoId);

                    if (insertError) {
                        console.error('Error al dar like:', insertError.message);
                    } else {
                        newLikeCount++;
                        likeButton.querySelector('.like-count').textContent = newLikeCount;
                        likeButton.classList.add('liked'); // Añadir estilo de "likeado"
                        await updateVideoLikeCount(videoId, newLikeCount); // Actualizar en la DB
                    }
                }
            });
        }

        return videoCard;
    }

    // --- Función para cargar videos desde Supabase ---
    async function loadVideos() {
        videoFeed.innerHTML = ''; // Limpiar feed actual
        const { data: videos, error } = await fetchVideos(); // Llama a la función de supabase.js

        if (error) {
            console.error('Error al cargar videos:', error.message);
            return;
        }

        if (videos.length === 0) {
            videoFeed.innerHTML = '<p style="text-align:center; margin-top: 50px; color: #aaa;">No hay videos aún. ¡Sube el primero!</p>';
            return;
        }

        videos.forEach(video => {
            // Pasamos el objeto video directamente, y createVideoCard accede a video.Users.username, etc.
            videoFeed.appendChild(createVideoCard(video));
        });
    }

    // --- Función para subir video a Supabase Storage y registrar en la DB ---
    document.getElementById('submit-upload-button').addEventListener('click', async () => {
        const fileInput = document.getElementById('video-file-input');
        const description = document.getElementById('video-description-input').value;
        const musicInfo = document.getElementById('video-music-input').value;
        const uploadStatus = document.getElementById('upload-status');

        if (!fileInput.files.length) {
            uploadStatus.textContent = 'Por favor, selecciona un archivo de video.';
            uploadStatus.style.color = 'orange';
            return;
        }

        const videoFile = fileInput.files[0];
        const user = (await supabase.auth.getUser()).data.user;

        if (!user) {
            uploadStatus.textContent = 'Debes estar logueado para subir videos.';
            uploadStatus.style.color = 'red';
            return;
        }

        uploadStatus.textContent = 'Subiendo video...';
        uploadStatus.style.color = 'white';

        // 1. Subir el video a Supabase Storage usando la función de supabase.js
        const { publicUrl, error: uploadError } = await uploadVideoFile(user.id, videoFile);

        if (uploadError) {
            console.error('Error al subir el video:', uploadError.message);
            uploadStatus.textContent = `Error al subir el video: ${uploadError.message}`;
            uploadStatus.style.color = 'red';
            return;
        }

        // 2. Insertar los detalles del video en la tabla 'Videos' usando la función de supabase.js
        const thumbnailUrl = 'https://via.placeholder.com/400x600/000000/FFFFFF?text=Cargando+Video'; // Placeholder
        const { error: dbError } = await insertVideoDetails({
            user_id: user.id,
            video_url: publicUrl, // Usamos la URL pública devuelta
            thumbnail_url: thumbnailUrl,
            description: description,
            music_info: musicInfo
        });

        if (dbError) {
    console.error('Error al guardar en la DB:', dbError); // ✅ muestra todo el objeto
    console.error('Mensaje de error específico (si existe):', dbError.message); // ✅ muestra el mensaje si lo hay

    uploadStatus.textContent = `Error al guardar en la base de datos: ${dbError.message || 'Error desconocido. Revisa la consola.'}`; // ✅ backticks para interpolación
    uploadStatus.style.color = 'red';
    return;
}


        uploadStatus.textContent = 'Video subido exitosamente!';
        uploadStatus.style.color = 'lightgreen';
        closeModal(uploadModal);
        document.getElementById('video-description-input').value = '';
        document.getElementById('video-music-input').value = '';
        fileInput.value = '';

        await loadVideos(); // Recargar el feed para mostrar el nuevo video
    });

    // --- Inicialización: Carga inicial de videos y estado de autenticación ---
    await loadVideos();
    const { data: { user } } = await supabase.auth.getUser(); // Obtener el usuario actual al cargar
    updateAuthUI(user);

    // Sidebar item click (mantiene la funcionalidad existente)
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
});