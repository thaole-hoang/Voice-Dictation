document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const micBtn = document.getElementById('micBtn');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');

    let recognition;
    let isRecording = false;
    let stopManually = false;
    let baseText = "";

    // 1. INITIALIZE ENGINE
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

        // --- SPEECH HANDLERS ---
        recognition.onstart = () => {
            console.log("Speech Engine: CLAIMED MICROPHONE");
            isRecording = true;
            baseText = chatInput.value;
            if (baseText.length > 0 && !baseText.endsWith(' ')) baseText += ' ';

            // Switch UI
            document.querySelector('.input-wrapper').classList.add('recording');
            document.querySelector('.default-controls').style.display = 'none';
            document.querySelector('.active-controls').style.display = 'flex';
            chatInput.placeholder = "Listening...";

            // START ANIMATION ONLY AFTER SPEECH STARTS
            startVisualizer();
        };

        recognition.onresult = (event) => {
            let sessionText = "";
            for (let i = 0; i < event.results.length; i++) {
                sessionText += event.results[i][0].transcript;
            }

            // FORCE UPDATE TEXT BOX
            chatInput.value = baseText + sessionText;

            // Auto-resize
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
            chatInput.scrollTop = chatInput.scrollHeight;
        };

        recognition.onerror = (event) => {
            console.error("Speech Error:", event.error);
            if (event.error === 'not-allowed') {
                alert("Please click the 'Allow' button for the microphone!");
                stopRecording();
            }
        };

        recognition.onend = () => {
            if (isRecording && !stopManually) {
                console.log("Connection lost, reconnecting...");
                try { recognition.start(); } catch (e) { }
            }
        };

        // --- SUB-FUNCTIONS ---
        async function startVisualizer() {
            try {
                // We don't call getUserMedia again, we try to use the existing logic window
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                source.connect(analyser);
                dataArray = new Uint8Array(analyser.frequencyBinCount);

                const draw = () => {
                    if (!isRecording) return;
                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                    let avg = sum / dataArray.length;
                    let scale = 1 + (avg / 128) * 1.5;
                    document.getElementById('stopBtn').style.setProperty('--glow-scale', Math.min(scale, 1.8));
                    animationId = requestAnimationFrame(draw);
                };
                draw();
            } catch (e) {
                console.warn("Visualizer failed but speech is working:", e);
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

        // --- CLICK LISTENERS ---
        micBtn.addEventListener('click', () => {
            stopManually = false;
            // START SPEECH FIRST - This is the key for Mac
            try {
                recognition.start();
            } catch (e) {
                console.log("Mic already active");
            }
        });

        document.getElementById('stopBtn').addEventListener('click', stopRecording);

    } else {
        micBtn.style.display = 'none';
        alert("Browser not supported.");
    }

    // Standard Messaging
    sendBtn.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (!text) return;
        const msg = document.createElement('div');
        msg.className = 'chat-card user';
        msg.innerHTML = `<div class="user-pic"><img src="https://ui-avatars.com/api/?name=User"></div><div class="user-text">${text}</div>`;
        chatMessages.appendChild(msg);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
});
