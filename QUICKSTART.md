# Quick Start Guide - WebHID Server

## 60-Second Setup

### Step 1: Install Python (if not already installed)
1. Download from https://www.python.org
2. Run installer
3. **CHECK "Add Python to PATH"**
4. Finish installation

### Step 2: Start the Server
1. Double-click `run.bat` in the project folder
2. Wait for startup messages
3. Note the IP address shown (e.g., `192.168.1.100`)

### Step 3: Connect Your Phone
1. Open browser on your phone
2. Go to `http://192.168.1.100:5000` (use your IP)
3. Or try `http://webcontroller.local` (if mDNS works)

### Step 4: Use the Buttons
- **Green Button (top)** = Button A
- **Red Button (bottom)** = Button B
- Press and hold to press keys

Done! 🎉

---

## Troubleshooting

### "Python not found"
- **Solution**: Reinstall Python, CHECK "Add Python to PATH", restart Command Prompt

### "Port 5000 already in use"
- **Solution**: Edit `config.py`, change `PORT = 5000` to `PORT = 8080`, then try again

### "Can't connect from phone"
- **Solution**: 
  1. Check both devices on same WiFi
  2. Try IP address instead of `.local` hostname
  3. Check Windows Firewall settings

### "Buttons don't work"
- **Solution**:
  1. Make sure target app window is focused/active
  2. Try pressing 'A' or 'B' keys on keyboard first
  3. Check that `config.py` has correct key names

### "mDNS doesn't work"
- **Solution**: Use IP address instead - it works just as well!

---

## Testing Locally

Before using on phone, test on desktop:
1. Open browser on same computer
2. Go to `http://localhost:5000`
3. Click buttons and verify keyboard keys work
4. Then try from mobile device

---

## Customizing Buttons

Edit `config.py`:

```python
BUTTON_A_KEY = "a"    # Change to "space", "enter", etc.
BUTTON_B_KEY = "b"
```

Examples:
- `"a"`, `"b"`, `"1"` - Single character keys
- `"space"` - Space bar
- `"enter"` - Enter/Return key
- `"shift"` - Shift key
- `"ctrl"` - Ctrl key

See `config_examples.py` for more options.

---

## For Gaming

**FPS Controls:**
```python
BUTTON_A_KEY = "w"  # Forward
BUTTON_B_KEY = "s"  # Backward
```

**General Gaming:**
```python
BUTTON_A_KEY = "space"  # Jump
BUTTON_B_KEY = "shift"  # Sprint
```

---

## Network Setup

### Home Network
- Works automatically on local WiFi
- All devices on same WiFi can connect

### Mobile Hotspot
- Server on computer
- Phone creates hotspot
- Computer connects to phone's WiFi
- Then other devices can connect

### Port Forwarding
- DO NOT expose to internet (security risk)
- Only for home network use

---

## Performance Tips

1. **Use 5GHz WiFi** (if available)
2. **Keep devices close to router**
3. **Lower KEY_PRESS_DURATION** for faster response (in `config.py`)
4. **Reduce network congestion**

---

## What Each File Does

| File | Purpose |
|------|---------|
| `run.bat` | Click to start server (Windows) |
| `app.py` | Main server code |
| `config.py` | Settings and key mappings |
| `templates/index.html` | Web page shown on phone |
| `static/style.css` | Button styling and layout |
| `static/script.js` | Phone button controls |
| `requirements.txt` | Python packages needed |

---

## Advanced: Command Line

Open Command Prompt in project folder:

```bash
# Create virtual environment (first time only)
python -m venv venv

# Activate it
venv\Scripts\activate

# Install packages (first time only)
pip install -r requirements.txt

# Run server
python app.py

# Stop server
Ctrl+C
```

---

## Getting Help

1. Check the full README.md
2. Review config.py comments
3. Check config_examples.py for your use case
4. Try testing locally first

---

## Next Steps

- ✅ Server running? Great!
- 🎮 Want different keys? Edit config.py
- 📱 Want on all devices? Share the IP/URL
- 🔧 Want to modify UI? Edit templates/index.html
- 🚀 Want to automate startup? Create Windows Task Scheduler job

Enjoy! 🎉
