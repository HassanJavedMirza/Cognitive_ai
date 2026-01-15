# test_auto_start.py
import sys
import subprocess
import time
from pylsl import resolve_byprop

def test_auto_start():
    print("Testing automatic Muse startup...")
    
    # Kill any existing
    if sys.platform == "win32":
        import os
        os.system('taskkill /f /im muselsl.exe 2>nul')
    
    time.sleep(2)
    
    # Start using our method
    python_exe = sys.executable
    cmd = f'"{python_exe}" -m muselsl stream'
    
    print(f"Starting: {cmd}")
    
    # Start with CREATE_NEW_CONSOLE on Windows
    creationflags = subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0
    
    process = subprocess.Popen(
        cmd,
        shell=True,
        creationflags=creationflags
    )
    
    print(f"Process started (PID: {process.pid})")
    print("Waiting 10 seconds for stream...")
    
    for i in range(10):
        streams = resolve_byprop('type', 'EEG', timeout=1)
        if streams:
            print(f"✅ Stream detected after {i+1} seconds!")
            process.terminate()
            return True
        print(f"  {i+1}/10...")
        time.sleep(1)
    
    print("❌ No stream detected")
    process.terminate()
    return False

if __name__ == "__main__":
    success = test_auto_start()
    if success:
        print("\n🎉 Auto-start works! Your backend should now connect automatically.")
    else:
        print("\n⚠️ Auto-start failed. Muse may need manual connection.")
    
    input("Press Enter to exit...")