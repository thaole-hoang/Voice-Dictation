document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const micBtn = document.getElementById('micBtn');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');

    let recognition;
    let isRecording = false;
    let stopManually = false;
    let baseText = "";

    // Initialize Audio Variables
    let audioContext;
    let analyser;
    let dataArray;
    let animationId;
    let stream;

    // 1. SETUP SPEECH ENGINE
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // --- SPEECH HANDLERS ---
        recognition.onstart = () => {
            console.log("Speech: Listening Started");
            isRecording = true;
            baseText = chatInput.value;
            if (baseText.length > 0 && !baseText.endsWith(' ')) baseText += ' ';

            // Switch UI
            document.querySelector('.input-wrapper').classList.add('recording');
            document.querySelector('.default-controls').style.display = 'none';
            document.querySelector('.active-controls').style.display = 'flex';
            chatInput.placeholder = "Listening...";
        };

        recognition.onresult = (event) => {
            let sessionText = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                sessionText += event.results[i][0].transcript;
            }
            chatInput.value = baseText + sessionText;

            // Auto-size
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        };

        recognition.onerror = (event) => {
            console.error("Speech Error:", event.error);
            if (event.error === 'not-allowed') {
                alert("Please check your browser's address bar and click the 'Allow' icon for the microphone.");
                stopRecording();
            }
        };

        recognition.onend = () => {
            // Keep it alive on GitHub Pages
            if (isRecording && !stopManually) {
                try { recognition.start(); } catch (e) { }
            }
        };

        // --- CORE FUNCTIONS ---
        // CRITICAL: This must be triggered by a direct user click for HTTPS stability
        async function startRecording() {
            stopManually = false;

            try {
                // 1. Request Microphone Stream (The "Master Key")
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // 2. Start Speech Engine immediately
                recognition.start();

                // 3. Start Visualizer immediately (No delay)
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') await audioContext.resume();

                const source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                source.connect(analyser);
                dataArray = new Uint8Array(analyser.frequencyBinCount);

                const renderAnimation = () => {
                    if (!isRecording) return;
                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                    let avg = sum / dataArray.length;
                    let scale = 1 + (avg / 128) * 1.5;
                    document.getElementById('stopBtn').style.setProperty('--glow-scale', Math.min(scale, 1.8));
                    animationId = requestAnimationFrame(renderAnimation);
                };
                renderAnimation();

            } catch (err) {
                console.error("Mic access failed on live site:", err);
                alert("Could not access microphone. Ensure you are on HTTPS and have granted permission.");
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

        // --- LISTENERS ---
        micBtn.addEventListener('click', startRecording);
        document.getElementById('stopBtn').addEventListener('click', stopRecording);

    } else {
        micBtn.style.display = 'none';
        alert("This browser doesn't support speech recognition.");
    }

    // Messaging logic
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
