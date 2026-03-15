// WebSocket connection and button control logic
let socket;
let connectionTime = 0;
let connectionTimer = null;
let currentResults = [];
let isSearching = false;
let isDownloading = false;
let currentPage = 0;
const RESULTS_PER_PAGE = 10;

// Search API configuration (uses local proxy to avoid CORS issues)
const SEARCH_API_URL = "/api/ddr-search";

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    initializeButtons();
    initializeDDR();
});

/**
 * Initialize page navigation
 */
function initializeDDR() {
    const ddrButton = document.getElementById('ddrButton');
    const backButton = document.getElementById('backButton');
    const searchButton = document.getElementById('searchButton');
    const controlPage = document.getElementById('controlPage');
    const ddrPage = document.getElementById('ddrPage');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    // DDR button - show downloader
    ddrButton.addEventListener('click', () => {
        controlPage.classList.add('hidden');
        ddrPage.classList.remove('hidden');
    });
    
    // Back button - return to control page
    backButton.addEventListener('click', () => {
        ddrPage.classList.add('hidden');
        controlPage.classList.remove('hidden');
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
    });

    // Connection lost
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
        stopConnectionTimer();
    });
    
    // Listen for download status
    socket.on('ddr_download_status', (data) => {
        handleDownloadStatus(data);
    });

    // Listen for acknowledgments from server
    socket.on('button_response', (data) => {
        console.log('Button response:', data);
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
 * Send button event to the server
 * @param {string} button - 'A' or 'B'
 * @param {string} action - 'press' or 'release'
 */
function sendButtonEvent(button, action) {
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

// Add keyboard support for testing/desktop use
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'a') {
        sendButtonEvent('A', 'press');
    } else if (e.key.toLowerCase() === 'b') {
        sendButtonEvent('B', 'press');
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'a') {
        sendButtonEvent('A', 'release');
    } else if (e.key.toLowerCase() === 'b') {
        sendButtonEvent('B', 'release');
    }
});
