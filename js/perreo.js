// ==========================
//  REYES DEL PERREO - VOTING SYSTEM
// ==========================


const STORAGE_KEY_PERREO = 'perreo_votes';
const MAX_PERREO_VOTES = 5;
const STORAGE_KEY_QR_UNLOCK = 'perreo_qr_unlocked';
let qrUnlocked = false;
let currentQrToken = null;

let participants = [];
let userIP = '';
let previousRey = null;
let previousReina = null;
let lastVotingEventId = null; // Para detectar cambio de ronda

// ==========================
//  UTILITIES
// ==========================

/** Sanitize text to prevent XSS */
function sanitize(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Get user's IP address */
async function getUserIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch {
        // Fallback: generate a unique ID stored locally
        let fallback = localStorage.getItem('perreo_fallback_ip');
        if (!fallback) {
            fallback = 'local_' + crypto.getRandomValues(new Uint32Array(1))[0];
            localStorage.setItem('perreo_fallback_ip', fallback);
        }
        return fallback;
    }
}


// ==========================
//  QR VOTING UNLOCK LOGIC
// ==========================

function isQrUnlockedForEvent(eventId) {
    // Save per event, so si cambia el evento, se requiere nuevo QR
    const unlocked = localStorage.getItem(STORAGE_KEY_QR_UNLOCK);
    if (!unlocked) return false;
    try {
        const obj = JSON.parse(unlocked);
        return obj && obj.eventId === eventId && obj.unlocked === true;
    } catch { return false; }
}

function setQrUnlocked(eventId) {
    localStorage.setItem(STORAGE_KEY_QR_UNLOCK, JSON.stringify({ eventId, unlocked: true }));
    qrUnlocked = true;
}

function resetQrUnlock() {
    localStorage.removeItem(STORAGE_KEY_QR_UNLOCK);
    qrUnlocked = false;
}

function getLocalVotes() {
    const stored = localStorage.getItem(STORAGE_KEY_PERREO);
    if (!stored) return [];
    try { return JSON.parse(stored); } catch { return []; }
}

function getRemainingVotes() {
    return Math.max(0, MAX_PERREO_VOTES - getLocalVotes().length);
}

function saveLocalVote(participantId) {
    const votes = getLocalVotes();
    votes.push({ participantId, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY_PERREO, JSON.stringify(votes));
}

// ==========================
//  FETCH PARTICIPANTS
// ==========================

async function fetchParticipants() {
    const { data, error } = await supabaseClient
        .from('participants')
        .select('*')
        .order('votes_count', { ascending: false });

    if (error) {
        console.error('Error fetching participants:', error);
        return;
    }

    participants = data || [];
    renderPodium();
    renderParticipants();
    updateVoteUI();
}

// ==========================
//  RENDER PODIUM
// ==========================

function renderPodium() {
    const reyes = participants.filter(p => p.category === 'rey');
    const reinas = participants.filter(p => p.category === 'reina');

    // Detect new Rey leader
    if (reyes.length > 0 && previousRey !== null && previousRey !== reyes[0].id) {
        showNewKingAnimation(reyes[0].name, 'rey');
    }
    if (reyes.length > 0) previousRey = reyes[0].id;

    // Detect new Reina leader
    if (reinas.length > 0 && previousReina !== null && previousReina !== reinas[0].id) {
        showNewKingAnimation(reinas[0].name, 'reina');
    }
    if (reinas.length > 0) previousReina = reinas[0].id;

    // Render each podium
    fillPodium('podiumRey', reyes.slice(0, 3));
    fillPodium('podiumReina', reinas.slice(0, 3));
}

function fillPodium(containerId, top3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const slots = container.querySelectorAll('.podium-slot');
    // Order in DOM: [2nd, 1st, 3rd] -> indices [1, 0, 2]
    const orderMap = [1, 0, 2];

    slots.forEach((el, domIdx) => {
        const idx = orderMap[domIdx];
        const p = top3[idx];
        const photoImg = el.querySelector('.podium-photo img');
        const nameEl = el.querySelector('.podium-name');
        const votesEl = el.querySelector('.podium-votes');

        if (p) {
            photoImg.src = p.photo_url || '';
            photoImg.alt = sanitize(p.name);
            nameEl.textContent = p.name;
            votesEl.textContent = p.votes_count + ' votos';
            el.style.opacity = '1';
        } else {
            photoImg.src = '';
            photoImg.alt = '';
            nameEl.textContent = '---';
            votesEl.textContent = '0 votos';
            el.style.opacity = '0.4';
        }
    });
}

// ==========================
//  RENDER PARTICIPANT CARDS
// ==========================

function renderParticipants() {
    const reyes = participants.filter(p => p.category === 'rey');
    const reinas = participants.filter(p => p.category === 'reina');

    renderGrid('participantsRey', reyes);
    renderGrid('participantsReina', reinas);
}

function renderGrid(gridId, list) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const remaining = getRemainingVotes();

    if (list.length === 0) {
        grid.innerHTML = '<div class="loading-spinner">Sin participantes aún...</div>';
        return;
    }

    grid.innerHTML = list.map((p, i) => `
        <div class="participant-card" data-id="${p.id}">
            <div class="card-rank">#${i + 1}</div>
            <div class="card-photo">
                <img src="${sanitize(p.photo_url || '')}" alt="${sanitize(p.name)}">
            </div>
            <h3 class="card-name">${sanitize(p.name)} ${p.category === 'reina' ? '👑' : '🔥'}</h3>
            <div class="card-info">
                ${p.age ? `<p><span> Edad:</span> ${sanitize(String(p.age))}</p>` : ''}
                ${p.school ? `<p><span> Escuela:</span> ${sanitize(p.school)}</p>` : ''}
                ${p.hobby ? `<p><span> Pasatiempo:</span> ${sanitize(p.hobby)}</p>` : ''}
                ${p.social ? `<p><span> Redes:</span> ${sanitize(p.social)}</p>` : ''}
            </div>
            <div class="card-votes">🔥 ${p.votes_count} votos</div>
            <button class="vote-btn" data-participant="${p.id}" ${remaining <= 0 ? 'disabled' : ''}>
                🔥 Votar
            </button>
        </div>
    `).join('');

    grid.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pid = Number(btn.getAttribute('data-participant'));
            handleVote(pid);
        });
    });
}

// ==========================
//  HANDLE VOTE (con evento de votación)
// ==========================

async function fetchActiveVotingEvent() {
    const { data, error } = await supabaseClient
        .from('voting_events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    if (error) {
        console.error('Error obteniendo evento activo:', error);
        return null;
    }
    // Si cambia el evento activo, limpia localStorage de votos y QR
    if (data && data.id && data.id !== lastVotingEventId) {
        localStorage.removeItem(STORAGE_KEY_PERREO);
        resetQrUnlock();
        lastVotingEventId = data.id;
    }
    currentQrToken = data.qr_token || null;
    return data;
}

async function handleVote(participantId) {
    // Bloqueo por QR
    const votingEvent = await fetchActiveVotingEvent();
    if (!votingEvent) {
        showAlert('No hay evento de votación activo', 'error');
        return;
    }
    const eventId = votingEvent.id;
    if (!isQrUnlockedForEvent(eventId)) {
        showAlert('Debes escanear el QR para votar', 'error');
        return;
    }
    const remaining = getRemainingVotes();
    if (remaining <= 0) {
        showAlert('❌ Ya usaste tus 5 votos', 'error');
        return;
    }
    // Disable all buttons during request
    document.querySelectorAll('.vote-btn').forEach(btn => btn.disabled = true);
    try {
        const { error: insertError } = await supabaseClient
            .from('votes_log')
            .insert([
                {
                    participant_id: participantId,
                    ip_address: userIP,
                    voting_event_id: eventId,
                    qr_validated: true
                }
            ]);
        if (insertError) {
            showAlert('❌ Error al votar. Intenta de nuevo.', 'error');
            updateVoteUI();
            return;
        }
        // Actualizar contador de votos del participante (forma segura)
        const { data: participant } = await supabaseClient
            .from('participants')
            .select('votes_count')
            .eq('id', participantId)
            .single();
        const originalCount = (participant && participant.votes_count != null) ? participant.votes_count : 0;
        const newCount = originalCount + 1;
        const { data: updateData, error: updateError } = await supabaseClient
            .from('participants')
            .update({ votes_count: newCount })
            .eq('id', participantId)
            .select();
        saveLocalVote(participantId);
        showAlert('✅ ¡Voto registrado! 🔥', 'success');
        updateVoteUI();
        await fetchParticipants();
    } catch (err) {
        showAlert('❌ Error de conexión. Intenta de nuevo.', 'error');
        updateVoteUI();
    }
}

// ==========================
//  UPDATE VOTE UI
// ==========================

function updateVoteUI() {
    const remaining = getRemainingVotes();
    const counterEl = document.getElementById('votesRemaining');
    if (counterEl) counterEl.textContent = remaining;
    // Bloqueo por QR
    const votingEvent = lastVotingEventId ? { id: lastVotingEventId } : null;
    let qrOk = true;
    if (votingEvent) {
        qrOk = isQrUnlockedForEvent(votingEvent.id);
    }
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.disabled = (remaining <= 0) || !qrOk;
    });
    // Mensaje de QR
    const qrStatusMsg = document.getElementById('qrStatusMsg');
    if (qrStatusMsg) {
        if (!qrOk) {
            qrStatusMsg.textContent = 'Debes escanear el QR para habilitar la votación.';
            qrStatusMsg.style.color = '#ff5252';
        } else {
            qrStatusMsg.textContent = '¡Votación desbloqueada!';
            qrStatusMsg.style.color = '#25d366';
        }
    }
}

// ==========================
//  ALERT MESSAGE
// ==========================

function showAlert(message, type) {
    const alertEl = document.getElementById('alertMessage');
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = 'alert-message ' + type;
    alertEl.style.display = 'block';
    clearTimeout(alertEl._timeout);
    alertEl._timeout = setTimeout(() => {
        alertEl.style.display = 'none';
    }, 3000);
}

// ==========================
//  NEW KING ANIMATION
// ==========================

function showNewKingAnimation(name, category) {
    const isReina = category === 'reina';
    const crownImg = isReina ? 'img/corona_reina.png' : 'img/corona_rey.png';
    const title = isReina ? '👑 Nueva Reina del Perreo 👑' : '🔥 Nuevo Rey del Perreo 🔥';
    const overlay = document.createElement('div');
    overlay.className = 'new-king-overlay';
    overlay.innerHTML = `
        <div class="new-king-content">
            <img src="${crownImg}" alt="Corona" class="crown-animation">
            <h2>${title}</h2>
            <p>${sanitize(name)}</p>
        </div>
    `;
    document.body.appendChild(overlay);

    // Trigger show animation
    requestAnimationFrame(() => {
        overlay.classList.add('show');
    });

    // Auto-dismiss
    setTimeout(() => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 500);
    }, 3500);
}

// ==========================
//  REAL-TIME SUBSCRIPTION
// ==========================

function setupRealtime() {
    supabaseClient
        .channel('perreo-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'participants'
        }, () => {
            fetchParticipants();
        })
        .subscribe();
}

// ==========================
//  MOBILE MENU
// ==========================

function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('open');
        toggle.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('open');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
}

// ==========================
//  INITIALIZATION
// ==========================

document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();
    // Show loading state
    const grid = document.getElementById('participantsGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner">Cargando participantes...</div>';
    // Get IP and fetch data
    userIP = await getUserIP();
    await fetchParticipants();
    setupRealtime();

    // QR Unlock logic
    let qrScanner = null;
    const scanBtn = document.getElementById('scanQrBtn');
    const qrModal = document.getElementById('qrModal');
    const closeQrModal = document.getElementById('closeQrModal');
    const qrReaderDiv = document.getElementById('qr-reader');
    const qrResults = document.getElementById('qr-reader-results');

    // Detectar si es móvil
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Cambiar texto del botón según dispositivo
    if (scanBtn) {
        scanBtn.textContent = isMobile() ? '🔓 Escanear QR para votar' : '🔓 Subir imagen QR para votar';
    }

    // Crear input file solo para PC (nunca en móvil)
    let fileInput = null;
    if (!isMobile()) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }

    // Helper: open/close modal
    function openQrModal() {
        qrModal.style.display = 'flex';
        qrResults.textContent = '';
        if (qrScanner) qrScanner.clear();
        if (isMobile()) {
            // Móvil: usar cámara SIEMPRE
            try {
                qrScanner = new Html5Qrcode('qr-reader');
                qrScanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: 250 },
                    async (decodedText) => {
                        const votingEvent = await fetchActiveVotingEvent();
                        if (!votingEvent || !votingEvent.qr_token) {
                            qrResults.textContent = 'No hay evento activo o QR configurado.';
                            return;
                        }
                        if (decodedText === votingEvent.qr_token) {
                            setQrUnlocked(votingEvent.id);
                            updateVoteUI();
                            qrResults.textContent = '✅ QR válido. ¡Votación desbloqueada!';
                            setTimeout(() => {
                                closeQrModalFunc();
                            }, 1200);
                        } else {
                            qrResults.textContent = '❌ QR incorrecto. Intenta de nuevo.';
                        }
                    },
                    (err) => {
                        qrResults.textContent = '❌ No se pudo acceder a la cámara. Permite el acceso o intenta en otro navegador.';
                    }
                );
            } catch (e) {
                qrResults.textContent = '❌ Error al inicializar la cámara. Permite el acceso o intenta en otro navegador.';
            }
        } else {
            // PC: subir imagen
            fileInput.value = '';
            fileInput.onchange = async (e) => {
                if (!fileInput.files || fileInput.files.length === 0) return;
                const file = fileInput.files[0];
                qrScanner = new Html5Qrcode('qr-reader');
                qrScanner.scanFile(file, true)
                    .then(async (decodedText) => {
                        const votingEvent = await fetchActiveVotingEvent();
                        if (!votingEvent || !votingEvent.qr_token) {
                            qrResults.textContent = 'No hay evento activo o QR configurado.';
                            return;
                        }
                        if (decodedText === votingEvent.qr_token) {
                            setQrUnlocked(votingEvent.id);
                            updateVoteUI();
                            qrResults.textContent = '✅ QR válido. ¡Votación desbloqueada!';
                            setTimeout(() => {
                                closeQrModalFunc();
                            }, 1200);
                        } else {
                            qrResults.textContent = '❌ QR incorrecto. Intenta de nuevo.';
                        }
                    })
                    .catch(() => {
                        qrResults.textContent = '❌ No se pudo leer el QR. Intenta con otra imagen.';
                    });
            };
            fileInput.click();
        }
    }
    function closeQrModalFunc() {
        qrModal.style.display = 'none';
        if (qrScanner) {
            qrScanner.stop().then(() => qrScanner.clear());
        }
    }
    if (scanBtn && qrModal && closeQrModal) {
        scanBtn.addEventListener('click', openQrModal);
        closeQrModal.addEventListener('click', closeQrModalFunc);
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) closeQrModalFunc();
        });
    }
    // Inicializa estado de QR
    await fetchActiveVotingEvent();
    updateVoteUI();
});
