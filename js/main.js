// ========================== 
//  COUNTDOWN TIMER FUNCTION
// ========================== 
function updateCountdown() {
    // Ajusta aquí la fecha de tu próximo evento
    const eventDate = new Date('2026-04-30T21:00:00').getTime();
    const now = new Date().getTime();
    const distance = eventDate - now;

    if (distance < 0) {
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            countdownElement.innerHTML = '<div style="font-size: 36px; color: #39FF14; text-shadow: 0 0 20px #39FF14;">¡EL EVENTO HA COMENZADO!</div>';
        }
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');

    if (daysElement) daysElement.textContent = String(days).padStart(2, '0');
    if (hoursElement) hoursElement.textContent = String(hours).padStart(2, '0');
    if (minutesElement) minutesElement.textContent = String(minutes).padStart(2, '0');
    if (secondsElement) secondsElement.textContent = String(seconds).padStart(2, '0');
}

// ========================== 
//  ATTENDEE COUNTER LOGIC  
// ========================== 
let attendeeCount = parseInt(localStorage.getItem('attendeeCount')) || 0;
let hasUserConfirmed = localStorage.getItem('userConfirmed') === 'true';

function initAttendeeCounter() {
    const attendeeCountEl = document.getElementById('attendeeCount');
    const attendeeBtnEl = document.getElementById('attendeeBtn');
    const attendeeMsgEl = document.getElementById('attendeeMessage');

    if (attendeeCountEl) {
        attendeeCountEl.textContent = attendeeCount;
    }

    if (hasUserConfirmed && attendeeBtnEl) {
        attendeeBtnEl.disabled = true;
        attendeeBtnEl.style.opacity = '0.5';
    }
    
    if (hasUserConfirmed && attendeeMsgEl) {
        attendeeMsgEl.textContent = '¡Ya confirmaste tu asistencia!';
        attendeeMsgEl.style.color = '#39FF14';
    }
}

function addAttendee() {
    if (hasUserConfirmed) return;
    
    attendeeCount++;
    localStorage.setItem('attendeeCount', attendeeCount);
    localStorage.setItem('userConfirmed', 'true');
    hasUserConfirmed = true;
    
    // Animar el contador
    const counterElement = document.getElementById('attendeeCount');
    if (counterElement) {
        counterElement.style.transform = 'scale(1.3)';
        counterElement.textContent = attendeeCount;
        
        setTimeout(() => {
            counterElement.style.transform = 'scale(1)';
        }, 300);
    }
    
    // Deshabilitar botón
    const attendeeBtnEl = document.getElementById('attendeeBtn');
    if (attendeeBtnEl) {
        attendeeBtnEl.disabled = true;
        attendeeBtnEl.style.opacity = '0.5';
    }
    
    // Mostrar mensaje
    const message = document.getElementById('attendeeMessage');
    if (message) {
        message.textContent = '¡Gracias! Te esperamos en el evento 🎉';
        message.style.color = '#39FF14';
        message.style.animation = 'fadeInUp 0.5s ease';
    }
}

// ========================== 
//  DJ SONG REQUEST FUNCTIONS
// ========================== 

// --- FILTRO DE PALABRAS INAPROPIADAS ---
const PALABRAS_PROHIBIDAS = [
    'puta', 'mierda', 'pendejo', 'sexo', 'xxx'
];

function contienePalabrasProhibidas(texto) {
    const textoLower = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return PALABRAS_PROHIBIDAS.some(palabra => {
        const palabraNorm = palabra.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const regex = new RegExp('\\b' + palabraNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        return regex.test(textoLower) || textoLower.includes(palabraNorm);
    });
}

// --- DEEZER API: DEBOUNCE, CACHE Y AUTOCOMPLETADO ---
const deezerCache = {};
let debounceTimer = null;
let selectedSong = null; // Objeto completo de la canción seleccionada

function debounce(fn, delay) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fn.apply(this, args), delay);
    };
}

async function buscarDeezer(query) {
    if (!query || query.length < 3) return [];

    // Revisar cache
    if (deezerCache[query]) return deezerCache[query];

    try {
        // Usamos un proxy CORS para evitar bloqueos desde el navegador
        const url = `https://corsproxy.io/?${encodeURIComponent('https://api.deezer.com/search?q=' + encodeURIComponent(query) + '&limit=5')}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Error en API');
        const json = await resp.json();
        const resultados = (json.data || []).map(track => ({
            nombre: track.title,
            artista: track.artist?.name || '',
            deezer_id: track.id,
            preview: track.preview,
            album_cover: track.album?.cover_small || ''
        }));
        // Guardar en cache
        deezerCache[query] = resultados;
        return resultados;
    } catch (err) {
        console.warn('Deezer API error (modo manual disponible):', err);
        return []; // Fallback: se permite agregar manualmente
    }
}

function mostrarSugerencias(resultados, container) {
    container.innerHTML = '';
    if (!resultados.length) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';
    resultados.forEach(r => {
        const item = document.createElement('div');
        item.className = 'deezer-suggestion';
        item.innerHTML = `
            ${r.album_cover ? `<img src="${r.album_cover}" alt="cover" class="deezer-cover">` : ''}
            <div class="deezer-info">
                <strong>${r.nombre}</strong>
                <span>${r.artista}</span>
            </div>
        `;
        item.addEventListener('click', () => {
            document.getElementById('songName').value = r.nombre;
            document.getElementById('artistName').value = r.artista;
            selectedSong = r;
            actualizarEstadoBotonAgregar();
            container.style.display = 'none';
        });
        container.appendChild(item);
    });
}

function initAutocompletado() {
    const songInput = document.getElementById('songName');
    const artistInput = document.getElementById('artistName');
    const addSongBtn = document.getElementById('addSongBtn');
    if (!songInput) return;

    let suggestionsContainer = document.getElementById('deezerSuggestions');
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'deezerSuggestions';
        suggestionsContainer.className = 'deezer-suggestions';
        songInput.parentNode.insertBefore(suggestionsContainer, songInput.nextSibling);
    }

    const buscarConDebounce = debounce(async (query) => {
        const resultados = await buscarDeezer(query);
        mostrarSugerencias(resultados, suggestionsContainer);
    }, 400);

    songInput.addEventListener('input', () => {
        // Si el usuario escribe después de seleccionar, resetea selectedSong
        if (selectedSong) {
            selectedSong = null;
            if (artistInput) artistInput.value = '';
            actualizarEstadoBotonAgregar();
        }
        const val = songInput.value.trim();
        if (val.length < 3) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        buscarConDebounce(val);
    });

    // Cerrar sugerencias al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!songInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // El botón inicia desactivado
    actualizarEstadoBotonAgregar();
}

function actualizarEstadoBotonAgregar() {
    const addSongBtn = document.getElementById('addSongBtn');
    if (!addSongBtn) return;
    addSongBtn.disabled = !selectedSong;
}

// --- FUNCIONES DE STATUS Y STORAGE (sin cambios) ---

function showStatus(msg, isError = false) {
    const st = document.getElementById('status');
    if (st) {
        st.textContent = msg;
        st.style.color = isError ? '#ff7676' : '#9bf4ff';
    }
}

function getStorage(key) { 
    try { 
        return JSON.parse(localStorage.getItem(key)) || []; 
    } catch { 
        return []; 
    } 
}

function setStorage(key, val) { 
    localStorage.setItem(key, JSON.stringify(val)); 
}

// --- FETCH Y RENDER (sin cambios funcionales) ---

async function fetchSongs() {
    try {
        const { data, error } = await supabaseClient
            .from('canciones')
            .select('*')
            .order('votos', { ascending: false });
        
        if (error) throw error;
        renderSongs(data || []);
    } catch (err) {
        console.error('fetchSongs error:', err);
        showStatus(`No se pudo cargar canciones: ${err.message || err}`, true);
    }
}

function renderSongs(songs) {
    const voted = getStorage(STORAGE_KEY_VOTED);
    const list = document.getElementById('songList');
    
    if (!list) return;
    
    list.innerHTML = '';
    
    if (!songs.length) { 
        list.innerHTML = '<div style="color:#a5c9ff">No hay canciones aún.</div>'; 
        return; 
    }
    
    songs.forEach((s, i) => {
        const item = document.createElement('div'); 
        item.className = 'song-item';
        item.innerHTML = `
            <div class="song-meta">
                <div><strong>#${i + 1} ${s.nombre}</strong></div>
                <div>${s.artista}</div>
            </div>
            <div class="song-vote">
                <span>${s.votos} votos</span>
                <button ${voted.some(v => v.id === s.id) ? 'disabled' : ''}>
                    ${voted.some(v => v.id === s.id) ? 'Ya votaste' : 'Votar'}
                </button>
            </div>
        `;
        
        const btn = item.querySelector('button');
        btn.onclick = () => voteSong(s.id, s.nombre, s.artista, btn);
        
        list.appendChild(item);
    });
}

// --- VOTAR CANCIÓN (sin cambios) ---

async function voteSong(id, nombre, artista, btn) {
    try {
        const voted = getStorage(STORAGE_KEY_VOTED);
        if (voted.some(v => v.id === id)) { 
            showStatus('Ya votaste esta canción', true); 
            return; 
        }
        const { data, error: fetchError } = await supabaseClient
            .from('canciones')
            .select('votos')
            .eq('id', id)
            .single();
        if (fetchError) throw fetchError;
        const votosActuales = data?.votos ?? 1;
        const { error: updateError } = await supabaseClient
            .from('canciones')
            .update({ votos: votosActuales + 1 })
            .eq('id', id);
        if (updateError) throw updateError;
        voted.push({ id }); 
        setStorage(STORAGE_KEY_VOTED, voted);
        btn.disabled = true; 
        btn.textContent = 'Ya votaste'; 
        showStatus(`Votaste ${nombre}`);
        fetchSongs();
    } catch (err) {
        console.error('voteSong error:', err);
        showStatus(`Error votando: ${err.message || err}`, true);
    }
}

// --- AGREGAR CANCIÓN (MEJORADA con filtro + deezer_id) ---

async function addSong() {
    try {
        // 1. Validar selección obligatoria
        if (!selectedSong) {
            showStatus('⚠️ Debes seleccionar una canción válida de la lista', true);
            return;
        }
        const nombre = selectedSong.nombre;
        const artista = selectedSong.artista;

        // 2. Filtro de palabras prohibidas
        if (contienePalabrasProhibidas(nombre) || contienePalabrasProhibidas(artista)) {
            showStatus('⚠️ Contenido inapropiado detectado. Intenta de nuevo.', true);
            return;
        }

        // 3. Verificar límite de canciones agregadas
        let added = getStorage(STORAGE_KEY_ADDED);
        if (added.length >= MAX_ADDED_SONGS) {
            showStatus('Máximo 3 canciones añadidas', true);
            return;
        }

        // 4. Buscar duplicados por deezer_id
        const { data: existente, error: errBusca } = await supabaseClient
            .from('canciones')
            .select('*')
            .eq('deezer_id', selectedSong.deezer_id)
            .limit(1);

        if (errBusca) throw errBusca;

        if (existente && existente.length) {
            // Ya existe → sumar voto
            const ex = existente[0];
            const { error: updateError } = await supabaseClient
                .from('canciones')
                .update({ votos: ex.votos + 1 })
                .eq('id', ex.id);
            if (updateError) throw updateError;
            showStatus('Canción existe: +1 voto');
        } else {
            // No existe → insertar con deezer_id
            const { error: insertError } = await supabaseClient
                .from('canciones')
                .insert([{ nombre, artista, votos: 1, deezer_id: selectedSong.deezer_id }]);
            if (insertError) throw insertError;
            added.push({ nombre, artista, date: Date.now() });
            setStorage(STORAGE_KEY_ADDED, added);
            showStatus('✅ Canción agregada');
        }

        // Limpiar inputs y reset
        document.getElementById('songName').value = '';
        document.getElementById('artistName').value = '';
        selectedSong = null;
        actualizarEstadoBotonAgregar();
        const suggestionsEl = document.getElementById('deezerSuggestions');
        if (suggestionsEl) suggestionsEl.style.display = 'none';
        fetchSongs();
    } catch (err) {
        console.error('addSong error:', err);
        showStatus(`Error agregando canción: ${err.message || err}`, true);
    }
}

// ========================== 
//  INITIALIZATION           
// ========================== 

document.addEventListener('DOMContentLoaded', function() {
    // Initialize countdown
    updateCountdown();
    setInterval(updateCountdown, 1000);
    
    // Initialize attendee counter
    initAttendeeCounter();
    
    // Initialize song request feature
    const addSongBtn = document.getElementById('addSongBtn');
    if (addSongBtn) {
        addSongBtn.addEventListener('click', addSong);
    }
    
    // Initialize Deezer autocompletado
    initAutocompletado();
    
    // Fetch initial songs and refresh every 5 seconds
    fetchSongs();
    setInterval(fetchSongs, 5000);
});
