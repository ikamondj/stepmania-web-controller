# 🚀 WebHID Server - Getting Started

Your complete WebSocket button controller is ready to use!

## ⚡ Quick Start (30 seconds)

### 1. Start the Server
- Double-click **`run.bat`** in this folder
- Wait for messages showing startup complete
- Note the IP address shown (e.g., `192.168.1.100`)

### 2. Open on Your Phone
- Connect phone to same WiFi as computer
- Open browser
- Go to: `http://192.168.1.100:5000` (use your IP)
- Or try: `http://webcontroller.local` (if mDNS works)

### 3. Test the Buttons
- **Green Button** (top) = Button A
- **Red Button** (bottom) = Button B
- Press and hold to activate
- Should trigger keyboard keys on your computer

### 4. Stop the Server
- Press `Ctrl+C` in the command window

**That's it!** 🎉

---

## 📁 Project Files

### Core Application
- **app.py** - Main server (WebSocket, Flask)
- **config.py** - Settings and customization
- **run.bat** - Windows startup script

### Web Interface
- **templates/index.html** - Phone web page
- **static/style.css** - Styling
- **static/script.js** - Button controls

### Documentation (Pick Your Level)
1. **QUICKSTART.md** - 60-second setup
2. **README.md** - Complete guide
3. **CONFIG_CHEATSHEET.md** - Config reference
4. **WINDOWS_TROUBLESHOOTING.md** - Common issues
5. **PROJECT_SUMMARY.md** - What was built

### Examples & Reference
- **config_examples.py** - Configuration examples
- **requirements.txt** - Python dependencies
- **.gitignore** - Git configuration

---

## 🎮 Use Cases

### Media Control
- Play/Pause music or videos
- Next/Previous track
- Volume up/down

### Gaming
- Jump and sprint buttons
- Game-specific controls
- Any keyboard-controlled game

### Presentations
- Next/Previous slide
- Fullscreen toggle
- Remote pointer control

### Home Automation
- Control any app with keyboard shortcuts
- Smart home integrations
- Any PC-based control system

---

## ⚙️ Customization

### Change Button Keys (5 minutes)

Edit **config.py**:
```python
BUTTON_A_KEY = "space"    # Green button = spacebar
BUTTON_B_KEY = "shift"    # Red button = shift key
```

Save and restart server (Ctrl+C, then run.bat again).

### Common Key Values:
- Letters: `"a"`, `"b"`, `"space"`, `"enter"`
- Navigation: `"page_down"`, `"page_up"`, `"right"`, `"left"`
- Function: `"f1"` through `"f20"`
- Media: `"media_play_pause"`, `"media_next"`

See **CONFIG_CHEATSHEET.md** for full reference.

### Change Port (3 minutes)

Edit **config.py**:
```python
PORT = 8080  # Instead of 5000
```

Then access via: `http://192.168.1.100:8080`

### Change Hostname (2 minutes)

Edit **config.py**:
```python
MDNS_NAME = "myremote"  # Instead of "webcontroller"
```

Then access via: `http://myremote.local`

---

## 🔧 System Requirements

✅ **Have:**
- Python 3.7+ (download from python.org)
- Windows 10/11
- WiFi network
- Phone with browser

❌ **Don't Need:**
- Special apps on phone (browser only!)
- Administrator rights (usually)
- Internet connection (local network only)
- Any other software

---

## 📱 How It Works

```
1. You press button on phone
          ↓
2. Phone sends WebSocket message to server
          ↓
3. Server receives message
          ↓
4. Server simulates keyboard key press
          ↓
5. Your computer/application receives the key
          ↓
6. Application responds as if you pressed the key
```

**Result**: Full physical keyboard simulation over WiFi! 🎯

---

## ❓ Troubleshooting

### Buttons don't work
- ✅ Is target app window in focus? (Click in it first)
- ✅ Try testing with Notepad first
- ✅ Check button keys in config.py are correct

### Can't connect from phone
- ✅ Both on same WiFi? (Same network name)
- ✅ Using IP instead of hostname? (Try that first)
- ✅ Firewall allowing? (See WINDOWS_TROUBLESHOOTING.md)

### Port already in use
- ✅ Change PORT in config.py
- ✅ Or find what's using it (see troubleshooting guide)

### mDNS not working
- ✅ Use IP address instead (works just fine!)
- ✅ Some networks block .local addresses (normal)

**Need more help?** See **WINDOWS_TROUBLESHOOTING.md**

---

## 🎓 Learning Resources

### For Users
- Start with **QUICKSTART.md** (5 min read)
- Check **CONFIG_CHEATSHEET.md** for key names
- Use **README.md** for deeper understanding

### For Developers
- Review **app.py** (292 lines, well-commented)
- Check **static/script.js** (WebSocket client)
- See **config_examples.py** for advanced setups

### For Troubleshooting
- **WINDOWS_TROUBLESHOOTING.md** - Windows-specific issues
- Check console output when server runs
- Look for error messages (they're helpful!)

---

## 🔐 Security Note

⚠️ **For Home Network Use:**
- Works great on trusted home networks
- No authentication (friends/family can control)
- Do NOT expose to internet
- Do NOT use on shared networks (school/work)

**It's designed for home use only.** Perfect for controlling your own computer from your phone! ✅

---

## 📊 What This Can Do

✅ **Can:**
- Control any Windows keyboard-based software
- Work from anywhere on your WiFi
- Handle multiple simultaneous connections
- Auto-detect network IP
- Accessible by hostname (webcontroller.local)
- Customize any button to any key

❌ **Cannot:**
- Control mouse movements
- Work outside home network (by design)
- Control secure/protected applications
- Bypass Windows permissions
- Work if app window isn't focused

---

## 🚀 Next Steps

1. **Right now**: Double-click `run.bat`
2. **In 1 minute**: Try it from your phone
3. **In 5 minutes**: Customize button keys (optional)
4. **Now you're done!**: Use it however you want

---

## 💡 Pro Tips

1. **Test Locally First** - Open browser on same computer before trying phone
2. **Focus Matters** - Click in target app window so it receives key presses
3. **IP vs Hostname** - If `.local` doesn't work, use IP address
4. **Keep Config.py** - Save a copy before making changes
5. **Restart on Changes** - Stop server (Ctrl+C) and restart (run.bat)

---

## 🎉 You're Ready!

**Next action**: Double-click **run.bat**

Questions? Check documentation files in this folder.

Enjoy your remote button controller! 🎮

---

## Files at a Glance

| File | What It Is | When to Open |
|------|-----------|--------------|
| **run.bat** | ▶️ Click to start | Every time you want to use it |
| **CONFIG_CHEATSHEET.md** | 📋 Key reference | Need to change button keys |
| **QUICKSTART.md** | ⚡ Fast setup | First time setup |
| **README.md** | 📖 Full manual | Want to understand everything |
| **WINDOWS_TROUBLESHOOTING.md** | 🔧 Fix issues | Something doesn't work |
| **config.py** | ⚙️ Settings | Want to customize |
| **PROJECT_SUMMARY.md** | 📊 What was built | Curious about architecture |

---

**Start now**: `run.bat` ▶️
