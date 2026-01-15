# muse_config.py
import sys
import subprocess

def get_muse_command():
    """Get the proper command to start muselsl based on platform"""
    python_exe = sys.executable
    
    if sys.platform == "win32":
        # Windows: Use CREATE_NEW_CONSOLE to give muselsl its own window
        return {
            "cmd": f'"{python_exe}" -m muselsl stream',
            "creationflags": subprocess.CREATE_NEW_CONSOLE,
            "shell": True
        }
    else:
        # Mac/Linux
        return {
            "cmd": "muselsl stream",
            "creationflags": 0,
            "shell": True
        }

def kill_existing_muse():
    """Kill any existing muselsl processes"""
    import os
    import time
    
    try:
        if sys.platform == "win32":
            os.system('taskkill /f /im muselsl.exe 2>nul')
            os.system('taskkill /f /im python.exe /fi "WINDOWTITLE eq muselsl*" 2>nul')
        else:
            os.system('pkill -f muselsl 2>/dev/null')
        time.sleep(2)
        return True
    except:
        return False