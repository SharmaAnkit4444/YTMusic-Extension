# 🎧 YouTube Music Controller Extension

A Chrome extension that lets you control **YouTube Music** directly from your browser popup — without switching tabs.

---

## 🚀 Features

### 🎵 Playback Controls
- Play / Pause music
- Skip to next track
- Go to previous track

### 🔀 Smart Controls
- Toggle **Shuffle**
- Toggle **Repeat**
- Syncs with actual YouTube Music player state

### 📊 Real-Time Track Info
- Displays current **song title**
- Shows **artist name**
- Updates automatically every second

### ⏱️ Progress Tracking
- Live progress bar
- Current time & total duration
- Click on progress bar to seek

### 🔊 Volume Control
- Adjust volume directly from popup
- Synced with YouTube Music player

---

## 🧠 How It Works

This extension connects to an open **YouTube Music tab** and interacts with the player using Chrome's scripting API.

### Key Concepts:

- Uses `chrome.tabs` to detect active YouTube Music tab  
- Injects scripts via `chrome.scripting.executeScript`  
- Controls playback by interacting with:
  - Video element (`<video>`)
  - YouTube Music control buttons
- Fetches real-time data like:
  - Track title
  - Artist
  - Playback state
  - Progress & duration

---

##  📂 Project Structure
    📁 YTMusic-Extension
    ├── popup.html      # UI layout
    ├── popup.js        # Logic & YouTube Music interaction
    ├── manifest.json   # Extension config
    └── README.md

---

## ⚙️ Installation (Local Setup)

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/YTMusic-Extension.git

2.Open Chrome and go to:
  chrome://extensions/Enable Developer Mode (top right)

3.Enable Developer Mode (top right)

4.Click Load unpacked

5.Select the project folder

6.Open YouTube Music:
  https://music.youtube.com/

7.Click the extension icon and now you can control your music.

---

## 🤝 Contributing
Feel free to fork this repo and improve it!

## 👨‍💻 Author
Ankit Sharma