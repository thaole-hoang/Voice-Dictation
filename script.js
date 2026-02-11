document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const micBtn = document.getElementById('micBtn');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');

    let recognition;
    let isRecording = false;
    let stopManually = false;
    let baseText = "";

    // Check for browser support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let audioContext;
        let analyser;
        let dataArray;
        let animationId;
        let stream;

        function cleanupResources() {
            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext && audioContext.state !== 'closed') audioContext.close();
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            const stopBtn = document.getElementById('stopBtn');
            if (stopBtn) stopBtn.style.setProperty('--glow-scale', '1');
        }

        // --- SPEECH ENGINE EVENTS ---
        recognition.onstart = () => {
            console.log("Recognition Engine: Online");
            isRecording = true;
            // Capture existing box text
            baseText = chatInput.value;
            if (baseText.length > 0 && !baseText.endsWith(' ')) baseText += ' ';

            // Switch UI immediately
            document.querySelector('.input-wrapper').classList.add('recording');
            document.querySelector('.default-controls').style.display = 'none';
            document.querySelector('.active-controls').style.display = 'flex';
            chatInput.placeholder = "Listening...";
        };

        recognition.onresult = (event) => {
            let sessionText = "";
            for (let i = 0; i < event.results.length; i++) {
                sessionText += event.results[i][0].transcript;
            }

            // LIVE UPDATE: Push directly to input field
            chatInput.value = baseText + sessionText;

            // UI Feedback
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
            chatInput.scrollTop = chatInput.scrollHeight;
        };

        recognition.onerror = (event) => {
            console.error("Mic/Speech Error:", event.error);
            if (event.error === 'not-allowed') {
                alert("Microphone access is required for voice input. Please click 'Allow' in your browser address bar.");
                stopRecording();
            }
        };

        recognition.onend = () => {
            // Auto-restart if we didn't manually stop
            if (isRecording && !stopManually) {
                console.log("Engine timed out, auto-restarting...");
                try { recognition.start(); } catch (e) { }
            }
        };

        // --- CONTROL FUNCTIONS ---
        async function startRecording() {
            stopManually = false;

            // 1. START SPEECH FIRST (Critical for mobile permission)
            try {
                recognition.start();
            } catch (e) {
                console.warn("Recognition already active or blocked:", e);
            }

            // 2. START ANIMATION
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') await audioContext.resume();

                const source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                source.connect(analyser);
                dataArray = new Uint8Array(analyser.frequencyBinCount);

                const renderFrame = () => {
                    if (!isRecording) return;
                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                    let avg = sum / dataArray.length;
                    let scale = 1 + (avg / 128) * 1.5;
                    document.getElementById('stopBtn').style.setProperty('--glow-scale', Math.min(scale, 1.8));
                    animationId = requestAnimationFrame(renderFrame);
                };
                renderFrame();
            } catch (err) {
                console.error("Mic animation failed:", err);
            }
        }

        function stopRecording() {
            isRecording = false;
            stopManually = true;
            try { recognition.stop(); } catch (e) { }
            cleanupResources();

            document.querySelector('.input-wrapper').classList.remove('recording');
            document.querySelector('.default-controls').style.display = 'flex';
            document.querySelector('.active-controls').style.display = 'none';
            chatInput.placeholder = "Type a message...";
        }

        // Listeners
        micBtn.addEventListener('click', startRecording);
        document.getElementById('stopBtn').addEventListener('click', stopRecording);

    } else {
        micBtn.style.display = 'none';
        alert("Your browser doesn't support Voice Dictation.");
    }

    // --- CHAT LOGIC ---
    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        appendMessage('user', text);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        setTimeout(() => appendMessage('ai', "I've received your message! How else can I help?"), 700);
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function appendMessage(sender, text) {
        const div = document.createElement('div');
        div.className = `chat-card ${sender}`;
        div.innerHTML = sender === 'ai' ?
            `<div class="card-icon orange"><i class="fa-solid fa-arrows-rotate"></i></div><div class="card-content"><p>${text}</p></div>` :
            `<div class="user-pic"><img src="https://ui-avatars.com/api/?name=User" alt="U"></div><div class="user-text">${text}</div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
