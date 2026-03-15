# WebHID Server - Remote Button Controller

A Python-based WebSocket server that hosts a web interface for remote button control on a home network. Connect your phone to a local server that simulates button presses on the host device.

## Features

- 🎯 **Two Large Touch Buttons** - Green button (A) at the top, red button (B) at the bottom
- 📱 **Mobile Optimized** - Responsive design that works on any device with a browser
- 🌐 **WebSocket Communication** - Real-time, low-latency button press/release events
- 🏠 **Home Network Ready** - Hosts on local IP with optional mDNS hostname support
- ⌨️ **Virtual Button Press** - Simulates keyboard key presses on the host system
- 📊 **Live Status Display** - Shows connection status and uptime
- 🔌 **Simple Setup** - One-click startup on Windows

## Requirements

- Python 3.7 or higher
- Windows (or modify for Linux/Mac)
- Modern web browser on phone
- Connected to the same home network

## Installation

### 1. Install Python
- Download from https://www.python.org/
- **Important**: Check "Add Python to PATH" during installation
- Verify installation: Open Command Prompt and run `python --version`

### 2. Set Up the Project

1. Extract/clone this project to a folder
2. Open Command Prompt in the project directory
3. Run the startup script:
   ```
   run.bat
   ```

The script will:
- Create a virtual environment
- Install all required packages
- Start the server

### Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

## Usage

### Starting the Server

1. Double-click `run.bat` (or run `python app.py` in the activated virtual environment)
2. You'll see output showing:
   ```
   Server IP: 192.168.1.100
   Server Port: 5000
   Access via: http://192.168.1.100:5000
   mDNS Address: http://webcontroller.local
   ```

### Accessing from Your Phone

1. Connect your phone to the same WiFi network as the server
2. Open a web browser on your phone
3. Navigate to one of these addresses:
   - `http://{SERVER_IP}:5000` - Using the server's IP address
   - `http://webcontroller.local` - Using mDNS hostname (if available)

**Example:**
- IP address: `http://192.168.1.100:5000`
- mDNS hostname: `http://webcontroller.local`

### Using the Buttons

- **Green Button (A)** - Press and hold at the top of the screen
- **Red Button (B)** - Press and hold at the bottom of the screen
- Works with mouse (desktop), touch (mobile), or keyboard (A/B keys)

## Configuration

Edit `config.py` to customize:

```python
PORT = 5000                    # Web server port
BUTTON_A_KEY = "a"           # Keyboard key for button A
BUTTON_B_KEY = "b"           # Keyboard key for button B
KEY_PRESS_DURATION = 0.1     # How long to hold key (seconds)
MDNS_NAME = "webcontroller"  # Hostname prefix for mDNS
```

### Changing Virtual Keys

To change what keys the buttons simulate, edit `config.py`:

```python
# Button A and B simulated keys
BUTTON_A_KEY = "a"        # Single character or pynput Key
BUTTON_B_KEY = "b"

# Examples:
# "a", "b", "c" - Single characters
# "space", "shift", "ctrl" - Special keys using pynput.keyboard.Key
```

## mDNS / Network Setup

### What is mDNS?

mDNS (Multicast DNS) allows you to access the server by hostname instead of IP address. This is useful because:
- IP addresses can change
- Easier to remember `webcontroller.local`
- Works automatically on most devices

### Requirements for mDNS

- `zeroconf` package (included in requirements.txt)
- Supported on: Windows, Mac, Linux, iOS, Android
- Requires devices on the same network

### If mDNS Doesn't Work

1. Some corporate/guest networks block mDNS
2. Use the IP address instead: `http://192.168.1.100:5000`
3. Check if `webcontroller` appears in your router's device list

## Troubleshooting

### Server won't start
- Ensure Python is in your PATH
- Check if port 5000 is already in use
- Try a different port in `config.py`

### Can't connect from phone
- Ensure phone is on the same WiFi network
- Disable phone's VPN temporarily
- Try using IP address instead of hostname
- Check firewall settings on host machine

### Buttons not working
- Ensure the target application is in focus
- Check that `config.py` has correct key names
- Try testing with keyboard keys first (A/B)
- Some applications may not respond to virtual key presses

### mDNS not working
- Check if `zeroconf` is installed: `pip list | findstr zeroconf`
- Try using IP address instead
- Restart your phone's WiFi connection
- Some networks don't support mDNS

## Project Structure

```
WebHIDServer/
├── app.py                 # Main Flask server with WebSocket
├── config.py             # Configuration settings
├── requirements.txt      # Python dependencies
├── run.bat              # Windows startup script
├── README.md            # This file
├── templates/
│   └── index.html       # Web interface (HTML)
└── static/
    ├── style.css        # Styling (CSS)
    └── script.js        # Client-side logic (JavaScript)
```

## API Reference

### WebSocket Events

#### Client → Server

**button_event**
```javascript
{
  button: "A" | "B",      // Which button was pressed
  action: "press" | "release",  // Key press or release
  timestamp: number       // Milliseconds since epoch
}
```

#### Server → Client

**button_response**
```javascript
{
  status: "success" | "error",
  button: "A" | "B",
  action: "press" | "release",
  message: string        // Error message if applicable
}
```

## Keyboard Support (Desktop Testing)

When accessing from a desktop browser:
- Press and release **A** key to simulate button A
- Press and release **B** key to simulate button B
- Useful for testing without a mobile device

## Performance Tips

1. **Reduce Latency**: Use 5GHz WiFi if available (faster but shorter range)
2. **Stable Connection**: Position device close to WiFi router
3. **Key Press Duration**: Lower values in `config.py` for faster response
4. **Network Congestion**: Reduce other network activity for best performance

## Platform-Specific Notes

### Windows
- Run `run.bat` to start
- Supports all key types via `pynput`
- Requires "run as administrator" if Windows Defender blocks it

### Linux/Mac
- Modify `run.bat` to `run.sh`
- Install dependencies: `pip install -r requirements.txt`
- Note: May require additional permissions for virtual key presses
- Run: `python app.py`

## Advanced Configuration

### Custom Keys with pynput

In `config.py`, you can use special keys:

```python
from pynput.keyboard import Key

BUTTON_A_KEY = Key.space      # Space bar
BUTTON_B_KEY = Key.enter      # Enter key
BUTTON_A_KEY = Key.ctrl_l     # Left Ctrl
```

### Different Port

Change in `config.py`:
```python
PORT = 8080  # Use 8080 instead of 5000
```

Then access via: `http://192.168.1.100:8080`

## Security Notes

⚠️ **Important**: This server is designed for home networks only.

- No authentication is implemented
- Anyone on the network can access and control buttons
- Do not expose to the internet
- Use firewall to restrict external access if needed

## Limitations

- Works on Windows. For other OS, use appropriate key simulation library
- Virtual keys work in focused application only
- Some secure applications may block simulated key presses
- mDNS requires `.local` domain support (not available on all networks)

## Stopping the Server

- Press **Ctrl+C** in the Command Prompt window
- Server will clean up gracefully and release all keys

## License

This project is provided as-is for home use.

## Support

For issues or feature requests, check:
1. Configuration is correct in `config.py`
2. Network connectivity between devices
3. Firewall settings
4. Application focus (buttons may not work if target app is not focused)

---

**Happy controlling!** 🎮
