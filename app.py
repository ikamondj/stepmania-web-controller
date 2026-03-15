"""
WebHID Server - Remote button control via WebSocket
A Flask-based web server that handles two buttons (A and B) via WebSocket
and simulates virtual button presses on the host system.
"""

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, disconnect
import threading
import time
import logging
import uuid
import requests
from pynput.keyboard import Controller, Key
from config import HOST, PORT, DEBUG, LOCAL_IP, BUTTON_A_KEY, BUTTON_B_KEY, KEY_PRESS_DURATION
from config import MDNS_NAME, MDNS_DOMAIN, MDNS_FULL_NAME
from config import BUTTON_LEFT_KEY, BUTTON_DOWN_KEY, BUTTON_UP_KEY, BUTTON_RIGHT_KEY
import ddr_handler

# Try to import zeroconf for mDNS support
try:
    from zeroconf import ServiceInfo, Zeroconf
    ZEROCONF_AVAILABLE = True
except ImportError:
    ZEROCONF_AVAILABLE = False
    print("Warning: zeroconf not available. mDNS will not be enabled.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask and SocketIO
app = Flask(__name__)
app.config['SECRET_KEY'] = 'webHID-server-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60, ping_interval=25)

# Virtual keyboard controller
keyboard = Controller()

# Track active keys
active_keys = set()
key_lock = threading.Lock()

# mDNS service
mdns_instance = None


def get_key_from_name(button_name):
    """
    Get the pynput Key object from button name
    
    Args:
        button_name: 'A', 'B', 'Left', 'Down', 'Up', or 'Right'
    
    Returns:
        pynput Key object or character
    """
    button_name = button_name.upper()
    if button_name == 'A':
        return BUTTON_A_KEY
    elif button_name == 'B':
        return BUTTON_B_KEY
    elif button_name == 'LEFT':
        return Key.left if BUTTON_LEFT_KEY == 'left' else BUTTON_LEFT_KEY
    elif button_name == 'DOWN':
        return Key.down if BUTTON_DOWN_KEY == 'down' else BUTTON_DOWN_KEY
    elif button_name == 'UP':
        return Key.up if BUTTON_UP_KEY == 'up' else BUTTON_UP_KEY
    elif button_name == 'RIGHT':
        return Key.right if BUTTON_RIGHT_KEY == 'right' else BUTTON_RIGHT_KEY
    return None


def press_button(button_name):
    """
    Press a virtual button
    
    Args:
        button_name: 'A' or 'B'
    """
    key = get_key_from_name(button_name)
    if key is None:
        logger.warning(f"Invalid button name: {button_name}")
        return
    
    with key_lock:
        try:
            keyboard.press(key)
            active_keys.add((button_name, key))
            logger.info(f"Button {button_name} pressed")
        except Exception as e:
            logger.error(f"Error pressing button {button_name}: {e}")


def release_button(button_name):
    """
    Release a virtual button
    
    Args:
        button_name: 'A' or 'B'
    """
    key = get_key_from_name(button_name)
    if key is None:
        logger.warning(f"Invalid button name: {button_name}")
        return
    
    with key_lock:
        try:
            keyboard.release(key)
            active_keys.discard((button_name, key))
            logger.info(f"Button {button_name} released")
        except Exception as e:
            logger.error(f"Error releasing button {button_name}: {e}")


def setup_mdns():
    """
    Set up mDNS service for local hostname resolution
    """
    if not ZEROCONF_AVAILABLE:
        logger.warning("Zeroconf not available, skipping mDNS setup")
        return None
    
    try:
        global mdns_instance
        
        # Create mDNS service info
        service_info = ServiceInfo(
            "_http._tcp.local.",
            f"{MDNS_NAME}._http._tcp.local.",
            addresses=[__import__('socket').inet_aton(LOCAL_IP)],
            port=PORT,
            properties={
                'path': '/',
                'version': '1.0',
                'description': 'WebHID Remote Button Controller'
            },
            server=f"{MDNS_NAME}.local.",
        )
        
        # Register the service
        mdns_instance = Zeroconf()
        mdns_instance.register_service(service_info)
        
        logger.info(f"mDNS service registered: http://{MDNS_FULL_NAME}")
        return mdns_instance
        
    except Exception as e:
        logger.error(f"Failed to set up mDNS: {e}")
        return None


def cleanup_mdns():
    """
    Clean up mDNS service
    """
    global mdns_instance
    if mdns_instance:
        try:
            mdns_instance.close()
            logger.info("mDNS service unregistered")
        except Exception as e:
            logger.error(f"Error closing mDNS: {e}")
        mdns_instance = None


@app.route('/')
def index():
    """
    Serve the main index page
    """
    return render_template('index.html', server_ip=LOCAL_IP, server_port=PORT)


@app.route('/api/ddr-search', methods=['POST'])
def ddr_search_proxy():
    """
    CORS proxy for Zenius searches (browser -> server -> Zenius -> server -> browser)
    This avoids CORS issues by having the server act as an intermediary
    """
    try:
        # Get search parameters from the browser request
        song_title = request.form.get('songtitle', '').strip()
        song_artist = request.form.get('songartist', '').strip()
        
        if not song_title and not song_artist:
            return jsonify({
                'status': 'error',
                'message': 'At least one search parameter required'
            }), 400
        
        logger.info(f"Search proxy received: title='{song_title}', artist='{song_artist}'")
        
        # Forward the request to Zenius (using same headers as DDRDownloader2.py)
        zenius_url = 'https://zenius-i-vanisher.com/v5.2/simfiles_search_ajax.php'
        zenius_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://zenius-i-vanisher.com',
            'Referer': 'https://zenius-i-vanisher.com/v5.2/simfiles.php'
        }
        
        params = {}
        if song_title:
            params['songtitle'] = song_title
        if song_artist:
            params['songartist'] = song_artist
        
        logger.info(f"Sending to Zenius: POST {zenius_url} with params {params}")
        logger.info(f"Headers: {zenius_headers}")
        
        response = requests.post(zenius_url, data=params, headers=zenius_headers, timeout=10)
        
        logger.info(f"Zenius response status: {response.status_code}")
        logger.info(f"Response content (first 500 chars): {response.text[:500]}")
        
        if response.status_code != 200:
            logger.error(f"Zenius returned {response.status_code}: {response.text[:1000]}")
            return jsonify({
                'status': 'error',
                'message': f'Zenius returned {response.status_code}',
                'debug': response.text[:500]
            }), response.status_code
        
        # Return the HTML response from Zenius
        return response.text, 200, {'Content-Type': 'text/html; charset=utf-8'}
        
    except requests.exceptions.Timeout:
        logger.error('Zenius request timeout')
        return jsonify({
            'status': 'error',
            'message': 'Search timeout - Zenius server not responding'
        }), 504
    except requests.exceptions.ConnectionError as e:
        logger.error(f'Failed to connect to Zenius: {e}')
        return jsonify({
            'status': 'error',
            'message': 'Connection failed - cannot reach Zenius server'
        }), 503
    except Exception as e:
        logger.error(f'Search proxy error: {e}', exc_info=True)
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@socketio.on('connect')
def handle_connect():
    """
    Handle client connection
    """
    client_ip = request.remote_addr
    logger.info(f"Client connected: {client_ip}")
    emit('response', {'data': 'Connected to WebHID Server'})


@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle client disconnection
    """
    client_ip = request.remote_addr
    logger.info(f"Client disconnected: {client_ip}")


@socketio.on('button_event')
def handle_button_event(data):
    """
    Handle button press/release events from client
    
    Args:
        data: dict with 'button' ('A' or 'B') and 'action' ('press' or 'release')
    """
    button = data.get('button', '').upper()
    action = data.get('action', '').lower()
    timestamp = data.get('timestamp', None)
    client_ip = request.remote_addr
    
    valid_buttons = ['A', 'B', 'LEFT', 'DOWN', 'UP', 'RIGHT']
    if button not in valid_buttons:
        logger.warning(f"Invalid button: {button}")
        emit('button_response', {'status': 'error', 'message': 'Invalid button'})
        return
    
    if action not in ['press', 'release']:
        logger.warning(f"Invalid action: {action}")
        emit('button_response', {'status': 'error', 'message': 'Invalid action'})
        return
    
    logger.info(f"Button event from {client_ip}: Button {button} - {action}")
    
    try:
        if action == 'press':
            press_button(button)
        elif action == 'release':
            release_button(button)
        
        emit('button_response', {
            'status': 'success',
            'button': button,
            'action': action,
            'timestamp': timestamp
        })
        
    except Exception as e:
        logger.error(f"Error handling button event: {e}")
        emit('button_response', {'status': 'error', 'message': str(e)})


@socketio.on('ping')
def handle_ping(data):
    """
    Handle ping messages for connection keep-alive
    """
    emit('pong', {'timestamp': time.time()})


@socketio.on('ddr_download')
def handle_ddr_download(data):
    """
    Download a song (runs in background task with proper session handling)
    """
    song_data = data.get('song_data', {})
    
    if not song_data or not song_data.get('simfile_id'):
        emit('ddr_download_status', {
            'status': 'error',
            'message': 'Invalid song data'
        })
        return
    
    download_id = str(uuid.uuid4())
    song_name = song_data.get('name', 'Unknown')
    logger.info(f"Starting download: {song_name} ({download_id})")
    
    # Get the session ID to emit back to this specific client
    # Flask-SocketIO adds 'sid' attribute to the request object
    session_id = request.sid
    
    def progress_callback(update):
        """Send progress updates to client"""
        update['download_id'] = download_id
        # Use socketio.emit with 'to' to send to specific session
        socketio.emit('ddr_download_status', update, to=session_id)
    
    # Use socketio.start_background_task to run download in background
    socketio.start_background_task(
        ddr_handler.download_and_extract,
        song_data,
        download_id,
        progress_callback
    )
    
    emit('ddr_download_status', {
        'status': 'started',
        'message': f'Downloading {song_name}...',
        'download_id': download_id
    })


def release_all_buttons():
    """
    Release all currently pressed buttons
    """
    with key_lock:
        for button_name, key in list(active_keys):
            try:
                keyboard.release(key)
                logger.info(f"Released button {button_name} during cleanup")
            except Exception as e:
                logger.error(f"Error releasing button {button_name}: {e}")
        active_keys.clear()


def run_server():
    """
    Run the Flask server
    """
    logger.info("=" * 60)
    logger.info("WebHID Server Starting")
    logger.info("=" * 60)
    logger.info(f"Server IP: {LOCAL_IP}")
    logger.info(f"Server Port: {PORT}")
    logger.info(f"Access via: http://{LOCAL_IP}:{PORT}")
    
    if ZEROCONF_AVAILABLE:
        logger.info(f"mDNS Address: http://{MDNS_FULL_NAME}")
    
    logger.info(f"Button A Key: {BUTTON_A_KEY}")
    logger.info(f"Button B Key: {BUTTON_B_KEY}")
    logger.info("=" * 60)
    
    # Initialize DDR handler
    if ddr_handler.initialize():
        logger.info("✅ DDR Handler initialized successfully")
    else:
        logger.warning("⚠️ DDR Handler not available (ikacache not found)")
    logger.info("=" * 60)
    
    # Set up mDNS
    setup_mdns()
    
    try:
        # Start the server
        socketio.run(
            app,
            host=HOST,
            port=PORT,
            debug=DEBUG,
            use_reloader=False,
            allow_unsafe_werkzeug=True
        )
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
    finally:
        # Clean up
        release_all_buttons()
        cleanup_mdns()
        logger.info("Server stopped")


if __name__ == '__main__':
    run_server()
