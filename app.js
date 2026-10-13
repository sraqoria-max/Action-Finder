// =========================================================
// Action Finder - Main Dashboard Application Logic
// Full-Image-Wise Computer Vision & Real-Time Action Detection
// =========================================================

// ===== State =====
let detector = null;
let webcamStream = null;
let isRunning = false;
let showVisualHUD = true;
let isMirrored = true;
let isCameraStarting = false;
let isProcessingFrame = false;
let detectionCount = 0;
let lastFpsTime = Date.now();
let frameCount = 0;
let currentFps = 0;
let detectionHistory = [];
let currentAction = null;
let screenshotDataUrl = null;
let activeCategory = 'all';

// ===== DOM Elements =====
const video = document.getElementById('webcam');
const canvas = document.getElementById('poseCanvas');
const ctx = canvas.getContext('2d');

// ===== Auth Check =====
function getUser() {
    try {
        const user = localStorage.getItem('actionFinder_user') || sessionStorage.getItem('actionFinder_user');
        if (user) return JSON.parse(user);
    } catch (e) {}
    
    try {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const parts = cookies[i].split('=');
            if (parts[0].trim() === 'actionFinder_user') {
                return JSON.parse(decodeURIComponent(parts[1]));
            }
        }
    } catch (e) {}
    
    try {
        if (window.name && window.name.startsWith("actionFinder_user:")) {
            return JSON.parse(window.name.substring("actionFinder_user:".length));
        }
    } catch (e) {}
    
    return null;
}

function checkAuthentication() {
    let user = getUser();
    if (!user) {
        // Auto-assign Guest user to ensure instant access without requiring login
        user = { username: 'Guest', isGuest: true, loginTime: new Date().toISOString() };
        try {
            sessionStorage.setItem('actionFinder_user', JSON.stringify(user));
        } catch (e) {}
    }
    return user;
}

function handleLogout() {
    try {
        localStorage.removeItem('actionFinder_user');
        sessionStorage.removeItem('actionFinder_user');
    } catch (e) {}
    
    try {
        document.cookie = "actionFinder_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch (e) {}
    
    try {
        if (window.name.startsWith("actionFinder_user:")) {
            window.name = "";
        }
    } catch (e) {}
    
    window.location.href = 'index.html';
}

// ===== Initialize =====
async function init() {
    const user = checkAuthentication();
    if (!user) return;

    // Set user name
    document.getElementById('userName').textContent = user.username || 'User';

    // Populate actions list
    populateActionsGrid();
    populateCategoryFilters();

    // Initialize full-image detector
    updateStatus('Loading AI Vision Engine...', 'loading');
    detector = new ActionDetector();
    
    const success = await detector.initialize((progress) => {
        const loadingBar = document.getElementById('loadingBar');
        if (loadingBar) loadingBar.style.width = progress + '%';
    });

    if (success) {
        updateStatus('AI Vision Ready - Starting Camera', 'loading');
        await startCamera();
    } else {
        updateStatus('Initialization Failed', 'error');
        document.getElementById('cameraLoading').innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <p style="font-size: 48px; margin-bottom: 16px;">⚠️</p>
                <h3 style="font-family: Outfit; font-size: 18px; margin-bottom: 8px;">AI Vision Engine Failed to Load</h3>
                <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin-bottom: 16px;">Please refresh the page to retry.</p>
                <button onclick="location.reload()" style="padding: 10px 24px; background: #6C63FF; border: none; border-radius: 10px; color: white; font-size: 14px; cursor: pointer;">
                    🔄 Retry
                </button>
            </div>
        `;
    }
}

// ===== Camera =====
async function startCamera() {
    if (isCameraStarting) return;
    isCameraStarting = true;

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("navigator.mediaDevices.getUserMedia is not supported on this browser context.");
        }

        // Stop any existing tracks
        if (webcamStream) {
            webcamStream.getTracks().forEach(t => t.stop());
            webcamStream = null;
        }

        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });

        video.srcObject = webcamStream;

        let hasStartedLoop = false;
        const checkVideoLoad = () => {
            if (hasStartedLoop) return true;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                hasStartedLoop = true;
                video.play().then(() => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    // Hide loading overlay
                    const camLoading = document.getElementById('cameraLoading');
                    if (camLoading) camLoading.classList.add('hidden');
                    const camPerm = document.getElementById('cameraPermission');
                    if (camPerm) camPerm.style.display = 'none';

                    updateStatus('Detecting Actions (AI Pose)', 'active');
                    
                    const camBtn = document.getElementById('toggleCameraBtn');
                    if (camBtn) {
                        camBtn.classList.add('active');
                        document.getElementById('cameraIcon').textContent = '📹';
                        document.getElementById('cameraLabel').textContent = 'Camera On';
                    }

                    isRunning = true;
                    isCameraStarting = false;
                    requestAnimationFrame(detectionLoop);
                }).catch(e => {
                    console.error("Video play failed:", e);
                    isCameraStarting = false;
                });
                return true;
            }
            return false;
        };

        if (!checkVideoLoad()) {
            video.onloadedmetadata = checkVideoLoad;
            video.onloadeddata = checkVideoLoad;
            setTimeout(() => {
                if (!hasStartedLoop) checkVideoLoad();
            }, 800);
        }
    } catch (error) {
        console.error('Camera access failed:', error);
        isCameraStarting = false;
        document.getElementById('cameraLoading').style.display = 'none';
        
        const permContainer = document.getElementById('cameraPermission');
        let title = 'Camera Access Blocked';
        let titleML = 'ക്യാമറ ആക്‌സസ് അനുവദിക്കുക';
        let instructions = '';

        if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            title = 'Camera Already In Use (Another Tab or App)';
            titleML = 'ക്യാമറ മറ്റൊരു ടാബ് അല്ലെങ്കിൽ ആപ്പ് ഉപയോഗിക്കുന്നു';
            instructions = `
                <div style="text-align: left; background: rgba(239, 68, 68, 0.15); padding: 14px 18px; border-radius: 12px; margin: 12px auto; font-size: 13px; line-height: 1.6; max-width: 460px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <p style="font-weight: 700; color: #F87171; margin-bottom: 6px;">⚠️ Your browser permission is already ON, but the camera is locked!</p>
                    <ol style="margin-left: 18px; color: rgba(255,255,255,0.9);">
                        <li>You likely have <strong>another tab of Action Finder open</strong> in this browser.</li>
                        <li><strong>Close any other open tabs</strong> of Action Finder.</li>
                        <li>Check if Zoom, Teams, Google Meet, or Discord is open in the background.</li>
                        <li>Click <strong>Try Again</strong> below once duplicate tabs are closed.</li>
                    </ol>
                </div>
            `;
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            title = 'Camera Permission Blocked';
            titleML = 'ക്യാമറ അനുമതി അനുവദിക്കുക';
            instructions = `
                <div style="text-align: left; background: rgba(0,0,0,0.4); padding: 14px 18px; border-radius: 12px; margin: 12px auto; font-size: 13px; line-height: 1.6; max-width: 440px; border: 1px solid rgba(255,255,255,0.1);">
                    <p style="font-weight: 600; color: #FF6B9D; margin-bottom: 6px;">How to allow camera access:</p>
                    <ol style="margin-left: 18px; color: rgba(255,255,255,0.85);">
                        <li>Click the <strong>🔒 / ⚙️ icon</strong> next to the URL in your browser address bar.</li>
                        <li>Toggle <strong>Camera</strong> permission to <strong>Allow</strong>.</li>
                        <li>Click <strong>Try Again</strong> or reload the page.</li>
                    </ol>
                </div>
            `;
        } else {
            title = 'Camera Not Available';
            titleML = 'ക്യാമറ ലഭ്യമല്ല';
            instructions = `
                <div style="text-align: left; background: rgba(0,0,0,0.4); padding: 14px 18px; border-radius: 12px; margin: 12px auto; font-size: 13px; line-height: 1.6; max-width: 440px; border: 1px solid rgba(255,255,255,0.1);">
                    <p style="color: rgba(255,255,255,0.85);">${error.message || 'Please connect or enable your webcam and click Try Again.'}</p>
                </div>
            `;
        }

        permContainer.innerHTML = `
            <div class="permission-icon" style="font-size: 36px; margin-bottom: 8px;">📷</div>
            <h3 style="font-size: 18px; margin-bottom: 4px; color: #FFFFFF;">${title}</h3>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 6px;">${titleML}</p>
            ${instructions}
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
                <button class="permission-btn" onclick="startCamera()" style="padding: 10px 20px; background: #6C63FF; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    🔄 Try Again
                </button>
                <button onclick="location.reload()" style="padding: 10px 20px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; font-weight: 600; cursor: pointer;">
                    🔄 Reload Page
                </button>
            </div>
        `;

        permContainer.style.display = 'flex';
        updateStatus(title, 'error');
    }
}

// Clean up camera stream when user leaves or closes tab
window.addEventListener('beforeunload', () => {
    if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
    }
});
window.addEventListener('pagehide', () => {
    if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
    }
});

function toggleCamera() {
    const btn = document.getElementById('toggleCameraBtn');
    if (isRunning) {
        isRunning = false;
        if (webcamStream) {
            webcamStream.getTracks().forEach(t => t.stop());
            webcamStream = null;
        }
        video.srcObject = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        btn.classList.remove('active');
        document.getElementById('cameraIcon').textContent = '📹';
        document.getElementById('cameraLabel').textContent = 'Camera Off';
        updateStatus('Camera Paused', 'loading');
    } else {
        btn.classList.add('active');
        document.getElementById('cameraIcon').textContent = '📹';
        document.getElementById('cameraLabel').textContent = 'Camera On';
        startCamera();
    }
}

// Toggle Visual HUD overlay
function toggleVisualHUD() {
    showVisualHUD = !showVisualHUD;
    const btn = document.getElementById('toggleSkeletonBtn');
    const canvasEl = document.getElementById('poseCanvas');
    
    if (showVisualHUD) {
        btn.classList.add('active');
        canvasEl.classList.remove('hidden');
    } else {
        btn.classList.remove('active');
        canvasEl.classList.add('hidden');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}
const toggleSkeleton = toggleVisualHUD;

// Toggle Debug Telemetry HUD
let showDebugHud = true;
function toggleDebugHud() {
    showDebugHud = !showDebugHud;
    const hudEl = document.getElementById('debugHud');
    const btn = document.getElementById('toggleDebugBtn');
    if (hudEl) {
        hudEl.classList.toggle('hidden', !showDebugHud);
    }
    if (btn) {
        btn.classList.toggle('active', showDebugHud);
    }
}

function toggleMirror() {
    isMirrored = !isMirrored;
    const btn = document.getElementById('toggleMirrorBtn');
    
    if (isMirrored) {
        video.classList.remove('no-mirror');
        canvas.classList.remove('no-mirror');
        btn.classList.add('active');
    } else {
        video.classList.add('no-mirror');
        canvas.classList.add('no-mirror');
        btn.classList.remove('active');
    }
}

// ===== Detection State =====
let pendingAction = null;
let pendingActionFrames = 0;
let lastConfirmedAction = null;
let lastActionChangeTime = 0;
let emptyFramesCount = 0;
const CONFIRM_FRAMES = 2;          // Fast confirmation (~60ms)
const RELEASE_FRAMES = 5;          // Clear after 5 idle frames
const ACTION_SWITCH_COOLDOWN = 180; // Smooth transition between actions

// ===== Detection Loop (Non-blocking & Real-time) =====
async function detectionLoop() {
    if (!isRunning) return;

    // Process frame if detector is ready and not already busy
    if (!isProcessingFrame && video.readyState >= 2) {
        isProcessingFrame = true;

        try {
            // Full 3D hand landmark analysis
            const visual = await detector.detectVisualFrame(video, isMirrored);

            if (visual) {
                // Render modern cyberpunk hand skeleton overlay
                if (showVisualHUD) {
                    detector.drawVisualHUD(ctx, visual, canvas.width, canvas.height, currentAction);
                }

                // Classify action from hand landmarks & kinematics
                const action = detector.classifyAction(visual);

                // Update real-time Debug Information HUD
                updateDebugHudUI(detector.debugTelemetry, action);

                if (action && action.id !== 0) {
                    // Valid Hand Action detected!
                    emptyFramesCount = 0;

                    if (pendingAction && pendingAction.id === action.id) {
                        pendingActionFrames++;
                    } else {
                        pendingAction = action;
                        pendingActionFrames = 1;
                    }

                    if (pendingActionFrames >= CONFIRM_FRAMES) {
                        const now = Date.now();
                        const isSameAction = lastConfirmedAction && lastConfirmedAction.id === action.id;
                        const cooldownElapsed = (now - lastActionChangeTime) >= ACTION_SWITCH_COOLDOWN;

                        if (isSameAction || cooldownElapsed) {
                            if (!isSameAction) {
                                lastActionChangeTime = now;
                            }
                            lastConfirmedAction = action;
                            updateDetectedAction(action);
                        }
                    }

                    // Update stats
                    const confPct = Math.round((action.confidence || 0.88) * 100);
                    const keypointsEl = document.getElementById('keypointsValue');
                    if (keypointsEl) keypointsEl.textContent = `${confPct}%`;
                    const stateEl = document.getElementById('actionStateValue');
                    if (stateEl) stateEl.textContent = 'Active';
                } else {
                    // No Action condition
                    emptyFramesCount++;
                    pendingAction = null;
                    pendingActionFrames = 0;
                    if (emptyFramesCount > RELEASE_FRAMES) {
                        lastConfirmedAction = null;
                        showNoActionState();
                    }
                }
            }
        } catch (err) {
            console.error("Error in hand detection loop:", err);
        } finally {
            isProcessingFrame = false;
        }
    }

    // FPS counter (smooth and accurate)
    frameCount++;
    const now = Date.now();
    if (now - lastFpsTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsTime = now;
        document.getElementById('fpsValue').textContent = currentFps;
    }

    if (isRunning) {
        requestAnimationFrame(detectionLoop);
    }
}

// ===== Update Debug Information Telemetry HUD =====
function updateDebugHudUI(telemetry, action) {
    if (!telemetry) return;

    const handsCountEl = document.getElementById('dbgHandsCount');
    if (handsCountEl) handsCountEl.textContent = telemetry.handsCount || 0;

    const leftPresentEl = document.getElementById('dbgLeftPresent');
    if (leftPresentEl) {
        leftPresentEl.textContent = telemetry.leftPresent ? 'YES' : 'NO';
        leftPresentEl.style.color = telemetry.leftPresent ? '#4ADE80' : 'rgba(255,255,255,0.4)';
    }

    const rightPresentEl = document.getElementById('dbgRightPresent');
    if (rightPresentEl) {
        rightPresentEl.textContent = telemetry.rightPresent ? 'YES' : 'NO';
        rightPresentEl.style.color = telemetry.rightPresent ? '#4ADE80' : 'rgba(255,255,255,0.4)';
    }

    // Finger States
    const setFingerState = (id, state) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = state;
        let cls = 'dbg-state ';
        if (state === 'Extended') cls += 'ext';
        else if (state === 'Folded') cls += 'fold';
        else if (state === 'Partially Extended') cls += 'part';
        else cls += 'unk';
        el.className = cls;
    };

    if (telemetry.fingerStates) {
        setFingerState('dbgThumb', telemetry.fingerStates.thumb);
        setFingerState('dbgIndex', telemetry.fingerStates.index);
        setFingerState('dbgMiddle', telemetry.fingerStates.middle);
        setFingerState('dbgRing', telemetry.fingerStates.ring);
        setFingerState('dbgPinky', telemetry.fingerStates.pinky);
    }

    const palmOrientEl = document.getElementById('dbgPalmOrientation');
    if (palmOrientEl) palmOrientEl.textContent = telemetry.palmOrientation || 'None';

    const handPosEl = document.getElementById('dbgHandPosition');
    if (handPosEl) handPosEl.textContent = telemetry.handPosition || 'None';

    const candEl = document.getElementById('dbgCandidate');
    if (candEl) candEl.textContent = telemetry.candidate || 'None';

    const confEl = document.getElementById('dbgConfirmed');
    if (confEl) confEl.textContent = (action && action.id !== 0) ? action.en : 'No Action';

    const stabilityEl = document.getElementById('dbgTemporalStability');
    if (stabilityEl) stabilityEl.textContent = telemetry.temporalStability || '0/3';

    const confPctEl = document.getElementById('dbgConfidence');
    if (confPctEl) confPctEl.textContent = `${telemetry.confidence || 0}%`;
}

// ===== Waiting State / No Action Detected =====
function showNoActionState() {
    currentAction = (typeof NO_ACTION !== 'undefined') ? NO_ACTION : { id: 0, en: 'No Action', ml: 'ആക്ഷൻ ഇല്ല', emoji: '⏸️' };
    
    const emojiEl = document.getElementById('actionEmoji');
    if (emojiEl) emojiEl.textContent = '⏸️';
    
    const mlEl = document.getElementById('actionMalayalam');
    if (mlEl) mlEl.textContent = 'ആക്ഷൻ ഇല്ല';

    const englishEl = document.getElementById('actionEnglish');
    if (englishEl) englishEl.textContent = 'No Action';
    
    const stateEl = document.getElementById('actionStateValue');
    if (stateEl) stateEl.textContent = 'No Action';
    
    const keypointsEl = document.getElementById('keypointsValue');
    if (keypointsEl) keypointsEl.textContent = '0%';

    highlightActionBookCard(0);
}

const showNoPersonState = showNoActionState;
const showWaitingState = showNoActionState;

// ===== Update Detected Action =====
let lastLoggedActionId = null;

function updateDetectedAction(action) {
    currentAction = action;

    // Display BOTH Malayalam and English
    const emojiEl = document.getElementById('actionEmoji');
    if (emojiEl) emojiEl.textContent = action.emoji;
    
    const mlEl = document.getElementById('actionMalayalam');
    if (mlEl) mlEl.textContent = action.ml;

    const englishEl = document.getElementById('actionEnglish');
    if (englishEl) englishEl.textContent = action.en;

    const stateEl = document.getElementById('actionStateValue');
    if (stateEl) stateEl.textContent = 'Active';

    // Highlight the card in the Action Book!
    highlightActionBookCard(action.id);

    // Add to history ONLY for valid 20 hand actions (NEVER log "No Action")
    if (action.id !== 0 && lastLoggedActionId !== action.id) {
        lastLoggedActionId = action.id;
        detectionCount++;
        const detEl = document.getElementById('detectionsValue');
        if (detEl) detEl.textContent = detectionCount;
        addToHistory(action);
    }
}

// Highlight the active card in the Action Book
let lastHighlightedCardId = null;
function highlightActionBookCard(actionId) {
    if (lastHighlightedCardId && lastHighlightedCardId !== actionId) {
        const prevCard = document.getElementById(`actionCard_${lastHighlightedCardId}`);
        if (prevCard) {
            prevCard.classList.remove('active-gesture');
            const statusPill = prevCard.querySelector('.action-item-status-pill');
            if (statusPill) {
                statusPill.classList.remove('live');
                statusPill.innerHTML = '👁️ View Guide';
            }
        }
    }

    if (actionId > 0) {
        const activeCard = document.getElementById(`actionCard_${actionId}`);
        if (activeCard) {
            activeCard.classList.add('active-gesture');
            const statusPill = activeCard.querySelector('.action-item-status-pill');
            if (statusPill) {
                statusPill.classList.add('live');
                statusPill.innerHTML = '🟢 ACTIVE NOW';
            }
        }
        lastHighlightedCardId = actionId;
    } else {
        lastHighlightedCardId = null;
    }
}

// ===== History =====
function addToHistory(action) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const entry = {
        ...action,
        time: timeStr,
        timestamp: now.getTime()
    };

    detectionHistory.unshift(entry);
    if (detectionHistory.length > 50) detectionHistory.pop();

    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('historyList');
    
    if (detectionHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📹</span>
                <p>Start the camera to detect actions</p>
                <p class="empty-sub">ആക്ഷനുകൾ തിരിച്ചറിയാൻ ക്യാമറ ആരംഭിക്കുക</p>
            </div>
        `;
        return;
    }

    container.innerHTML = detectionHistory.map((entry, idx) => `
        <div class="history-item" style="animation-delay: ${idx * 0.05}s" onclick="openActionDetailModal(${entry.id})">
            <span class="history-emoji">${entry.emoji}</span>
            <div class="history-info">
                <span class="history-malayalam">${entry.ml}</span>
                <span class="history-english">${entry.en}</span>
            </div>
            <span class="history-time">${entry.time}</span>
        </div>
    `).join('');
}

function clearHistory() {
    detectionHistory = [];
    detectionCount = 0;
    lastLoggedActionId = null;
    document.getElementById('detectionsValue').textContent = '0';
    renderHistory();
}

// ===== Registered Action Book Grid =====
function populateActionsGrid(filterCategory = 'all') {
    const container = document.getElementById('actionsGrid');
    const actions = filterCategory === 'all' ? ACTIONS : ACTIONS.filter(a => a.category === filterCategory);
    
    const countEl = document.getElementById('actionCount');
    if (countEl) countEl.textContent = `${actions.length} Registered Actions`;

    container.innerHTML = actions.map(action => {
        const cat = ACTION_CATEGORIES[action.category] || { name: 'Action', color: '#6C63FF' };
        const isCurrent = currentAction && currentAction.id === action.id;

        return `
            <div class="action-item ${isCurrent ? 'active-gesture' : ''}" id="actionCard_${action.id}" onclick="openActionDetailModal(${action.id})">
                <div class="action-item-top">
                    <span class="action-item-num">#${action.id < 10 ? '0' + action.id : action.id}</span>
                    <span class="action-item-cat" style="background: ${cat.color}20; color: ${cat.color}; border: 1px solid ${cat.color}40;">${cat.name}</span>
                </div>
                <div class="action-item-main">
                    <span class="action-item-emoji">${action.emoji}</span>
                    <div class="action-item-names">
                        <span class="action-item-ml">${action.ml}</span>
                        <span class="action-item-en">${action.en}</span>
                    </div>
                </div>
                <p class="action-item-howto">${action.howToML || action.howTo}</p>
                <div class="action-item-footer">
                    <span class="action-item-status-pill ${isCurrent ? 'live' : ''}">
                        ${isCurrent ? '🟢 ACTIVE NOW' : '👁️ View Landmark Guide'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function populateCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    let html = `<button class="category-chip active" data-cat="all" onclick="filterByCategory('all')">All Actions</button>`;
    
    for (const [key, cat] of Object.entries(ACTION_CATEGORIES)) {
        html += `<button class="category-chip" data-cat="${key}" onclick="filterByCategory('${key}')">${cat.nameML} (${cat.name})</button>`;
    }
    
    container.innerHTML = html;
}

function filterByCategory(category) {
    activeCategory = category;
    
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.cat === category);
    });
    
    populateActionsGrid(category);
}

// ===== Action Book Detail Modal =====
function openActionDetailModal(actionId) {
    const action = ACTIONS.find(a => a.id === actionId);
    if (!action) return;

    const cat = ACTION_CATEGORIES[action.category] || { name: 'Action', color: '#6C63FF' };

    document.getElementById('modalEmoji').textContent = action.emoji;
    document.getElementById('modalEnglish').textContent = action.en;
    document.getElementById('modalMalayalam').textContent = action.ml;
    document.getElementById('modalMeaning').textContent = action.meaning || action.ml;
    document.getElementById('modalHowToML').textContent = action.howToML || 'കൈപ്പത്തി ക്യാമറയ്ക്ക് നേരെ കാണിച്ച് ഈ ആംഗ്യം ചെയ്യുക.';
    document.getElementById('modalHowToEN').textContent = action.howTo || 'Perform this hand gesture clearly facing your camera.';
    document.getElementById('modalPostureML').textContent = action.postureML || 'വിരലുകൾ വ്യക്തമായി കാണിക്കുക.';
    document.getElementById('modalPostureEN').textContent = action.posture || 'Clear 21-point hand landmark alignment.';
    document.getElementById('modalCategory').textContent = cat.name;
    document.getElementById('modalCategory').style.color = cat.color;
    document.getElementById('modalNumber').textContent = `Action #${action.id} of ${ACTIONS.length}`;

    document.getElementById('actionDetailModal').style.display = 'flex';
}

function closeActionDetailModal() {
    document.getElementById('actionDetailModal').style.display = 'none';
}

// ===== Search =====
function searchActions() {
    const query = document.getElementById('searchInput').value.trim();
    const container = document.getElementById('searchResults');
    
    if (!query) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <p>Type to search actions</p>
                <p class="empty-sub">ഇംഗ്ലീഷിലോ മലയാളത്തിലോ തിരയുക</p>
            </div>
        `;
        return;
    }

    const results = filterActions(query);
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">😕</span>
                <p>No actions found for "${query}"</p>
                <p class="empty-sub">മറ്റൊരു വാക്ക് ഉപയോഗിച്ച് തിരയുക</p>
            </div>
        `;
        return;
    }

    container.innerHTML = results.map(action => {
        const cat = ACTION_CATEGORIES[action.category] || { name: 'Action', color: '#6C63FF' };
        return `
            <div class="action-item" onclick="openActionDetailModal(${action.id})">
                <div class="action-item-top">
                    <span class="action-item-num">#${action.id}</span>
                    <span class="action-item-cat" style="background: ${cat.color}20; color: ${cat.color};">${cat.name}</span>
                </div>
                <div class="action-item-main">
                    <span class="action-item-emoji">${action.emoji}</span>
                    <div class="action-item-names">
                        <span class="action-item-ml">${action.ml}</span>
                        <span class="action-item-en">${action.en}</span>
                    </div>
                </div>
                <p class="action-item-howto">${action.howToML || action.howTo}</p>
            </div>
        `;
    }).join('');
}

// ===== Tabs =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// ===== Screenshot =====
function takeScreenshot() {
    if (!video.srcObject) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw video
    if (isMirrored) {
        tempCtx.translate(tempCanvas.width, 0);
        tempCtx.scale(-1, 1);
    }
    tempCtx.drawImage(video, 0, 0);
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw visual HUD overlay
    if (showVisualHUD) {
        tempCtx.drawImage(canvas, 0, 0);
    }

    // Draw action label bar
    if (currentAction) {
        const padding = 20;
        const barHeight = 60;
        
        tempCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        tempCtx.fillRect(0, tempCanvas.height - barHeight, tempCanvas.width, barHeight);
        
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.font = 'bold 24px "Noto Sans Malayalam", sans-serif';
        tempCtx.fillText(`${currentAction.emoji} ${currentAction.ml}`, padding, tempCanvas.height - 24);
        
        tempCtx.font = '14px Inter, sans-serif';
        tempCtx.fillStyle = 'rgba(255,255,255,0.7)';
        tempCtx.fillText(currentAction.en, padding, tempCanvas.height - 8);
    }

    screenshotDataUrl = tempCanvas.toDataURL('image/png');
    
    document.getElementById('screenshotImage').src = screenshotDataUrl;
    document.getElementById('screenshotInfo').innerHTML = `
        <p><strong>Action:</strong> ${currentAction ? `${currentAction.emoji} ${currentAction.ml} (${currentAction.en})` : 'None detected'}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Confidence:</strong> ${currentAction ? Math.round(currentAction.confidence * 100) + '%' : 'N/A'}</p>
    `;
    document.getElementById('screenshotModal').style.display = 'flex';
}

function closeScreenshotModal() {
    document.getElementById('screenshotModal').style.display = 'none';
}

function downloadScreenshot() {
    if (!screenshotDataUrl) return;
    const link = document.createElement('a');
    link.download = `action-finder-${Date.now()}.png`;
    link.href = screenshotDataUrl;
    link.click();
}

// ===== Status =====
function updateStatus(text, state = 'loading') {
    const badge = document.getElementById('statusBadge');
    if (!badge) return;
    const dot = badge.querySelector('.status-dot');
    const textEl = badge.querySelector('.status-text');
    
    if (textEl) textEl.textContent = text;
    if (dot) {
        dot.className = 'status-dot';
        if (state === 'active') dot.classList.add('active');
        else if (state === 'error') dot.classList.add('error');
    }
}

// ===== Init on Load =====
document.addEventListener('DOMContentLoaded', init);

// Set initial button states
document.addEventListener('DOMContentLoaded', () => {
    const skeletonBtn = document.getElementById('toggleSkeletonBtn');
    if (skeletonBtn) skeletonBtn.classList.add('active');
    const mirrorBtn = document.getElementById('toggleMirrorBtn');
    if (mirrorBtn) mirrorBtn.classList.add('active');
    const debugBtn = document.getElementById('toggleDebugBtn');
    if (debugBtn) debugBtn.classList.add('active');
    const camBtn = document.getElementById('toggleCameraBtn');
    if (camBtn) camBtn.classList.add('active');
});
