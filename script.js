document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const micBtn = document.getElementById('micBtn');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');

    let recognition;
    let isRecording = false;
    let stopManually = false;
    let baseText = "";
    let finalTranscript = "";

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
            isRecording = true;

            // Only capture base text on the FIRST start, not on auto-restarts
            if (stopManually === false && finalTranscript === "") {
                baseText = chatInput.value;
                if (baseText.length > 0 && !baseText.endsWith(' ')) baseText += ' ';
                finalTranscript = "";
            }

            // Switch UI
            document.querySelector('.input-wrapper').classList.add('recording');
            document.querySelector('.default-controls').style.display = 'none';
            document.querySelector('.active-controls').style.display = 'flex';
            chatInput.placeholder = "Listening...";
        };

        recognition.onresult = (event) => {
            let interimTranscript = "";
            let currentFinalTranscript = "";

            // Process ALL results from the beginning, not just new ones
            for (let i = 0; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    currentFinalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update finalTranscript with the complete final text
            if (currentFinalTranscript) {
                finalTranscript = currentFinalTranscript;
            }

            // Display base + final + interim
            chatInput.value = baseText + finalTranscript + interimTranscript;

            // Auto-size
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        };

        recognition.onerror = (event) => {
            console.error("Speech Error:", event.error);
            if (event.error === 'not-allowed') {
                alert("Please allow microphone access in your browser settings.");
                stopRecording();
            }
            // Ignore other errors like 'no-speech' and 'aborted'
        };

        recognition.onend = () => {
            // Keep it alive - auto-restart if user didn't manually stop
            if (isRecording && !stopManually) {
                console.log("Auto-restarting to prevent timeout...");
                try {
                    recognition.start();
                } catch (e) {
                    console.log("Restart failed:", e);
                }
            }
        };

        // --- CORE FUNCTIONS ---
        async function startRecording() {
            stopManually = false;
            finalTranscript = "";
            isRecording = true; // Set this BEFORE starting animation

            try {
                // 1. Request Microphone Stream
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // 2. Start Speech Engine
                recognition.start();

                // 3. Start Visualizer
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') await audioContext.resume();

                const source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                dataArray = new Uint8Array(analyser.frequencyBinCount);

                let frameCount = 0;
                const renderAnimation = () => {
                    if (!isRecording) return;

                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                    let avg = sum / dataArray.length;
                    let scale = 1 + (avg / 128) * 1.5;
                    const stopBtn = document.getElementById('stopBtn');
                    if (stopBtn) {
                        const finalScale = Math.min(scale, 1.8);
                        stopBtn.style.setProperty('--glow-scale', finalScale);
                    }
                    animationId = requestAnimationFrame(renderAnimation);
                };
                renderAnimation();

            } catch (err) {
                console.error("Mic access failed:", err);
                alert("Could not access microphone. Please ensure you've granted permission.");
            }
        }

        function stopRecording() {
            isRecording = false;
            stopManually = true;
            try { recognition.stop(); } catch (e) { }

            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext && audioContext.state !== 'closed') audioContext.close();
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
                stream = null;
            }

            document.querySelector('.input-wrapper').classList.remove('recording');
            document.querySelector('.default-controls').style.display = 'flex';
            document.querySelector('.active-controls').style.display = 'none';
            chatInput.placeholder = "Type a message...";

            // Reset for next session
            finalTranscript = "";
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
        msg.innerHTML = `<div class="user-pic"><img src="https://ui-avatars.com/api/?name=User&background=random"></div><div class="user-text">${text}</div>`;
        chatMessages.appendChild(msg);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Reset transcripts
        baseText = "";
        finalTranscript = "";
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });
});
