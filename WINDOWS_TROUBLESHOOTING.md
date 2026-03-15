# Windows-Specific Setup & Troubleshooting

## Python Installation Check

### Verify Python is installed correctly:

1. Open Command Prompt (press `Win+R`, type `cmd`, press Enter)
2. Type: `python --version`
3. You should see: `Python 3.x.x`

If you get "python is not recognized":
- Python is not in your PATH
- Solution: Reinstall Python and check "Add Python to PATH"

### Verify pip (package manager):

In Command Prompt, type: `pip --version`

You should see: `pip x.x.x from ...`

---

## Virtual Environment Troubleshooting

### If `run.bat` fails on "Activating virtual environment":

**Solution 1: Manual activation**
```batch
venv\Scripts\activate
```

**Solution 2: Run as Administrator**
- Right-click `run.bat` → "Run as administrator"

**Solution 3: Check execution policy**
```powershell
# In PowerShell (admin mode):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Port Already in Use

### Error: "Address already in use" on port 5000

**Solution 1: Use different port**
1. Edit `config.py`
2. Change: `PORT = 5000` to `PORT = 8080`
3. Start server again
4. Access via: `http://localhost:8080`

**Solution 2: Find and kill process using port**
```batch
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

**Solution 3: Use netsh (admin mode)**
```batch
# In PowerShell as Administrator:
netsh int ipv4 show portacl | findstr 5000
```

---

## Firewall Issues

### Phone can't connect: "Connection timed out"

**Solution 1: Allow Python through Firewall**
1. Windows Settings → Privacy & Security → Firewall & network protection
2. Click "Allow an app through firewall"
3. Click "Change settings"
4. Click "Allow another app..."
5. Browse to Python.exe (in project's `venv\Scripts\`)
6. Click "Add"
7. Ensure both "Private" and "Public" are checked
8. Click "OK"

**Solution 2: Temporarily disable firewall (testing only!)**
```powershell
# PowerShell as Administrator - TEMPORARY ONLY
netsh advfirewall set allprofiles state off
# Re-enable with:
netsh advfirewall set allprofiles state on
```

**Solution 3: Forward port (router)**
1. Access router settings (usually 192.168.1.1 or 192.168.0.1)
2. Find "Port Forwarding"
3. Forward port 5000 to your computer's IP
4. Note: This makes it accessible outside home network (security risk!)

---

## Network Issues

### Can't find server's IP address

**Find your computer's IP:**
```batch
# In Command Prompt:
ipconfig

# Look for "IPv4 Address" under your network adapter
# Usually looks like: 192.168.X.X
```

### Phone won't stay connected

**Solution 1: Check WiFi connection**
- Ensure phone and computer on same WiFi network
- Same network name (SSID)
- Not on 2.4GHz vs 5GHz separately

**Solution 2: Restart WiFi**
- Restart phone (turn WiFi off/on)
- Restart computer WiFi adapter
- Restart router

**Solution 3: Check router's DHCP**
- Router may have assigned different IP after restart
- Get new IP with: `ipconfig` command
- Try new address on phone

---

## mDNS (.local) Not Working

### "Cannot reach webcontroller.local"

**Solution 1: Use IP address instead**
- mDNS doesn't work on all networks
- IP address (192.168.1.100:5000) works just as well

**Solution 2: Check zeroconf installation**
```batch
# In Command Prompt with venv activated:
pip list | findstr zeroconf

# Should show: zeroconf   0.68.0
```

**Solution 3: Install/Reinstall mDNS support**
```batch
# Activate venv first:
venv\Scripts\activate

# Then:
pip install zeroconf==0.68.0
```

**Solution 4: Some routers block mDNS**
- Corporate/guest networks often disable mDNS
- Use IP address instead

---

## Virtual Keys Not Working

### Buttons press but nothing happens

**Solution 1: Target app must be focused**
- Click in the application window to focus it
- Keys only work in focused windows

**Solution 2: Some apps block virtual key presses**
- Games, VMs, secure apps may block pynput
- Try with Notepad first: Open Notepad, click in it, use buttons

**Solution 3: Check key configuration**
```python
# In config.py, verify:
BUTTON_A_KEY = "a"  # Try simple letter first
BUTTON_B_KEY = "b"

# Test with keyboard:
# Press 'A' key - does whatever app expects?
# If yes, buttons should work
# If no, app might not be focused
```

**Solution 4: Test with Notepad**
1. Start server
2. Open Notepad (click in text area)
3. Use buttons - should type letters
4. If this works, your setup is correct

---

## Permissions/UAC Issues

### "Access Denied" or app requires admin privileges

**Solution 1: Run as Administrator**
- Right-click `run.bat` → "Run as administrator"
- Enter admin password if prompted

**Solution 2: Make .bat file run as admin automatically**
1. Right-click `run.bat` → Properties
2. Click "Advanced..."
3. Check "Run as an Administrator"
4. Click OK twice

---

## Python Package Issues

### "ModuleNotFoundError" when running

**Solution: Ensure virtual environment is activated**
```batch
# The prompt should start with (venv)
(venv) C:\Users\...>

# If not, activate it:
venv\Scripts\activate

# Then install packages:
pip install -r requirements.txt
```

### Packages won't install

**Solution 1: Upgrade pip**
```batch
python -m pip install --upgrade pip
```

**Solution 2: Check internet connection**
- pip needs to download packages from internet
- Ensure firewall allows it

**Solution 3: Use different pip index (corporate networks)**
```batch
pip install -r requirements.txt -i https://pypi.org/simple/
```

---

## Performance Issues

### High latency / delayed button presses

**Solution 1: Use 5GHz WiFi**
- More bandwidth, lower congestion
- 2.4GHz is more range but slower

**Solution 2: Reduce KEY_PRESS_DURATION**
```python
# In config.py:
KEY_PRESS_DURATION = 0.05  # Lower values = faster
```

**Solution 3: Reduce network congestion**
- Stop other downloads/streaming
- Close bandwidth-heavy apps
- Restart router if needed

---

## Persistence / Auto-Start

### Run server automatically on startup

**Option 1: Task Scheduler**
1. Press `Win+R`, type `taskschd.msc`, press Enter
2. Right-click "Task Scheduler (Local)" → Create Task
3. General tab: Name = "WebHID Server"
4. Triggers tab: "At startup"
5. Actions tab: "Start a program"
   - Program: `C:\path\to\run.bat`
   - Start in: `C:\path\to\project\`
6. Click OK

**Option 2: Startup folder**
1. Press `Win+R`, type `shell:startup`, press Enter
2. Create shortcut to `run.bat` in this folder

**Option 3: .vbs wrapper (hides console window)**
1. Create `start-server.vbs`:
```vbscript
Set objShell = CreateObject("WScript.Shell")
objShell.Run "C:\path\to\run.bat", 0, False
```
2. Put in startup folder from Option 2

---

## Getting More Help

1. Check if process is running:
   ```batch
   tasklist | findstr python
   ```

2. Check open ports:
   ```batch
   netstat -ano | findstr LISTENING
   ```

3. Check logs (last output before error):
   - Error messages usually indicate the problem
   - Search error message in README.md

4. Verify network connectivity:
   ```batch
   ping 8.8.8.8
   ```

---

## Common Error Messages

| Error | Solution |
|-------|----------|
| "Address already in use" | Change PORT in config.py |
| "Python not found" | Reinstall Python with PATH checked |
| "ModuleNotFoundError" | Activate venv, run: pip install -r requirements.txt |
| "Permission denied" | Run as Administrator |
| "Cannot reach host" | Check WiFi connection, verify IP with ipconfig |
| "Connection refused" | Server not running, start with run.bat |
| "No module named flask" | Virtual environment not activated |

---

## Quick Debug Checklist

- [ ] Python installed and in PATH?
- [ ] Virtual environment exists?
- [ ] Virtual environment activated? (starts with (venv))
- [ ] All packages installed? (pip list)
- [ ] Port 5000 free? (netstat check)
- [ ] Phone on same WiFi?
- [ ] Target app window is focused?
- [ ] config.py keys are correct?
- [ ] Firewall allowing Python.exe?
- [ ] Tried using IP instead of .local?

---

Everything stuck? **Try this:**
1. Close everything
2. Restart computer
3. Open new Command Prompt
4. Navigate to project: `cd path\to\WebHIDServer`
5. Run: `run.bat`
6. Try accessing from phone again

Usually fixes most issues! 🎉
