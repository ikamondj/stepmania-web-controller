"""
Advanced configuration examples for WebHID Server
Copy and modify these to customize button behavior
"""

# ============================================================
# EXAMPLE 1: Media Control (Volume, Play/Pause)
# ============================================================
# Uncomment to use media controls instead of A/B keys

# from pynput.keyboard import Key
# BUTTON_A_KEY = Key.media_volume_up      # Volume Up
# BUTTON_B_KEY = Key.media_volume_down    # Volume Down


# ============================================================
# EXAMPLE 2: Gaming Controls
# ============================================================
# Common gaming key mappings

# BUTTON_A_KEY = "w"  # Forward/Up
# BUTTON_B_KEY = "s"  # Backward/Down

# Or for more complex mappings:
# BUTTON_A_KEY = "space"   # Jump
# BUTTON_B_KEY = Key.shift  # Sprint/Run


# ============================================================
# EXAMPLE 3: Application-Specific Controls
# ============================================================

# For video player:
# BUTTON_A_KEY = Key.space     # Play/Pause
# BUTTON_B_KEY = Key.right     # Next Frame / Forward

# For music player:
# BUTTON_A_KEY = "p"           # Play/Pause
# BUTTON_B_KEY = "n"           # Next Track

# For web browser:
# BUTTON_A_KEY = Key.f11       # Fullscreen
# BUTTON_B_KEY = Key.backspace # Go back


# ============================================================
# EXAMPLE 4: Presentation Control
# ============================================================

# BUTTON_A_KEY = Key.right     # Next Slide
# BUTTON_B_KEY = Key.left      # Previous Slide


# ============================================================
# EXAMPLE 5: Window Management
# ============================================================

# BUTTON_A_KEY = Key.alt_l + Key.tab  # Alt+Tab (not supported directly)
# BUTTON_B_KEY = Key.f5              # Refresh/Reload


# ============================================================
# EXAMPLE 6: Custom Port and Network Settings
# ============================================================

# To host on a different port:
# PORT = 8080

# To bind to specific IP (not 0.0.0.0):
# HOST = "192.168.1.100"

# To change mDNS hostname:
# MDNS_NAME = "mycontroller"  # Results in mycontroller.local


# ============================================================
# pynput.keyboard.Key Reference
# ============================================================
"""
Special keys available from pynput:

Navigation:
    Key.home, Key.end
    Key.page_up, Key.page_down
    Key.up, Key.down, Key.left, Key.right

Function Keys:
    Key.f1 through Key.f20
    Key.f1, Key.f2, ..., Key.f20

Modifiers:
    Key.shift, Key.shift_l, Key.shift_r
    Key.ctrl, Key.ctrl_l, Key.ctrl_r
    Key.alt, Key.alt_l, Key.alt_r
    Key.cmd (Mac), Key.super_l, Key.super_r (Windows/Linux)

Media:
    Key.media_play_pause
    Key.media_volume_mute
    Key.media_volume_down
    Key.media_volume_up
    Key.media_previous
    Key.media_next

Other:
    Key.backspace, Key.delete
    Key.enter, Key.tab
    Key.space
    Key.caps_lock, Key.num_lock
    Key.print_screen
    Key.scroll_lock
    Key.pause
    Key.insert
    Key.escape
    Key.menu

Simple characters:
    "a", "b", "1", "2", "@", "#", etc.
"""


# ============================================================
# Custom Example: Zoom Control
# ============================================================
"""
For a Zoom meeting controller:

from pynput.keyboard import Key

# Mute/Unmute
BUTTON_A_KEY = Key.alt_l + "a"  # Alt+A for audio toggle

# Video On/Off
BUTTON_B_KEY = Key.alt_l + "v"  # Alt+V for video toggle

Note: Key combinations like Alt+A need to be implemented 
as separate presses/releases in the button handler.
"""
