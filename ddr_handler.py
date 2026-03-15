"""
DDR Song Download Handler
Integrates with StepMania song downloader
"""

import os
import re
import sys
import zipfile
import shutil
import subprocess
import requests
import xml.etree.ElementTree as ET
import threading
import logging

logger = logging.getLogger(__name__)

# Configuration
CACHE_FILE = "StepManiaLocation.ikacache"
STEPMANIA_EXE_NAME = "StepMania.exe" if sys.platform in ["win32", "cygwin"] else "stepmania"
STEPMANIA_ROOT_DIR = None
STEPMANIA_SONGS_DIR = None

# Zenius search settings
ZENIUS_URL = "https://zenius-i-vanisher.com/v5.2/simfiles_search_ajax.php"
ZENIUS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://zenius-i-vanisher.com",
    "Referer": "https://zenius-i-vanisher.com/v5.2/simfiles.php"
}

# Track active downloads
active_downloads = {}


def initialize():
    """Initialize the DDR handler by setting up StepMania directory"""
    global STEPMANIA_ROOT_DIR, STEPMANIA_SONGS_DIR
    
    try:
        # Check cache file
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r") as f:
                cached_path = f.read().strip()
                if sys.platform in ["win32", "cygwin"]:
                    exe_path = os.path.join(cached_path, "Program", STEPMANIA_EXE_NAME)
                else:
                    exe_path = os.path.join(cached_path, STEPMANIA_EXE_NAME)
                if os.path.exists(exe_path):
                    STEPMANIA_ROOT_DIR = cached_path
                    logger.info(f"Using cached StepMania location: {STEPMANIA_ROOT_DIR}")
                else:
                    logger.warning("Cached StepMania location is invalid")
                    return False
        else:
            logger.error("StepManiaLocation.ikacache file not found")
            return False
        
        if STEPMANIA_ROOT_DIR is None:
            STEPMANIA_ROOT_DIR = '/home/pi/stepmania'
        
        # Set songs directory
        STEPMANIA_SONGS_DIR = os.path.join(STEPMANIA_ROOT_DIR, "Songs", "AutoDownloaded")
        os.makedirs(STEPMANIA_SONGS_DIR, exist_ok=True)
        
        logger.info(f"StepMania root: {STEPMANIA_ROOT_DIR}")
        logger.info(f"Songs directory: {STEPMANIA_SONGS_DIR}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize DDR handler: {e}")
        return False


def search_songs(song_title, song_artist):
    """
    Search for songs on Zenius
    
    Args:
        song_title: Song name to search
        song_artist: Artist name to search
    
    Returns:
        List of search results or empty list on error
    """
    try:
        data = {
            "songtitle": song_title,
            "songartist": song_artist
        }
        
        response = requests.post(ZENIUS_URL, headers=ZENIUS_HEADERS, data=data, timeout=10)
        html = response.text
        
        # Fix XML parsing issues
        html = re.sub(r'&(?!amp;|lt;|gt;)', '&amp;', html)
        root = ET.ElementTree(ET.fromstring(f"<root>{html}</root>"))
        rows = root.findall(".//tr")
        
        search_results = []
        for row in rows[2:]:
            columns = row.findall("td")
            if len(columns) < 4:
                continue
            
            name_tag = columns[0].find("a")
            song_name = name_tag.text.strip() if name_tag is not None and name_tag.text else "Unknown"
            song_link = "https://zenius-i-vanisher.com/v5.2/" + name_tag.attrib["href"] if name_tag is not None and "href" in name_tag.attrib else "No link"
            sp_difficulty = columns[1].text.strip() if columns[1].text else "-"
            dp_difficulty = columns[2].text.strip() if columns[2].text else "-"
            category_tag = columns[3].find("a")
            category = category_tag.text.strip() if category_tag is not None and category_tag.text else "Unknown"
            
            simfile_id = re.search(r"simfileid=(\d+)", song_link)
            simfile_id = simfile_id.group(1) if simfile_id else None
            
            search_results.append({
                "name": song_name,
                "link": song_link,
                "sp": sp_difficulty,
                "dp": dp_difficulty,
                "category": category,
                "simfile_id": simfile_id
            })
        
        logger.info(f"Found {len(search_results)} results for '{song_title}' by '{song_artist}'")
        return search_results
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        return []


def download_and_extract(song_data, download_id=None, callback=None):
    """
    Download and extract a song
    
    Args:
        song_data: Dictionary with song information
        download_id: Unique ID for tracking this download
        callback: Function to call with progress updates
    """
    global active_downloads
    global STEPMANIA_SONGS_DIR
    global STEPMANIA_ROOT_DIR
    
    if not song_data.get("simfile_id"):
        logger.error(f"Invalid simfile ID for {song_data.get('name')}")
        if callback:
            callback({"status": "error", "message": "Invalid simfile ID"})
        return
    
    try:
        simfile_id = song_data["simfile_id"]
        song_name = song_data["name"]
        
        download_url = f"https://zenius-i-vanisher.com/v5.2/download.php?type=ddrsimfile&simfileid={simfile_id}"
        
        logger.info(f"Starting download: {song_name}")
        if callback:
            callback({"status": "progress", "message": "Downloading..."})

        if (STEPMANIA_SONGS_DIR is None):
            if STEPMANIA_ROOT_DIR is None:
                STEPMANIA_ROOT_DIR = '/home/pi/stepmania'
            STEPMANIA_SONGS_DIR = os.path.join(STEPMANIA_ROOT_DIR, "Songs", "AutoDownloaded")
        
        logger.info(f"Using songs directory: {STEPMANIA_SONGS_DIR}")

        
        zip_filename = os.path.join(STEPMANIA_SONGS_DIR, f"{song_name}.zip")
        temp_extract_folder = os.path.join(STEPMANIA_SONGS_DIR, f"{song_name}_temp")
        final_extract_folder = os.path.join(STEPMANIA_SONGS_DIR, song_name)
        
        # Download the file
        response = requests.get(download_url, headers=ZENIUS_HEADERS, stream=True, timeout=30)
        response.raise_for_status()
        
        with open(zip_filename, "wb") as f:
            for chunk in response.iter_content(8192):
                if chunk:
                    f.write(chunk)
        
        logger.info(f"Downloaded to: {zip_filename}")
        if callback:
            callback({"status": "progress", "message": "Extracting..."})
        
        # Extract the file
        with zipfile.ZipFile(zip_filename, "r") as zip_ref:
            zip_ref.extractall(temp_extract_folder)
        
        logger.info(f"Extracted to: {temp_extract_folder}")
        
        # Reorganize extracted contents
        extracted_contents = os.listdir(temp_extract_folder)
        if len(extracted_contents) == 1 and os.path.isdir(os.path.join(temp_extract_folder, extracted_contents[0])):
            extracted_main_folder = os.path.join(temp_extract_folder, extracted_contents[0])
            shutil.move(extracted_main_folder, final_extract_folder)
        else:
            os.makedirs(final_extract_folder, exist_ok=True)
            for item in extracted_contents:
                shutil.move(os.path.join(temp_extract_folder, item), final_extract_folder)
        
        logger.info(f"Moved to final location: {final_extract_folder}")
        
        # Cleanup
        os.remove(zip_filename)
        shutil.rmtree(temp_extract_folder, ignore_errors=True)
        
        logger.info(f"Download completed: {song_name}")
        if callback:
            callback({"status": "success", "message": f"Successfully downloaded {song_name}"})
        
    except Exception as e:
        logger.error(f"Download failed: {e}")
        if callback:
            callback({"status": "error", "message": str(e)})
    finally:
        if download_id and download_id in active_downloads:
            del active_downloads[download_id]


def start_download_thread(song_data, download_id, callback=None):
    """
    Start a download in a background thread
    
    Args:
        song_data: Dictionary with song information
        download_id: Unique ID for tracking
        callback: Function to call with progress updates
    """
    active_downloads[download_id] = {
        "song": song_data,
        "status": "downloading"
    }
    
    thread = threading.Thread(
        target=download_and_extract,
        args=(song_data, download_id, callback),
        daemon=True
    )
    thread.start()


def get_download_status(download_id):
    """Get current download status"""
    return active_downloads.get(download_id, {"status": "unknown"})


def cancel_download(download_id):
    """Cancel an active download (best effort)"""
    if download_id in active_downloads:
        del active_downloads[download_id]
        logger.info(f"Cancelled download: {download_id}")
