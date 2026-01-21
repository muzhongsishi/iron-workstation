from datetime import datetime

def append_to_hardware_md(content: str, file_path: str = "Hardwareinfo.md"):
    """
    Appends raw content to the hardware info file with a timestamp separator.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(file_path, "a", encoding="utf-8") as f:
        f.write(f"\n\n<!-- Added via Admin Panel at {timestamp} -->\n")
        f.write(content)
