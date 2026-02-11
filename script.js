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

        function stopVolumeAnimation() {
            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close();
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            const stopBtn = document.getElementById('stopBtn');
            if (stopBtn) stopBtn.style.setProperty('--glow-scale', '1');
        }

        recognition.onstart = () => {
            console.log("Speech engine ACTIVE");
            isRecording = true;
            // Capture existing text only when we FIRST start
            if (stopManually !== false || baseText === "") {
                baseText = chatInput.value;
                if (baseText.length > 0 && !baseText.endsWith(' ')) baseText += ' ';
            }
        };

        recognition.onresult = (event) => {
            let sessionText = "";
            for (let i = 0; i < event.results.length; i++) {
                sessionText += event.results[i][0].transcript;
            }

            // Update the input box IMMEDIATELY
            chatInput.value = baseText + sessionText;

            // Auto-resize the box as you talk
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
            chatInput.scrollTop = chatInput.scrollHeight;
        };

        recognition.onerror = (event) => {
            console.error("Speech Error:", event.error);
            if (event.error === 'not-allowed') {
                alert("Please allow microphone access in your browser settings.");
                stopRecording();
            }
        };

        recognition.onend = () => {
            console.log("Speech engine logic ended.");
            // If it stopped by accident (auto-pause), restart it!
            if (isRecording && !stopManually) {
                console.log("Restarting engine...");
                try { recognition.start(); } catch (e) { }
            }
        };

        function startRecording() {
            isRecording = true;
            stopManually = false;

            // UI Update
            document.querySelector('.input-wrapper').classList.add('recording');
            document.querySelector('.default-controls').style.display = 'none';
            document.querySelector('.active-controls').style.display = 'flex';
            chatInput.placeholder = "Listening...";

            // Start Animation and Speech together
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(s => {
                    stream = s;
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioContext.createMediaStreamSource(stream);
                    analyser = audioContext.createAnalyser();
                    source.connect(analyser);
                    dataArray = new Uint8Array(analyser.frequencyBinCount);

                    const animateGlow = () => {
                        if (!isRecording) return;
                        analyser.getByteFrequencyData(dataArray);
                        let sum = 0;
                        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                        let scale = 1 + (sum / dataArray.length / 128) * 1.5;
                        document.getElementById('stopBtn').style.setProperty('--glow-scale', Math.min(scale, 1.8));
                        animationId = requestAnimationFrame(animateGlow);
                    };
                    animateGlow();

                    try { recognition.start(); } catch (e) { }
                })
                .catch(e => {
                    console.error(e);
                    stopRecording();
                });
        }

        function stopRecording() {
            isRecording = false;
            stopManually = true;
            try { recognition.stop(); } catch (e) { }
            stopVolumeAnimation();

            document.querySelector('.input-wrapper').classList.remove('recording');
            document.querySelector('.default-controls').style.display = 'flex';
            document.querySelector('.active-controls').style.display = 'none';
            chatInput.placeholder = "Type a message...";
        }

        micBtn.addEventListener('click', startRecording);
        document.getElementById('stopBtn').addEventListener('click', stopRecording);

    } else {
        micBtn.style.display = 'none';
        alert('Your browser does not support speech recognition.');
    }

    // Standard Messaging Logic
    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        appendMessage('user', text);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        // Mocking AI response
        setTimeout(() => appendMessage('ai', "I received your message!"), 600);
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
