document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const micBtn = document.getElementById('micBtn');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');

    let recognition;
    let isRecording = false;
    let stopManually = false;

    // Check for browser support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        // Critical settings for stability
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let baseText = "";
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
            console.log("Recognition started...");
            // Only update baseText if we're starting a FRESH recording session
            // or if we've actually moved beyond the previous baseText
            if (!isRecording) {
                baseText = chatInput.value;
                if (baseText.length > 0 && !baseText.endsWith(' ') && !baseText.endsWith('\n')) {
                    baseText += ' ';
                }
            }
            isRecording = true;
        };

        recognition.onend = () => {
            console.log("Recognition ended. Manual stop:", stopManually);

            // If we didn't mean to stop (auto-pause), restart it!
            if (isRecording && !stopManually) {
                console.log("Auto-restarting speech engine...");
                try {
                    recognition.start();
                } catch (e) {
                    console.log("Restart attempted while active:", e);
                }
                return;
            } else if (stopManually) {
                // Real stop cleanup
                isRecording = false;
                document.querySelector('.input-wrapper').classList.remove('recording');
                document.querySelector('.default-controls').style.display = 'flex';
                document.querySelector('.active-controls').style.display = 'none';
                chatInput.placeholder = "Type a message...";
                micBtn.classList.remove('active');
                stopVolumeAnimation();
            }
        };

        recognition.onresult = (event) => {
            let interim_transcript = '';
            let final_transcript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }

            if (final_transcript) {
                baseText += final_transcript + ' ';
            }

            chatInput.value = baseText + interim_transcript;

            // Auto-resize and scroll
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
            chatInput.scrollTop = chatInput.scrollHeight;

            chatInput.dispatchEvent(new Event('input'));
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error type:', event.error);
            if (event.error === 'not-allowed') {
                isRecording = false;
                stopManually = true;
                alert('Microphone access blocked. Please enable it in browser settings.');
            }
        };

        // Unified Activation
        micBtn.addEventListener('click', () => {
            if (isRecording) return;

            stopManually = false;

            // UI Update
            document.querySelector('.input-wrapper').classList.add('recording');
            document.querySelector('.default-controls').style.display = 'none';
            document.querySelector('.active-controls').style.display = 'flex';
            chatInput.placeholder = "Listening...";

            // 1. Get Mic for Animation
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(s => {
                    stream = s;
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();

                    const startAudio = () => {
                        analyser = audioContext.createAnalyser();
                        analyser.fftSize = 256;
                        const source = audioContext.createMediaStreamSource(stream);
                        source.connect(analyser);
                        dataArray = new Uint8Array(analyser.frequencyBinCount);

                        const update = () => {
                            if (!isRecording) return;
                            analyser.getByteFrequencyData(dataArray);
                            let sum = 0;
                            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                            const average = sum / dataArray.length;

                            const glowScale = Math.min(1 + (average / 128) * 1.5, 1.8);
                            const stopBtn = document.getElementById('stopBtn');
                            if (stopBtn) stopBtn.style.setProperty('--glow-scale', glowScale);

                            animationId = requestAnimationFrame(update);
                        };
                        update();
                    };

                    if (audioContext.state === 'suspended') {
                        audioContext.resume().then(startAudio);
                    } else {
                        startAudio();
                    }

                    // 2. Start Speech Engine
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error("Recognition start error:", e);
                    }
                })
                .catch(err => {
                    console.error("Mic access denied:", err);
                    isRecording = false;
                    stopManually = true;
                    recognition.onend();
                });
        });

    } else {
        micBtn.style.display = 'none';
        alert('Your browser does not support speech recognition.');
    }

    // Stop Button Listener
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            stopManually = true; // Signals a real deliberate stop
            if (recognition) {
                recognition.stop();
            }
            // recognition.onend will handle the UI cleanup
        });
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        appendMessage('user', text);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        showTypingIndicator();
        setTimeout(() => {
            removeTypingIndicator();
            appendMessage('ai', generateAIResponse(text));
        }, 1500);
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-card', sender);
        if (sender === 'ai') {
            messageDiv.innerHTML = `
                <div class="card-icon orange"><i class="fa-solid fa-arrows-rotate"></i></div>
                <div class="card-content"><p>${text}</p></div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="user-pic"><img src="https://ui-avatars.com/api/?name=User&background=random" alt="U"></div>
                <div class="user-text">${text}</div>
            `;
        }
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    let typingIndicatorElement = null;
    function showTypingIndicator() {
        if (typingIndicatorElement) return;
        const indicatorDiv = document.createElement('div');
        indicatorDiv.classList.add('chat-card', 'ai', 'typing');
        indicatorDiv.innerHTML = `
            <div class="card-icon orange"><i class="fa-solid fa-arrows-rotate"></i></div>
            <div class="card-content" style="min-width: 60px; display: flex; align-items: center; justify-content: center;">
                <span class="dot" style="background: #a0a0a0;"></span>
                <span class="dot" style="background: #a0a0a0;"></span>
                <span class="dot" style="background: #a0a0a0;"></span>
            </div>
        `;
        chatMessages.appendChild(indicatorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        typingIndicatorElement = indicatorDiv;
    }

    function removeTypingIndicator() {
        if (typingIndicatorElement) {
            typingIndicatorElement.remove();
            typingIndicatorElement = null;
        }
    }

    function generateAIResponse(userText) {
        const responses = ["Interesting!", "Tell me more.", "I see.", "Got it.", "Processing..."];
        return responses[Math.floor(Math.random() * responses.length)];
    }
});
