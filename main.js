// --- STATE MANAGEMENT ---
let state = {
    sessionName: "Moderated Caucus: Topic Name",
    speakers: [],
    activeSpeakerId: null,
    defaultTime: 60, // seconds
};

let timerInterval = null;

// --- DOM ELEMENTS ---
const sessionNameInput = document.getElementById("sessionNameInput");
const activeCountryDisplay = document.getElementById("activeCountry");
const activeTimerDisplay = document.getElementById("activeTimer");
const mainStartStopBtn = document.getElementById("mainStartStopBtn");
const mainResetBtn = document.getElementById("mainResetBtn");
const newSpeakerInput = document.getElementById("newSpeakerInput");
const addSpeakerBtn = document.getElementById("addSpeakerBtn");
const speakerListBody = document.getElementById("speakerListBody");
const presetBtns = document.querySelectorAll(".preset-btn");
const clearAllDataBtn = document.getElementById("clearAllData");
const timerBeep = document.getElementById("timerBeep");

// Modal Elements
const settingsModal = document.getElementById("settingsModal");
const customTimeBtn = document.getElementById("customTimeBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const customMinutes = document.getElementById("customMinutes");
const customSeconds = document.getElementById("customSeconds");

// --- LOGIC ---

function saveState() {
    localStorage.setItem("mun_session_manager_v2", JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem("mun_session_manager_v2");
    if (saved) {
        state = JSON.parse(saved);
        sessionNameInput.value = state.sessionName;
    }
    renderSpeakerList();
    updateActiveDisplay();
}

function formatTime(seconds) {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return isNegative ? `-${timeStr}` : timeStr;
}

function updateActiveDisplay() {
    const activeSpeaker = state.speakers.find(s => s.id === state.activeSpeakerId);
    
    if (activeSpeaker) {
        activeCountryDisplay.textContent = activeSpeaker.name.toUpperCase();
        activeTimerDisplay.textContent = formatTime(activeSpeaker.remaining);
        mainStartStopBtn.textContent = activeSpeaker.isRunning ? "PAUSE" : "START";
        
        // Visual feedback for running
        if (activeSpeaker.isRunning) {
            activeTimerDisplay.style.color = "var(--gold)";
            activeCountryDisplay.style.opacity = "1";
        } else {
            activeTimerDisplay.style.color = "var(--text-primary)";
            activeCountryDisplay.style.opacity = "0.6";
        }

        // Overtime visual feedback
        if (activeSpeaker.remaining < 0) {
            activeTimerDisplay.style.color = "var(--danger)";
            activeTimerDisplay.classList.add("overtime-pulse");
        } else if (activeSpeaker.remaining === 0) {
            activeTimerDisplay.style.color = "var(--danger)";
            activeTimerDisplay.classList.remove("overtime-pulse");
        } else {
            activeTimerDisplay.classList.remove("overtime-pulse");
        }
    } else {
        activeCountryDisplay.textContent = "SELECT DELEGATE";
        activeTimerDisplay.textContent = "00:00";
        mainStartStopBtn.textContent = "START";
    }
}

function renderSpeakerList() {
    speakerListBody.innerHTML = "";
    
    state.speakers.forEach((speaker, index) => {
        const row = document.createElement("tr");
        row.className = `speaker-row ${speaker.id === state.activeSpeakerId ? 'active' : ''} ${speaker.isDone ? 'done' : ''}`;
        
        row.innerHTML = `
            <td>${speaker.name}</td>
            <td class="time-elapsed">${formatTime(speaker.elapsed)}</td>
            <td class="time-remaining">${formatTime(speaker.remaining)}</td>
            <td>
                <button class="move-btn" data-action="up" title="Move Up">↑</button>
                <button class="move-btn" data-action="down" title="Move Down">↓</button>
                <button class="tick-btn" title="Mark Done">✓</button>
                <button class="remove-btn" title="Remove">×</button>
            </td>
        `;

        // Row Click: Select Speaker (unless clicking buttons)
        row.addEventListener("click", (e) => {
            if (e.target.closest('button')) return;
            setActiveSpeaker(speaker.id);
        });

        // Reorder buttons logic
        row.querySelectorAll(".move-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const offset = btn.dataset.action === 'up' ? -1 : 1;
                reorderSpeaker(index, offset);
            });
        });

        // Done button logic
        row.querySelector(".tick-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            speaker.isDone = !speaker.isDone;
            if (speaker.isDone) speaker.isRunning = false;
            renderSpeakerList();
            updateActiveDisplay();
            saveState();
        });

        // Remove button logic
        row.querySelector(".remove-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            removeSpeaker(speaker.id);
        });

        speakerListBody.appendChild(row);
    });
}

function reorderSpeaker(index, offset) {
    const newIndex = index + offset;
    if (newIndex < 0 || newIndex >= state.speakers.length) return;
    
    // Swap elements
    const [movedItem] = state.speakers.splice(index, 1);
    state.speakers.splice(newIndex, 0, movedItem);
    
    renderSpeakerList();
    saveState();
}

function setActiveSpeaker(id) {
    // If we switch speakers, stop the previous one if it was running? 
    // Usually in MUN only one person speaks at a time.
    state.speakers.forEach(s => s.isRunning = false);
    
    state.activeSpeakerId = id;
    const active = state.speakers.find(s => s.id === id);
    if (active) {
        // If it was already finished, maybe reset to default? 
        // No, let the user decide.
    }
    
    updateActiveDisplay();
    renderSpeakerList();
    saveState();
}

function removeSpeaker(id) {
    state.speakers = state.speakers.filter(s => s.id !== id);
    if (state.activeSpeakerId === id) state.activeSpeakerId = null;
    renderSpeakerList();
    updateActiveDisplay();
    saveState();
}

function toggleTimer() {
    const active = state.speakers.find(s => s.id === state.activeSpeakerId);
    if (!active) {
        alert("Please select a country from the list first.");
        return;
    }

    active.isRunning = !active.isRunning;
    updateActiveDisplay();
    renderSpeakerList();
    saveState();
}

function resetTimer() {
    const active = state.speakers.find(s => s.id === state.activeSpeakerId);
    if (!active) return;

    active.remaining = state.defaultTime;
    active.elapsed = 0;
    active.isRunning = false;
    updateActiveDisplay();
    renderSpeakerList();
    saveState();
}

function startGlobalLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        let changed = false;
        
        state.speakers.forEach(s => {
            if (s.isRunning) {
                s.elapsed++;
                s.remaining--;
                
                // Play sound exactly at 0
                if (s.remaining === 0) {
                    try { 
                        timerBeep.currentTime = 0;
                        timerBeep.play(); 
                    } catch(e) { console.error("Audio error", e); }
                }
                changed = true;
            }
        });

        if (changed) {
            updateActiveDisplay();
            // We only update the list every second if something is running
            // Optimization: Only update the specific row if possible, but full render is fine for small lists
            renderSpeakerList();
            saveState();
        }
    }, 1000);
}

// --- EVENT LISTENERS ---

addSpeakerBtn.addEventListener("click", () => {
    const name = newSpeakerInput.value.trim();
    if (name) {
        const newSpeaker = {
            id: Date.now().toString(),
            name: name,
            elapsed: 0,
            remaining: state.defaultTime,
            isRunning: false,
            isDone: false
        };
        state.speakers.push(newSpeaker);
        newSpeakerInput.value = "";
        renderSpeakerList();
        saveState();
    }
});

newSpeakerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addSpeakerBtn.click();
});

function autoResizeTextarea(textarea) {
    // Save current scroll position
    const scrollPos = window.scrollY;
    
    // We used to set style.height = 'auto' here, but it causes flickering with transitions.
    // Instead, we explicitly check the scrollHeight with the base font size first.
    
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

    // Temp reset font to check lines
    textarea.style.fontSize = '1.6rem';
    let currentHeight = textarea.scrollHeight;

    if (currentHeight - padding > lineHeight * 4) {
        textarea.style.fontSize = '1.1rem';
    } else {
        textarea.style.fontSize = '1.6rem';
    }

    // Now update height
    textarea.style.height = 'auto'; // Necessary once to get true scrollHeight of content
    textarea.style.height = textarea.scrollHeight + 'px';
    
    // Restore scroll
    window.scrollTo(0, scrollPos);
}

sessionNameInput.addEventListener("input", () => {
    state.sessionName = sessionNameInput.value;
    autoResizeTextarea(sessionNameInput);
    saveState();
});

// Initial resize on load
window.addEventListener("load", () => {
    autoResizeTextarea(sessionNameInput);
});

mainStartStopBtn.addEventListener("click", toggleTimer);
mainResetBtn.addEventListener("click", resetTimer);

presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.id === "customTimeBtn") {
            settingsModal.classList.remove("hidden");
            return;
        }

        const seconds = parseInt(btn.dataset.time);
        state.defaultTime = seconds;
        
        presetBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        // Ask to update active speaker or all? 
        // For convenience, if there's an active speaker, update them.
        const active = state.speakers.find(s => s.id === state.activeSpeakerId);
        if (active) {
            active.remaining = seconds;
            updateActiveDisplay();
            renderSpeakerList();
        }
        saveState();
    });
});

saveSettingsBtn.addEventListener("click", () => {
    const mins = parseInt(customMinutes.value) || 0;
    const secs = parseInt(customSeconds.value) || 0;
    const total = (mins * 60) + secs;
    
    if (total > 0) {
        state.defaultTime = total;
        const active = state.speakers.find(s => s.id === state.activeSpeakerId);
        if (active) active.remaining = total;
        
        updateActiveDisplay();
        renderSpeakerList();
        saveState();
    }
    settingsModal.classList.add("hidden");
});

closeSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

clearAllDataBtn.addEventListener("click", () => {
    if (confirm("Clear all session data?")) {
        state.speakers = [];
        state.activeSpeakerId = null;
        renderSpeakerList();
        updateActiveDisplay();
        saveState();
    }
});

// --- INIT ---
function init() {
    loadState();
    startGlobalLoop();
    
    // Set max volume
    timerBeep.volume = 1.0;
    
    // Modern browsers block audio until FIRST interaction.
    // We attempt to "unlock" sound on first user click.
    const unlockAudio = () => {
        timerBeep.play().then(() => {
            timerBeep.pause(); // Just a quick play/pause to unlock
            timerBeep.currentTime = 0;
            document.removeEventListener("click", unlockAudio);
        }).catch(e => console.log("Audio unlock pending interaction..."));
    };
    document.addEventListener("click", unlockAudio);
    
    // Set active preset
    presetBtns.forEach(btn => {
        if (parseInt(btn.dataset.time) === state.defaultTime) {
            btn.classList.add("active");
        }
    });
}

init();
