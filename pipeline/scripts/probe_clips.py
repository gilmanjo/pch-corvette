import subprocess, json, os

src = "/mnt/d/Photos/West Coast Trip/Card Dump/100PDR02"
for fname in sorted(os.listdir(src)):
    if not fname.lower().endswith(".mp4"):
        continue
    fpath = os.path.join(src, fname)
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", fpath],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    fmt = data["format"]
    dur = float(fmt["duration"])
    ctime = fmt.get("tags", {}).get("creation_time", "MISSING")
    print(f"{fname:40s}  dur={dur:8.1f}s ({dur/60:5.1f}m)  created={ctime}")
