# Configuration Cheat Sheet

Quick reference for customizing config.py

## Quick Changes

### Change Port
```python
PORT = 8080  # Instead of 5000
```
Access via: `http://192.168.1.100:8080`

### Change Hostname
```python
MDNS_NAME = "mycontroller"
```
Access via: `http://mycontroller.local`

### Change Button Keys
```python
BUTTON_A_KEY = "space"     # Space bar
BUTTON_B_KEY = "shift"     # Shift key
```

---

## Common Key Mappings

### Single Characters
```python
BUTTON_A_KEY = "a"
BUTTON_B_KEY = "b"
```
- Any letter: "a", "b", "c", ..., "z"
- Any number: "0", "1", "2", ..., "9"
- Special: "@", "#", "$", "%", etc.

### Common Keys (String names)
```python
BUTTON_A_KEY = "space"      # Space bar
BUTTON_A_KEY = "enter"      # Enter/Return
BUTTON_A_KEY = "backspace"  # Backspace
BUTTON_A_KEY = "tab"        # Tab
BUTTON_A_KEY = "escape"     # Escape
```

### Function Keys
```python
BUTTON_A_KEY = "f1"         # F1 through F20
BUTTON_B_KEY = "f5"         # F5 (common for refresh)
```

### Arrow Keys
```python
BUTTON_A_KEY = "up"         # Up arrow
BUTTON_A_KEY = "down"       # Down arrow
BUTTON_A_KEY = "left"       # Left arrow
BUTTON_A_KEY = "right"      # Right arrow
```

### Modifier Keys
```python
BUTTON_A_KEY = "shift"      # Shift key
BUTTON_A_KEY = "ctrl"       # Ctrl key
BUTTON_A_KEY = "alt"        # Alt key
```

### Page Navigation
```python
BUTTON_A_KEY = "page_up"    # Page Up
BUTTON_B_KEY = "page_down"  # Page Down
BUTTON_A_KEY = "home"       # Home key
BUTTON_B_KEY = "end"        # End key
```

### Media Controls (if supported)
```python
BUTTON_A_KEY = "media_play_pause"
BUTTON_B_KEY = "media_next"
BUTTON_A_KEY = "media_previous"
BUTTON_B_KEY = "media_volume_up"
```

---

## Use Case Presets

### Gaming - FPS
```python
BUTTON_A_KEY = "w"         # Forward
BUTTON_B_KEY = "s"         # Backward
```

### Gaming - General
```python
BUTTON_A_KEY = "space"     # Jump
BUTTON_B_KEY = "shift"     # Sprint/Run
```

### Presentation Control
```python
BUTTON_A_KEY = "right"     # Next slide
BUTTON_B_KEY = "left"      # Previous slide
```

### Music Player
```python
BUTTON_A_KEY = "space"     # Play/Pause
BUTTON_B_KEY = "n"         # Next song (common)
```

### Video Player
```python
BUTTON_A_KEY = "space"     # Play/Pause
BUTTON_B_KEY = "f"         # Fullscreen
```

### Browser Navigation
```python
BUTTON_A_KEY = "f11"       # Fullscreen (or F11)
BUTTON_B_KEY = "backspace" # Go back
```

### Document Editing
```python
BUTTON_A_KEY = "page_down" # Scroll down
BUTTON_B_KEY = "page_up"   # Scroll up
```

### Zoom Meeting (Alt+Letter combinations)
```python
# Note: These need special handling
# For now, use simple keys:
BUTTON_A_KEY = "a"         # Alt+A for mute (in Zoom)
BUTTON_B_KEY = "v"         # Alt+V for video (in Zoom)
```

---

## Advanced Configuration

### Multiple Key Press Duration
```python
KEY_PRESS_DURATION = 0.1    # Seconds (default)
KEY_PRESS_DURATION = 0.05   # Faster response
KEY_PRESS_DURATION = 0.5    # Longer hold
```

### Network Configuration
```python
# Listen on all interfaces (default)
HOST = "0.0.0.0"

# Or bind to specific IP (not usually needed)
HOST = "192.168.1.100"

# Default port
PORT = 5000

# With custom port
PORT = 8080
PORT = 9000
```

### mDNS Configuration
```python
MDNS_NAME = "webcontroller"   # Default
MDNS_DOMAIN = "local"          # Standard domain
MDNS_FULL_NAME = "webcontroller.local"  # Full name

# Examples:
MDNS_NAME = "remotecontrol"    # remotecontrol.local
MDNS_NAME = "gamepad"          # gamepad.local
```

---

## Testing Your Config

### Step 1: Start Server
```bash
run.bat
```
Wait for startup messages.

### Step 2: Test Locally
```
http://localhost:5000
```
Try buttons in desktop browser first.

### Step 3: Test from Phone
```
http://192.168.1.100:5000
```
(Use IP from server startup output)

### Step 4: Verify Application Response
1. Open target application (game, media player, etc.)
2. Click in its window to focus it
3. Use buttons - should see application respond

---

## Debugging Config Issues

### Buttons don't work
1. Check config.py has correct key names
2. Ensure target app window is in focus
3. Test with Notepad first (should type letters)
4. Try a simple letter like "a" or "b"

### Server won't start
1. Check port not in use: `netstat -ano | findstr :5000`
2. Try different port in config.py
3. Check Python installation

### Connection issues
1. Use IP address instead of .local
2. Check both devices on same WiFi
3. Disable phone VPN temporarily

---

## Common Mistakes

❌ **Wrong**: `BUTTON_A_KEY = Key.space`
✅ **Correct**: `BUTTON_A_KEY = "space"`

❌ **Wrong**: `BUTTON_A_KEY = ["a", "b"]`
✅ **Correct**: Choose one: `BUTTON_A_KEY = "a"`

❌ **Wrong**: `PORT = "5000"`
✅ **Correct**: `PORT = 5000` (integer)

❌ **Wrong**: `BUTTON_A_KEY = Key.alt_l + "a"`  (not directly supported)
✅ **Alternative**: Use simple key or handle in code

---

## After Changing config.py

1. Save the file (Ctrl+S)
2. Restart the server:
   - Stop current server (Ctrl+C)
   - Run `run.bat` again
   - New config will be loaded

---

## Config.py Full Template

```python
"""Configuration settings for WebHID Server"""
import socket

# Server configuration
HOST = "0.0.0.0"
PORT = 5000
DEBUG = True

# Get local IP (automatic)
def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

LOCAL_IP = get_local_ip()

# mDNS/Bonjour hostname
MDNS_NAME = "webcontroller"
MDNS_DOMAIN = "local"
MDNS_FULL_NAME = f"{MDNS_NAME}.{MDNS_DOMAIN}"

# Virtual button configuration
BUTTON_A_KEY = "a"              # Green button (top)
BUTTON_B_KEY = "b"              # Red button (bottom)

# Time in seconds to hold key on press
KEY_PRESS_DURATION = 0.1
```

---

## Example Scenarios

### Scenario 1: Media Control PC
```python
BUTTON_A_KEY = "media_play_pause"
BUTTON_B_KEY = "media_next"
PORT = 5000
MDNS_NAME = "mediaremote"
```
Access: `http://mediaremote.local`

### Scenario 2: Game Companion
```python
BUTTON_A_KEY = "space"
BUTTON_B_KEY = "shift"
PORT = 5000
MDNS_NAME = "gamepad"
KEY_PRESS_DURATION = 0.05
```
Access: `http://gamepad.local`

### Scenario 3: Presentation Remote
```python
BUTTON_A_KEY = "right"
BUTTON_B_KEY = "left"
PORT = 8080
MDNS_NAME = "presenter"
```
Access: `http://presenter.local:8080`

### Scenario 4: Document Scrolling
```python
BUTTON_A_KEY = "page_down"
BUTTON_B_KEY = "page_up"
PORT = 5000
MDNS_NAME = "document"
```
Access: `http://document.local`

---

## Need Help?

- Full guide: **README.md**
- Setup guide: **QUICKSTART.md**
- Windows issues: **WINDOWS_TROUBLESHOOTING.md**
- Examples: **config_examples.py**

---

**Pro Tip**: Keep a backup of config.py before making changes!
