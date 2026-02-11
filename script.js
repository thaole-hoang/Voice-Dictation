document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const micBtn = document.getElementById('micBtn');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');

    let recognition;
    let isRecording = false;
    let stopManually = false;
    let baseText = "";

    // Initialization of Speech Engine
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

        // --- HANDLERS ---
        recognition.onstart = () => {
            console.log("Recognition: ACTIVE");
            isRecording = true;
            // Freeze the current text as our 'base'
            baseText = chatInput.value;
            if (baseText.length > 0 && !baseText.endsWith(' ')) baseText += ' ';
        };

        recognition.onresult = (event) => {
            let sessionText = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                sessionText += event.results[i][0].transcript;
            }

            // UPDATE BOX IN REAL-TIME
            chatInput.value = baseText + sessionText;

            // Resize box automatically
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        };

        recognition.onerror = (event) => {
            console.error("Speech Engine Error:", event.error);
            if (event.error === 'no-speech' && !stopManually) {
                // Ignore silent timeouts, just keep listening
                return;
            }
            if (event.error === 'not-allowed') {
                alert("Microphone permission denied. Please click the 'Lock' icon next to the URL and Allow Microphone.");
                stopRecording();
            }
        };

        recognition.onend = () => {
            // Auto-restart if browser stops engine but USER didn't click stop
            if (isRecording && !stopManually) {
                console.log("Auto-refreshing mic...");
                try { recognition.start(); } catch (e) { }
            }
        };

        // --- CORE FUNCTIONS ---
        async function startRecording() {
            stopManually = false;

            // 1. SWITCH UI (Do this BEFORE browser prompts to reduce lag)
            document.querySelector('.input-wrapper').classList.add('recording');
            document.querySelector('.default-controls').style.display = 'none';
            document.querySelector('.active-controls').style.display = 'flex';
            chatInput.placeholder = "Listening...";

            try {
                // 2. REQUEST MIC (This also primes the speech engine)
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // 3. START SPEECH
                recognition.start();

                // 4. START ANIMATION
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                source.connect(analyser);
                dataArray = new Uint8Array(analyser.frequencyBinCount);

                const updateGlow = () => {
                    if (!isRecording) return;
                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                    let volume = sum / dataArray.length;
                    let scale = 1 + (volume / 128) * 1.5;
                    document.getElementById('stopBtn').style.setProperty('--glow-scale', Math.min(scale, 1.8));
                    animationId = requestAnimationFrame(updateGlow);
                };
                updateGlow();

            } catch (err) {
                console.error("Critical Start Error:", err);
                stopRecording();
            }
        }

        function stopRecording() {
            isRecording = false;
            stopManually = true;

            try { recognition.stop(); } catch (e) { }

            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext) audioContext.close();
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
                stream = null;
            }

            document.querySelector('.input-wrapper').classList.remove('recording');
            document.querySelector('.default-controls').style.display = 'flex';
            document.querySelector('.active-controls').style.display = 'none';
            chatInput.placeholder = "Type a message...";
        }

        micBtn.addEventListener('click', startRecording);
        document.getElementById('stopBtn').addEventListener('click', stopRecording);

    } else {
        micBtn.style.display = 'none';
        alert("This browser is too old for Voice Dictation.");
    }

    // --- STANDARD CHAT ---
    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        appendMessage('user', text);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        setTimeout(() => appendMessage('ai', "I hear you! What else?"), 500);
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
