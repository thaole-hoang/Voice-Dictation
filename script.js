document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const micBtn = document.getElementById('micBtn');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');

    let recognition;
    let isRecording = false;

    // Check for browser support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
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
            baseText = chatInput.value;
            if (baseText.length > 0 && !baseText.endsWith(' ') && !baseText.endsWith('\n')) {
                baseText += ' ';
            }
        };

        recognition.onend = () => {
            // Only reset UI if we actually intended to stop recording
            if (!isRecording) {
                document.querySelector('.input-wrapper').classList.remove('recording');
                document.querySelector('.default-controls').style.display = 'flex';
                document.querySelector('.active-controls').style.display = 'none';
                chatInput.placeholder = "Type a message...";
                micBtn.classList.remove('active');
                stopVolumeAnimation();
            } else {
                // If it ended unexpectedly but we still want to record, try to restart
                try {
                    recognition.start();
                } catch (e) {
                    console.log("Auto-restart failed:", e);
                    // If restart fails, then truly stop
                    isRecording = false;
                    recognition.onend();
                }
            }
        };

        recognition.onresult = (event) => {
            let interim_transcript = '';
            let final_transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final_transcript += event.results[i][0].transcript;
                else interim_transcript += event.results[i][0].transcript;
            }
            baseText += final_transcript;
            chatInput.value = baseText + interim_transcript;
            chatInput.dispatchEvent(new Event('input'));
            chatInput.scrollTop = chatInput.scrollHeight;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            // Ignore 'no-speech' and 'aborted' as they often happen during prompts or silence
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }

            // For real errors like 'not-allowed', then we stop
            isRecording = false;
            recognition.onend();
            if (event.error === 'not-allowed') {
                alert('Microphone access blocked. Please enable it in your browser settings.');
            }
        };

        // ENHANCED: Single Click Workflow
        micBtn.addEventListener('click', () => {
            if (isRecording) return;

            isRecording = true;

            // Immediate UI Update
            document.querySelector('.input-wrapper').classList.add('recording');
            document.querySelector('.default-controls').style.display = 'none';
            document.querySelector('.active-controls').style.display = 'flex';
            chatInput.placeholder = "Listening...";

            // Start Volume Data FIRST (This usually triggers the permission prompt)
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

                    // Once we have the stream, start recognition
                    // This is still within the user-click async stack
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error("Delayed recognition start error:", e);
                    }
                })
                .catch(err => {
                    console.error("Mic access denied:", err);
                    isRecording = false;
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
            isRecording = false; // Set to false first so onend knows to truly stop
            if (recognition) {
                recognition.stop();
            }
            stopVolumeAnimation();
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
