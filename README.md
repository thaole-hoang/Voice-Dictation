# Nova AI Voice Chat Prototype

A sleek, modern AI chat interface with speech-to-text capabilities.

## Features
- **Speech-to-Text**: Click the microphone icon to dictate your message.
- **Glassmorphism Design**: Premium UI with blur effects and animated backgrounds.
- **Simulated AI**: Basic response simulation with typing indicators.
- **Responsive**: Works on desktop and mobile.

## 🚨 IMPORTANT: Application Setup

**Speech Recognition requires a secure context (HTTPS or localhost).**
It will **NOT** work if you open the `index.html` file directly (file:// protocol) due to browser security policies.

### Recommended: Run with Python Server (Already Started)
I have started a server for you at:
[http://localhost:8080](http://localhost:8080)

If you need to restart it manually:
1. Open a terminal in this folder.
2. Run:
   ```bash
   python3 -m http.server 8080
   ```
3. Open `http://localhost:8080` in Chrome, Edge, or Safari.

### Alternative: VS Code Live Server
1. Install "Live Server" extension.
2. Click "Go Live" at the bottom right.

### Option 3: Node.js (npx)
Run from terminal:
```bash
npx serve
```

## Browser Support
- **Chrome / Edge / Safari**: Fully supported.
- **Firefox**: Requires configuration (SpeechRecognition is experimental).

## Usage
1. Click the **Microphone** icon to start recording.
2. Speak your message. The text will appear in the input field.
3. Click the **Microphone** icon again or **Stop** to finish.
4. Review the text and click **Send**.
