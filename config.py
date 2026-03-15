"""
Configuration settings for WebHID Server
"""
import socket

# Server configuration
HOST = "0.0.0.0"  # Listen on all interfaces
PORT = 5000
DEBUG = True

# Get local IP address
def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

LOCAL_IP = get_local_ip()

# mDNS/Bonjour hostname (for http://webcontroller.local)
MDNS_NAME = "webcontroller"
MDNS_DOMAIN = "local"
MDNS_FULL_NAME = f"{MDNS_NAME}.{MDNS_DOMAIN}"

# Virtual button configuration
BUTTON_A_KEY = "a"  # Key to press/release for button A
BUTTON_B_KEY = "b"  # Key to press/release for button B

# Time in seconds to hold key on press
KEY_PRESS_DURATION = 0.1
