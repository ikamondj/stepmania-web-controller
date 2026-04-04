// WebSocket connection and button control logic
let socket;
let connectionTime = 0;
let connectionTimer = null;
let currentResults = [];
let isSearching = false;
let isDownloading = false;
let currentPage = 0;
let currentView = 'control';
let keyboardControlsEnabled = false;
const activeKeyboardButtons = new Map();
let stepmaniaState = {
    running: null,
    available: false,
    message: 'Waiting for server status...'
};
let isStepManiaActionPending = false;
let pendingStepManiaAction = null;
let audioVolumeState = {
    available: false,
    volume: null,
    message: 'Waiting for server audio status...'
};
let isAudioVolumeActionPending = false;
let pendingAudioVolume = null;
const RESULTS_PER_PAGE = 10;
const AUDIO_VOLUME_MIN = 0;
const AUDIO_VOLUME_MAX = 100;

// Search API configuration (uses local proxy to avoid CORS issues)
const SEARCH_API_URL = "/api/ddr-search";

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    initializeButtons();
    initializeDDR();
    initializeStepManiaControls();
    initializeKeyboardControls();
});

/**
 * Initialize page navigation
 */
function initializeDDR() {
    const ddrButton = document.getElementById('ddrButton');
    const stepmaniaButton = document.getElementById('stepmaniaButton');
    const backButton = document.getElementById('backButton');
    const stepmaniaBackButton = document.getElementById('stepmaniaBackButton');
    const searchButton = document.getElementById('searchButton');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    // DDR button - show downloader
    ddrButton.addEventListener('click', () => {
        switchToPage('ddr');
    });

    // StepMania button - show process controls
    stepmaniaButton.addEventListener('click', () => {
        switchToPage('stepmania');
    });
    
    // Back button - return to control page
    backButton.addEventListener('click', () => {
        switchToPage('control');
    });

    stepmaniaBackButton.addEventListener('click', () => {
        switchToPage('control');
    });
    
    // Check if search button should be enabled
    const updateSearchButton = () => {
        const hasTitle = songTitle.value.trim().length > 0;
        const hasArtist = songArtist.value.trim().length > 0;
        searchButton.disabled = !hasTitle && !hasArtist;
    };
    
    // Input listeners for dynamic button enabling
    songTitle.addEventListener('input', updateSearchButton);
    songArtist.addEventListener('input', updateSearchButton);
    
    // Search button
    searchButton.addEventListener('click', performSearch);
    
    // Enter key in search fields
    songTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !searchButton.disabled) performSearch();
    });
    songArtist.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !searchButton.disabled) performSearch();
    });
    
    // Pagination
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            displayResults();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(currentResults.length / RESULTS_PER_PAGE);
        if (currentPage < totalPages - 1) {
            currentPage++;
            displayResults();
        }
    });
}

/**
 * Switch between the controller, downloader, and StepMania pages
 * @param {string} view
 */
function switchToPage(view) {
    const pages = {
        control: document.getElementById('controlPage'),
        ddr: document.getElementById('ddrPage'),
        stepmania: document.getElementById('stepmaniaPage')
    };

    if (!pages[view]) {
        return;
    }

    if (view !== 'control') {
        releaseActiveKeyboardButtons();
    }

    Object.entries(pages).forEach(([pageName, pageElement]) => {
        pageElement.classList.toggle('hidden', pageName !== view);
    });

    currentView = view;

    if (currentView === 'stepmania') {
        requestStepManiaState();
        requestAudioVolumeState();
    }
}

/**
 * Perform song search directly via Zenius API
 */
async function performSearch() {
    if (isSearching) return;
    
    const songTitle = document.getElementById('songTitle').value.trim();
    const songArtist = document.getElementById('songArtist').value.trim();
    
    if (!songTitle && !songArtist) {
        updateSearchStatus('Please enter at least song title or artist', 'error');
        return;
    }
    
    isSearching = true;
    currentPage = 0;
    updateSearchStatus('Searching Zenius...', 'loading');
    document.getElementById('searchButton').disabled = true;
    
    try {
        // Search using the proxy endpoint (same origin, no CORS issues)
        const params = new URLSearchParams();
        if (songTitle) params.append('songtitle', songTitle);
        if (songArtist) params.append('songartist', songArtist);
        
        const response = await fetch(SEARCH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const results = parseZeniusResults(html);
        
        currentResults = results;
        
        if (results.length === 0) {
            updateSearchStatus('No results found', 'error');
            displayResults();
        } else {
            updateSearchStatus(`Found ${results.length} results`, 'success');
            displayResults();
        }
        
    } catch (error) {
        console.error('Search error:', error);
        updateSearchStatus(`Search failed: ${error.message}`, 'error');
        displayResults();
    } finally {
        isSearching = false;
        document.getElementById('searchButton').disabled = false;
    }
}

/**
 * Parse Zenius HTML response (same logic as DDRDownloader2.py)
 */
function parseZeniusResults(html) {
    try {
        // Fix XML parsing issues
        html = html.replace(/&(?!amp;|lt;|gt;)/g, '&amp;');
        
        // Parse as XML
        const parser = new DOMParser();
        const xmlString = `<root>${html}</root>`;
        const xmlDoc = parser.parseFromString(xmlString, 'text/html');
        
        // If XML parsing failed, try regex parsing as fallback
        if (xmlDoc.body.innerHTML.includes('parsererror')) {
            return parseZeniusResultsWithRegex(html);
        }
        
        const rows = xmlDoc.querySelectorAll('tr');
        const results = [];
        
        // Skip first 2 rows (header)
        for (let i = 2; i < rows.length; i++) {
            const columns = rows[i].querySelectorAll('td');
            if (columns.length < 4) continue;
            
            const nameTag = columns[0].querySelector('a');
            const songName = nameTag ? nameTag.textContent.trim() : 'Unknown';
            const songLink = nameTag ? 'https://zenius-i-vanisher.com/v5.2/' + nameTag.getAttribute('href') : '';
            
            const spDifficulty = columns[1].textContent.trim() || '-';
            const dpDifficulty = columns[2].textContent.trim() || '-';
            
            const categoryTag = columns[3].querySelector('a');
            const category = categoryTag ? categoryTag.textContent.trim() : 'Unknown';
            
            const simfileIdMatch = songLink.match(/simfileid=(\d+)/);
            const simfileId = simfileIdMatch ? simfileIdMatch[1] : null;
            
            if (simfileId) {
                results.push({
                    name: songName,
                    link: songLink,
                    sp: spDifficulty,
                    dp: dpDifficulty,
                    category: category,
                    simfile_id: simfileId
                });
            }
        }
        
        return results;
        
    } catch (error) {
        console.error('Parse error:', error);
        return parseZeniusResultsWithRegex(html);
    }
}

/**
 * Fallback regex-based parsing for Zenius results
 */
function parseZeniusResultsWithRegex(html) {
    const results = [];
    const rows = html.split('<tr');
    
    // Skip header rows
    for (let i = 3; i < rows.length; i++) {
        const row = rows[i];
        const nameMatch = row.match(/href="([^"]*simfileid=(\d+)[^"]*)">([^<]+)</);
        const diffMatch = row.match(/<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>/);
        const categoryMatch = row.match(/<td[^>]*><a[^>]*>([^<]+)<\/a><\/td>/);
        
        if (nameMatch && nameMatch[2]) {
            const result = {
                name: (nameMatch[3] || 'Unknown').trim(),
                link: 'https://zenius-i-vanisher.com/v5.2/' + nameMatch[1],
                sp: diffMatch ? (diffMatch[1] || '-').trim() : '-',
                dp: diffMatch ? (diffMatch[2] || '-').trim() : '-',
                category: categoryMatch ? (categoryMatch[1] || 'Unknown').trim() : 'Unknown',
                simfile_id: nameMatch[2]
            };
            results.push(result);
        }
    }
    
    return results;
}

/**
 * Update search status message
 */
function updateSearchStatus(message, type) {
    const statusEl = document.getElementById('searchStatus');
    statusEl.textContent = message;
    statusEl.className = `search-status ${type}`;
}

/**
 * Initialize WebSocket connection to the server
 */
function initializeSocket() {
    // Connect to the server (auto-uses current hostname/port)
    socket = io();

    // Connection established
    socket.on('connect', () => {
        console.log('Connected to server');
        updateConnectionStatus(true);
        connectionTime = 0;
        startConnectionTimer();
        requestStepManiaState();
        requestAudioVolumeState();
    });

    // Connection lost
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
        stopConnectionTimer();
        isStepManiaActionPending = false;
        pendingStepManiaAction = null;
        stepmaniaState.message = 'Disconnected from server.';
        isAudioVolumeActionPending = false;
        pendingAudioVolume = null;
        audioVolumeState.message = 'Disconnected from server.';
        updateStepManiaControls();
        updateAudioVolumeControls();
    });
    
    // Listen for download status
    socket.on('ddr_download_status', (data) => {
        handleDownloadStatus(data);
    });

    // Listen for acknowledgments from server
    socket.on('button_response', (data) => {
        console.log('Button response:', data);
    });

    socket.on('stepmania_state', (data) => {
        handleStepManiaState(data);
    });

    socket.on('stepmania_action_result', (data) => {
        handleStepManiaActionResult(data);
    });

    socket.on('audio_volume_state', (data) => {
        handleAudioVolumeState(data);
    });

    socket.on('audio_volume_result', (data) => {
        handleAudioVolumeResult(data);
    });

    // Handle server errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // Handle reconnection attempts
    socket.on('reconnect_attempt', () => {
        console.log('Attempting to reconnect...');
    });
}

/**
 * Display search results with pagination
 */
function displayResults() {
    const resultsList = document.getElementById('resultsList');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (!currentResults || currentResults.length === 0) {
        resultsList.innerHTML = '<p class="placeholder">No results found</p>';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        pageInfo.textContent = 'Page 0';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(currentResults.length / RESULTS_PER_PAGE);
    const start = currentPage * RESULTS_PER_PAGE;
    const end = Math.min(start + RESULTS_PER_PAGE, currentResults.length);
    const pageResults = currentResults.slice(start, end);
    
    // Display results
    resultsList.innerHTML = pageResults.map((result, index) => `
        <div class="result-item" onclick="downloadSong(${start + index})">
            <div class="result-title">${escapeHtml(result.name)}</div>
            <div class="result-category">${escapeHtml(result.category)}</div>
            <div class="result-difficulty">
                <span class="result-difficulty-pair">
                    <span class="result-difficulty-label">SP:</span> ${result.sp}
                </span>
                <span class="result-difficulty-pair">
                    <span class="result-difficulty-label">DP:</span> ${result.dp}
                </span>
            </div>
            <button class="download-btn" onclick="event.stopPropagation(); downloadSong(${start + index})">
                Download
            </button>
        </div>
    `).join('');
    
    // Update pagination controls
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = currentPage >= totalPages - 1;
    pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
}

/**
 * Download a song
 */
function downloadSong(index) {
    if (isDownloading || !currentResults[index]) return;
    
    const song = currentResults[index];
    isDownloading = true;
    
    const downloadStatus = document.getElementById('downloadStatus');
    downloadStatus.classList.remove('hidden', 'error');
    document.getElementById('downloadMessage').textContent = `Downloading ${song.name}...`;
    
    console.log('Downloading:', song);
    
    // Send ONLY to Python server for download
    socket.emit('ddr_download', {
        song_data: song
    });
}

/**
 * Handle download status updates
 */
function handleDownloadStatus(data) {
    const downloadStatus = document.getElementById('downloadStatus');
    const downloadMessage = document.getElementById('downloadMessage');
    
    console.log('Download status:', data);
    
    if (data.status === 'success') {
        downloadMessage.textContent = data.message;
        downloadStatus.classList.remove('error');
        isDownloading = false;
        setTimeout(() => {
            downloadStatus.classList.add('hidden');
        }, 3000);
    } else if (data.status === 'error') {
        downloadMessage.textContent = `Error: ${data.message}`;
        downloadStatus.classList.add('error');
        isDownloading = false;
    } else if (data.status === 'progress' || data.status === 'started') {
        downloadMessage.textContent = data.message;
        downloadStatus.classList.remove('hidden', 'error');
    }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Initialize button event listeners
 */
function initializeButtons() {
    const buttonA = document.getElementById('buttonA');
    const buttonB = document.getElementById('buttonB');

    // Button A listeners
    buttonA.addEventListener('mousedown', (e) => {
        e.preventDefault();
        sendButtonEvent('A', 'press');
    });

    buttonA.addEventListener('mouseup', (e) => {
        e.preventDefault();
        sendButtonEvent('A', 'release');
    });

    buttonA.addEventListener('mouseleave', (e) => {
        if (e.buttons === 1) { // Left mouse button
            sendButtonEvent('A', 'release');
        }
    });

    // Touch events for Button A
    buttonA.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sendButtonEvent('A', 'press');
    });

    buttonA.addEventListener('touchend', (e) => {
        e.preventDefault();
        sendButtonEvent('A', 'release');
    });

    // Button B listeners
    buttonB.addEventListener('mousedown', (e) => {
        e.preventDefault();
        sendButtonEvent('B', 'press');
    });

    buttonB.addEventListener('mouseup', (e) => {
        e.preventDefault();
        sendButtonEvent('B', 'release');
    });

    buttonB.addEventListener('mouseleave', (e) => {
        if (e.buttons === 1) {
            sendButtonEvent('B', 'release');
        }
    });

    // Touch events for Button B
    buttonB.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sendButtonEvent('B', 'press');
    });

    buttonB.addEventListener('touchend', (e) => {
        e.preventDefault();
        sendButtonEvent('B', 'release');
    });

    // Directional buttons
    const buttonLeft = document.getElementById('buttonLeft');
    const buttonDown = document.getElementById('buttonDown');
    const buttonUp = document.getElementById('buttonUp');
    const buttonRight = document.getElementById('buttonRight');

    // Helper function to add directional button listeners
    const addDirectionalButtonListeners = (button, direction) => {
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            sendButtonEvent(direction, 'press');
        });

        button.addEventListener('mouseup', (e) => {
            e.preventDefault();
            sendButtonEvent(direction, 'release');
        });

        button.addEventListener('mouseleave', (e) => {
            if (e.buttons === 1) {
                sendButtonEvent(direction, 'release');
            }
        });

        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            sendButtonEvent(direction, 'press');
        });

        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            sendButtonEvent(direction, 'release');
        });
    };

    // Add listeners for each directional button
    addDirectionalButtonListeners(buttonLeft, 'Left');
    addDirectionalButtonListeners(buttonDown, 'Down');
    addDirectionalButtonListeners(buttonUp, 'Up');
    addDirectionalButtonListeners(buttonRight, 'Right');

    // Prevent default touch behaviors
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
        }
    }, false);
}

/**
 * Initialize the StepMania control page button
 */
function initializeStepManiaControls() {
    const toggleButton = document.getElementById('stepmaniaToggleButton');
    const volumeSlider = document.getElementById('audioVolumeSlider');

    toggleButton.addEventListener('click', handleStepManiaToggle);
    volumeSlider.addEventListener('input', handleAudioVolumeSliderInput);
    volumeSlider.addEventListener('change', handleAudioVolumeSliderCommit);

    updateStepManiaControls();
    updateAudioVolumeControls();
}

/**
 * Request a fresh StepMania status update from the server
 */
function requestStepManiaState() {
    if (!socket || !socket.connected) {
        updateStepManiaControls();
        return;
    }

    socket.emit('request_stepmania_state');
}

/**
 * Request a fresh audio volume update from the server
 */
function requestAudioVolumeState() {
    if (!socket || !socket.connected) {
        updateAudioVolumeControls();
        return;
    }

    socket.emit('request_audio_volume_state');
}

/**
 * Update local StepMania state from the server
 * @param {Object} data
 */
function handleStepManiaState(data) {
    stepmaniaState = {
        running: typeof data.running === 'boolean' ? data.running : stepmaniaState.running,
        available: typeof data.available === 'boolean' ? data.available : stepmaniaState.available,
        message: data.message || defaultStepManiaMessage(
            typeof data.running === 'boolean' ? data.running : stepmaniaState.running,
            typeof data.available === 'boolean' ? data.available : stepmaniaState.available
        )
    };

    isStepManiaActionPending = false;
    pendingStepManiaAction = null;
    updateStepManiaControls();
}

/**
 * Handle StepMania action results, especially failures that should restore the button
 * @param {Object} data
 */
function handleStepManiaActionResult(data) {
    if (typeof data.running === 'boolean') {
        stepmaniaState.running = data.running;
    }

    if (typeof data.available === 'boolean') {
        stepmaniaState.available = data.available;
    }

    if (data.status === 'error') {
        isStepManiaActionPending = false;
        pendingStepManiaAction = null;
    }

    if (data.message) {
        stepmaniaState.message = data.message;
    }

    updateStepManiaControls();
}

/**
 * Update local audio volume state from the server
 * @param {Object} data
 */
function handleAudioVolumeState(data) {
    audioVolumeState = {
        available: typeof data.available === 'boolean' ? data.available : audioVolumeState.available,
        volume: typeof data.volume === 'number'
            ? clampAudioVolume(data.volume)
            : (data.available === false ? null : audioVolumeState.volume),
        message: data.message || defaultAudioVolumeMessage(
            typeof data.available === 'boolean' ? data.available : audioVolumeState.available,
            typeof data.volume === 'number' ? clampAudioVolume(data.volume) : audioVolumeState.volume
        )
    };

    isAudioVolumeActionPending = false;
    pendingAudioVolume = null;
    updateAudioVolumeControls();
}

/**
 * Handle audio volume action results, especially failures that should restore the slider
 * @param {Object} data
 */
function handleAudioVolumeResult(data) {
    if (typeof data.available === 'boolean') {
        audioVolumeState.available = data.available;
    }

    if (typeof data.volume === 'number') {
        audioVolumeState.volume = clampAudioVolume(data.volume);
    } else if (data.available === false) {
        audioVolumeState.volume = null;
    }

    isAudioVolumeActionPending = false;
    pendingAudioVolume = null;

    if (data.message) {
        audioVolumeState.message = data.message;
    }

    updateAudioVolumeControls();
}

/**
 * Toggle the StepMania process on the server
 */
function handleStepManiaToggle() {
    if (!socket || !socket.connected || isStepManiaActionPending || typeof stepmaniaState.running !== 'boolean') {
        return;
    }

    const action = stepmaniaState.running ? 'close' : 'open';

    if (action === 'close' && !window.confirm('Close StepMania on the server?')) {
        return;
    }

    isStepManiaActionPending = true;
    pendingStepManiaAction = action;
    stepmaniaState.message = action === 'close'
        ? 'Closing StepMania on the server...'
        : 'Opening StepMania on the server...';
    updateStepManiaControls();

    socket.emit('stepmania_action', { action: action });
}

/**
 * Reflect the current slider position while the user drags it
 * @param {Event} event
 */
function handleAudioVolumeSliderInput(event) {
    const selectedVolume = clampAudioVolume(event.target.value);
    const valueLabel = document.getElementById('audioVolumeValue');

    if (valueLabel) {
        valueLabel.textContent = `${selectedVolume}%`;
    }
}

/**
 * Commit a new server audio volume once the user releases the slider
 * @param {Event} event
 */
function handleAudioVolumeSliderCommit(event) {
    if (!socket || !socket.connected || isAudioVolumeActionPending || !audioVolumeState.available) {
        updateAudioVolumeControls();
        return;
    }

    const selectedVolume = clampAudioVolume(event.target.value);

    if (selectedVolume === audioVolumeState.volume) {
        updateAudioVolumeControls();
        return;
    }

    isAudioVolumeActionPending = true;
    pendingAudioVolume = selectedVolume;
    audioVolumeState.volume = selectedVolume;
    audioVolumeState.message = `Setting system audio output to ${selectedVolume}%...`;
    updateAudioVolumeControls();

    socket.emit('set_audio_volume', { volume: selectedVolume });
}

/**
 * Render the StepMania control button and status text
 */
function updateStepManiaControls() {
    const toggleButton = document.getElementById('stepmaniaToggleButton');
    const statusText = document.getElementById('stepmaniaStatusText');

    if (!toggleButton || !statusText) {
        return;
    }

    let buttonLabel = 'Checking StepMania...';
    let buttonDisabled = true;
    let statusMessage = stepmaniaState.message || 'Waiting for server status...';

    if (!socket || !socket.connected) {
        buttonLabel = stepmaniaState.running ? 'Close StepMania' : 'Open StepMania';
        statusMessage = 'Disconnected from server.';
    } else if (isStepManiaActionPending) {
        buttonLabel = pendingStepManiaAction === 'close' ? 'Closing StepMania...' : 'Opening StepMania...';
    } else if (typeof stepmaniaState.running === 'boolean') {
        buttonLabel = stepmaniaState.running ? 'Close StepMania' : 'Open StepMania';
        buttonDisabled = stepmaniaState.running ? false : !stepmaniaState.available;
        statusMessage = stepmaniaState.message || defaultStepManiaMessage(stepmaniaState.running, stepmaniaState.available);
    }

    toggleButton.textContent = buttonLabel;
    toggleButton.disabled = buttonDisabled;
    toggleButton.classList.toggle('is-running', stepmaniaState.running === true);
    statusText.textContent = statusMessage;
}

/**
 * Render the audio volume slider and status text
 */
function updateAudioVolumeControls() {
    const volumeSlider = document.getElementById('audioVolumeSlider');
    const volumeValue = document.getElementById('audioVolumeValue');
    const statusText = document.getElementById('audioVolumeStatusText');

    if (!volumeSlider || !volumeValue || !statusText) {
        return;
    }

    let sliderValue = typeof audioVolumeState.volume === 'number'
        ? clampAudioVolume(audioVolumeState.volume)
        : AUDIO_VOLUME_MIN;
    let hasKnownVolume = typeof audioVolumeState.volume === 'number';
    let sliderDisabled = true;
    let statusMessage = audioVolumeState.message || 'Waiting for server audio status...';

    if (!socket || !socket.connected) {
        statusMessage = 'Disconnected from server.';
    } else if (isAudioVolumeActionPending) {
        sliderValue = typeof pendingAudioVolume === 'number'
            ? clampAudioVolume(pendingAudioVolume)
            : sliderValue;
        hasKnownVolume = typeof pendingAudioVolume === 'number' || hasKnownVolume;
        statusMessage = audioVolumeState.message || `Setting system audio output to ${sliderValue}%...`;
    } else if (audioVolumeState.available) {
        sliderDisabled = false;
        hasKnownVolume = typeof audioVolumeState.volume === 'number';
        statusMessage = audioVolumeState.message || defaultAudioVolumeMessage(audioVolumeState.available, sliderValue);
    } else {
        sliderValue = typeof audioVolumeState.volume === 'number'
            ? clampAudioVolume(audioVolumeState.volume)
            : AUDIO_VOLUME_MIN;
        hasKnownVolume = typeof audioVolumeState.volume === 'number';
        statusMessage = audioVolumeState.message || defaultAudioVolumeMessage(false, null);
    }

    volumeSlider.disabled = sliderDisabled;
    volumeSlider.value = String(sliderValue);
    volumeValue.textContent = hasKnownVolume ? `${sliderValue}%` : '--%';
    statusText.textContent = statusMessage;
}

/**
 * Default StepMania status text
 * @param {boolean|null} running
 * @param {boolean} available
 * @returns {string}
 */
function defaultStepManiaMessage(running, available) {
    if (running === true) {
        return 'StepMania is currently running on the server.';
    }

    if (running === false && !available) {
        return 'StepMania is not running and its executable could not be found on the server.';
    }

    if (running === false) {
        return 'StepMania is not currently running on the server.';
    }

    return 'Waiting for server status...';
}

/**
 * Default audio volume status text
 * @param {boolean} available
 * @param {number|null} volume
 * @returns {string}
 */
function defaultAudioVolumeMessage(available, volume) {
    if (available && typeof volume === 'number') {
        return `System audio output is set to ${clampAudioVolume(volume)}%.`;
    }

    if (!available) {
        return 'Audio volume control is unavailable on the server.';
    }

    return 'Waiting for server audio status...';
}

/**
 * Clamp slider values to the supported audio range
 * @param {number|string} value
 * @returns {number}
 */
function clampAudioVolume(value) {
    const numericValue = Number.parseInt(value, 10);

    if (Number.isNaN(numericValue)) {
        return AUDIO_VOLUME_MIN;
    }

    return Math.min(AUDIO_VOLUME_MAX, Math.max(AUDIO_VOLUME_MIN, numericValue));
}

/**
 * Initialize desktop-only keyboard controls for the controller page
 */
function initializeKeyboardControls() {
    keyboardControlsEnabled = !isMobileBrowser();

    if (!keyboardControlsEnabled) {
        return;
    }

    document.addEventListener('keydown', handleKeyboardButtonPress);
    document.addEventListener('keyup', handleKeyboardButtonRelease);
    window.addEventListener('blur', releaseActiveKeyboardButtons);
}

/**
 * Whether controller inputs should be allowed to send to the server
 * @returns {boolean}
 */
function canSendControllerInput() {
    return currentView === 'control';
}

/**
 * Basic mobile-browser detection so desktop keyboard controls stay disabled there
 * @returns {boolean}
 */
function isMobileBrowser() {
    return Boolean(navigator.userAgentData && navigator.userAgentData.mobile) ||
        (window.matchMedia('(max-width: 768px) and (any-pointer: coarse)').matches) ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Translate supported keyboard keys into controller buttons
 * @param {string} key
 * @returns {string|null}
 */
function getButtonForKey(key) {
    switch (key) {
        case 'ArrowLeft':
            return 'Left';
        case 'ArrowDown':
            return 'Down';
        case 'ArrowUp':
            return 'Up';
        case 'ArrowRight':
            return 'Right';
        case 'Enter':
        case ' ':
        case 'Spacebar':
            return 'A';
        case 'Escape':
        case 'Esc':
        case 'Backspace':
            return 'B';
        default:
            return null;
    }
}

/**
 * Handle controller key presses on desktop
 * @param {KeyboardEvent} event
 */
function handleKeyboardButtonPress(event) {
    if (!keyboardControlsEnabled || !canSendControllerInput()) {
        return;
    }

    const button = getButtonForKey(event.key);
    if (!button) {
        return;
    }

    event.preventDefault();

    if (activeKeyboardButtons.has(event.key)) {
        return;
    }

    activeKeyboardButtons.set(event.key, button);

    if (hasActiveKeyboardButton(button, event.key)) {
        return;
    }

    sendButtonEvent(button, 'press');
}

/**
 * Handle controller key releases on desktop
 * @param {KeyboardEvent} event
 */
function handleKeyboardButtonRelease(event) {
    if (!keyboardControlsEnabled) {
        return;
    }

    const button = activeKeyboardButtons.get(event.key);
    if (!button) {
        return;
    }

    event.preventDefault();
    activeKeyboardButtons.delete(event.key);

    if (canSendControllerInput() && !hasActiveKeyboardButton(button)) {
        sendButtonEvent(button, 'release');
    }
}

/**
 * Whether a controller button is already being held by another keyboard key
 * @param {string} button
 * @param {string|null} excludeKey
 * @returns {boolean}
 */
function hasActiveKeyboardButton(button, excludeKey = null) {
    for (const [activeKey, activeButton] of activeKeyboardButtons.entries()) {
        if (activeKey !== excludeKey && activeButton === button) {
            return true;
        }
    }

    return false;
}

/**
 * Release any pressed keyboard buttons to avoid stuck controller state
 */
function releaseActiveKeyboardButtons() {
    if (activeKeyboardButtons.size === 0) {
        return;
    }

    const pressedButtons = Array.from(new Set(activeKeyboardButtons.values()));
    activeKeyboardButtons.clear();

    if (!socket || !socket.connected || !canSendControllerInput()) {
        return;
    }

    pressedButtons.forEach((button) => {
        sendButtonEvent(button, 'release');
    });
}

/**
 * Send button event to the server
 * @param {string} button - 'A', 'B', 'Left', 'Down', 'Up', or 'Right'
 * @param {string} action - 'press' or 'release'
 */
function sendButtonEvent(button, action) {
    if (!canSendControllerInput()) {
        console.log(`Ignoring ${button} ${action} while the controller page is not active`);
        return;
    }

    if (socket && socket.connected) {
        socket.emit('button_event', {
            button: button,
            action: action,
            timestamp: Date.now()
        });
        console.log(`Button ${button} ${action}`);
    } else {
        console.warn('Socket not connected, cannot send button event');
    }
}

/**
 * Update connection status display
 * @param {boolean} connected - Whether connected to server
 */
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    
    if (connected) {
        statusElement.textContent = 'Connected ✓';
        statusElement.className = 'status-connected';
    } else {
        statusElement.textContent = 'Disconnected ✗';
        statusElement.className = 'status-disconnected';
    }
}

/**
 * Start the connection uptime timer
 */
function startConnectionTimer() {
    if (connectionTimer) {
        clearInterval(connectionTimer);
    }

    connectionTimer = setInterval(() => {
        connectionTime++;
        updateConnectionTimeDisplay();
    }, 1000);
}

/**
 * Stop the connection uptime timer
 */
function stopConnectionTimer() {
    if (connectionTimer) {
        clearInterval(connectionTimer);
        connectionTimer = null;
        connectionTime = 0;
        updateConnectionTimeDisplay();
    }
}

/**
 * Format and display connection time
 */
function updateConnectionTimeDisplay() {
    const element = document.getElementById('connection-time');
    
    if (connectionTime === 0) {
        element.textContent = '0s';
    } else if (connectionTime < 60) {
        element.textContent = `${connectionTime}s`;
    } else if (connectionTime < 3600) {
        const minutes = Math.floor(connectionTime / 60);
        const seconds = connectionTime % 60;
        element.textContent = `${minutes}m ${seconds}s`;
    } else {
        const hours = Math.floor(connectionTime / 3600);
        const minutes = Math.floor((connectionTime % 3600) / 60);
        element.textContent = `${hours}h ${minutes}m`;
    }
}
