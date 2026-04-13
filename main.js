// --- STATE MANAGEMENT ---
let state = {
    sessionName: "Moderated Caucus: Topic Name",
    speakers: [],
    activeSpeakerId: null,
    defaultTime: 60, // seconds
    undoHistory: [], // stores last 5 deleted speakers
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
const exportCsvBtn = document.getElementById("exportCsvBtn");
const clearAllDataBtn = document.getElementById("clearAllData");

// --- WEB AUDIO API (Robust Sound System) ---
const WebAudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function playChime(count, freq, startVolume) {
    if (!audioCtx) audioCtx = new WebAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const timeBetweenBeeps = 0.35; // seconds
    const duration = 0.6; // sustain before fadeout

    for (let i = 0; i < count; i++) {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * timeBetweenBeeps);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + i * timeBetweenBeeps);
        gainNode.gain.linearRampToValueAtTime(startVolume, audioCtx.currentTime + i * timeBetweenBeeps + 0.05); // quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * timeBetweenBeeps + duration); // smooth trail
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(audioCtx.currentTime + i * timeBetweenBeeps);
        osc.stop(audioCtx.currentTime + i * timeBetweenBeeps + duration);
    }
}

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
        const parsedState = JSON.parse(saved);
        // Merge with existing default state to ensure no properties like undoHistory are missing
        state = { ...state, ...parsedState };
        // Ensure critical properties are arrays just in case
        if (!state.speakers) state.speakers = [];
        if (!state.undoHistory) state.undoHistory = [];
        
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
        
        // Base opacity for country name
        activeCountryDisplay.style.opacity = activeSpeaker.isRunning ? "1" : "0.6";
        
        // Color logic based on time & running state
        activeTimerDisplay.classList.remove("overtime-pulse");
        
        if (activeSpeaker.remaining < 0) {
            activeTimerDisplay.style.color = "var(--danger)";
            activeTimerDisplay.classList.add("overtime-pulse");
        } else if (activeSpeaker.remaining === 0) {
            activeTimerDisplay.style.color = "var(--danger)";
        } else if (activeSpeaker.remaining <= 15) {
            activeTimerDisplay.style.color = "var(--warning)";
        } else {
            activeTimerDisplay.style.color = activeSpeaker.isRunning ? "var(--gold)" : "var(--text-primary)";
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
    const speakerToRemove = state.speakers.find(s => s.id === id);
    if (speakerToRemove) {
        // Save to undo history (limit 5)
        state.undoHistory.unshift({ ...speakerToRemove, isRunning: false });
        if (state.undoHistory.length > 5) state.undoHistory.pop();
    }

    state.speakers = state.speakers.filter(s => s.id !== id);
    if (state.activeSpeakerId === id) state.activeSpeakerId = null;
    renderSpeakerList();
    updateActiveDisplay();
    saveState();
}

function undoRemoval() {
    if (state.undoHistory.length === 0) return;
    
    const restoredSpeaker = state.undoHistory.shift();
    state.speakers.push(restoredSpeaker);
    
    // Auto-select the restored speaker
    state.activeSpeakerId = restoredSpeaker.id;
    
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
                
                if (s.remaining === 15) {
                    try { playChime(1, 600, 0.5); } catch(e) { console.error("Audio error", e); }
                } else if (s.remaining === 0) {
                    try { playChime(2, 900, 1.0); } catch(e) { console.error("Audio error", e); }
                }
                
                changed = true;
            }
        });

        if (changed) {
            updateActiveDisplay();
            renderSpeakerList();
            saveState();
        }
    }, 1000);
}

function handleKeyboardShortcuts(e) {
    // Ignore if typing in an input or textarea
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    const key = e.key.toLowerCase();
    const speakerCount = state.speakers.length;
    if (speakerCount === 0) return;

    let currentIndex = state.speakers.findIndex(s => s.id === state.activeSpeakerId);

    // NAVIGATION: W / Up Arrow
    if (key === "w" || e.key === "ArrowUp") {
        e.preventDefault();
        const nextIndex = (currentIndex <= 0) ? speakerCount - 1 : currentIndex - 1;
        setActiveSpeaker(state.speakers[nextIndex].id);
    }
    // NAVIGATION: S / Down Arrow
    else if (key === "s" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = (currentIndex >= speakerCount - 1 || currentIndex === -1) ? 0 : currentIndex + 1;
        setActiveSpeaker(state.speakers[nextIndex].id);
    }
    // MARK DONE: Enter
    else if (e.key === "Enter") {
        e.preventDefault();
        const active = state.speakers.find(s => s.id === state.activeSpeakerId);
        if (active) {
            active.isDone = !active.isDone;
            if (active.isDone) active.isRunning = false;
            renderSpeakerList();
            updateActiveDisplay();
            saveState();
        }
    }
    // START/STOP TIMER: Space
    else if (e.key === " ") {
        e.preventDefault();
        toggleTimer();
    }
    // REMOVE COUNTRY: Backspace
    else if (e.key === "Backspace") {
        e.preventDefault();
        if (state.activeSpeakerId) {
            removeSpeaker(state.activeSpeakerId);
        }
    }
    // UNDO: Ctrl + Z
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undoRemoval();
    }
}

// --- EVENT LISTENERS ---

let countriesData = [];
const addSpeakerContainer = document.querySelector('.add-speaker-container');
const dropdown = document.createElement('div');
dropdown.className = 'autocomplete-dropdown';
addSpeakerContainer.appendChild(dropdown);

let activeSuggestionIndex = -1;

function updateSuggestionFocus(items) {
    items.forEach((item, index) => {
        if (index === activeSuggestionIndex) {
            item.classList.add('focused');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('focused');
        }
    });
}

function renderSuggestions(query) {
    dropdown.innerHTML = '';
    if (!query) {
        dropdown.classList.remove('active');
        return;
    }
    
    // Ignore small trailing spaces for matching
    const lowerQuery = query.toLowerCase().trim();
    const matches = countriesData.filter(c => c.toLowerCase().includes(lowerQuery));
    
    if (matches.length === 0) {
        dropdown.classList.remove('active');
        return;
    }
    
    matches.forEach((match, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        
        // Escape regex special chars to be safe.
        const safeQuery = lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeQuery})`, 'gi');
        item.innerHTML = match.replace(regex, `<span style="color: var(--gold); font-weight: 800;">$1</span>`);
        
        item.addEventListener('click', () => {
            newSpeakerInput.value = match;
            dropdown.classList.remove('active');
            newSpeakerInput.focus();
        });
        dropdown.appendChild(item);
    });
    
    dropdown.classList.add('active');
    activeSuggestionIndex = -1;
}

newSpeakerInput.addEventListener('input', (e) => {
    renderSuggestions(e.target.value);
});

newSpeakerInput.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    
    if (e.key === "Enter") {
        if (dropdown.classList.contains('active') && activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
            e.preventDefault();
            newSpeakerInput.value = items[activeSuggestionIndex].textContent;
            dropdown.classList.remove('active');
        } else {
            e.preventDefault();
            addSpeakerBtn.click();
        }
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (dropdown.classList.contains('active') && items.length > 0) {
            activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, items.length - 1);
            updateSuggestionFocus(items);
        } else if (!dropdown.classList.contains('active') && newSpeakerInput.value.trim() !== '') {
            renderSuggestions(newSpeakerInput.value.trim());
        }
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (dropdown.classList.contains('active') && items.length > 0) {
            activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
            updateSuggestionFocus(items);
        }
    } else if (e.key === "Escape") {
        dropdown.classList.remove('active');
    }
});

document.addEventListener('click', (e) => {
    if (!addSpeakerContainer.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

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
        dropdown.classList.remove('active');
    }
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

exportCsvBtn.addEventListener("click", () => {
    if (state.speakers.length === 0) {
        alert("No data to export!");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Country,Elapsed Time,Time Left,Status\n";

    state.speakers.forEach(speaker => {
        const name = `"${speaker.name.replace(/"/g, '""')}"`;
        const elapsed = formatTime(speaker.elapsed);
        const left = formatTime(speaker.remaining);
        const status = speaker.isDone ? "Done" : (speaker.isRunning ? "Speaking" : "Waiting");
        
        csvContent += `${name},${elapsed},${left},${status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const safeSessionName = state.sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'session';
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `mun_report_${safeSessionName}_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

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
    fetch('/countries.json')
        .then(r => r.json())
        .then(data => {
            countriesData = data;
        })
        .catch(err => console.error("Failed loading countries:", err));

    loadState();
    startGlobalLoop();
    
    // Attempt to unlock Web Audio on first user interaction so it's ready.
    const unlockAudio = () => {
        if (!audioCtx) audioCtx = new WebAudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);
    
    // Set active preset
    presetBtns.forEach(btn => {
        if (parseInt(btn.dataset.time) === state.defaultTime) {
            btn.classList.add("active");
        }
    });

    // Register Keyboard Shortcuts
    window.addEventListener("keydown", handleKeyboardShortcuts);
}

init();
