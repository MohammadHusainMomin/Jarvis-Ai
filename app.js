// DOM Element validation
const requiredElements = {
    themeToggle: '.theme-toggle',
    settingsButton: '.settings-button',
    settingsModal: '#settingsModal',
    closeSettings: '.close-settings',
    userNameInput: '#userName',
    personalitySelect: '#personality',
    continuousListeningCheckbox: '#continuousListening',
    btn: '.talk-button',
    content: '.content',
    greetingText: '#greetingText',
    listeningIndicator: '#listeningIndicator',
    typingIndicator: '#typingIndicator',
    voiceVisualizer: '#voiceVisualizer'
};

// Safe element selection with fallback
const elements = {};
for (const [key, selector] of Object.entries(requiredElements)) {
    elements[key] = document.querySelector(selector);
    if (!elements[key]) {
        console.warn(`Missing element: ${selector}`);
    }
}

const themeToggle = elements.themeToggle;
const settingsButton = elements.settingsButton;
const settingsModal = elements.settingsModal;
const closeSettings = elements.closeSettings;
const userNameInput = elements.userNameInput;
const personalitySelect = elements.personalitySelect;
const continuousListeningCheckbox = elements.continuousListeningCheckbox;
const btn = elements.btn;
const content = elements.content;
const greetingText = elements.greetingText;
const listeningIndicator = elements.listeningIndicator;
const typingIndicator = elements.typingIndicator;
const voiceVisualizer = elements.voiceVisualizer;

// Speech Recognition Setup with browser compatibility check
let recognition = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    console.error('Speech Recognition not supported in this browser');
    if (elements.btn) {
        elements.btn.disabled = true;
        elements.btn.title = 'Speech Recognition not supported';
    }
} else {
    recognition = new SpeechRecognition();
}

// Safe localStorage access
function getFromLocalStorage(key, defaultValue) {
    try {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        if (defaultValue === true || defaultValue === false) {
            return value === 'true';
        }
        return value;
    } catch (e) {
        console.warn('localStorage read error:', e);
        return defaultValue;
    }
}

function setToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, String(value));
    } catch (e) {
        console.warn('localStorage write error:', e);
    }
}

// Global State with safe localStorage reading
let currentUser = getFromLocalStorage('jarvis_user_name', 'Sir');
let currentPersonality = getFromLocalStorage('jarvis_personality', 'jarvis');
let isContinuousListening = getFromLocalStorage('jarvis_continuous_listening', false);
let isListening = false;
let shoppingList = getFromLocalStorage('jarvis_shopping_list', '') ?
    JSON.parse(getFromLocalStorage('jarvis_shopping_list', '[]')) : [];
let isSpeaking = false;
let currentApiTimeout = null;

// Personality Voice Profiles
const voiceProfiles = {
    jarvis: {
        name: "Jarvis",
        rate: 0.9,
        pitch: 0.4,
        filter: (text) => text,
    },
    tony: {
        name: "Tony Stark",
        rate: 1.1,
        pitch: 0.5,
        filter: (text) => {
            const quips = [
                "Well, ",
                "Listen here, ",
                "Yeah, so basically, ",
                "Here's the thing, "
            ];
            return quips[Math.floor(Math.random() * quips.length)] + text;
        },
    },
    funny: {
        name: "Funny Assistant",
        rate: 1.0,
        pitch: 0.6,
        filter: (text) => {
            const laughs = Math.random() > 0.7 ? " *laughs* " : "";
            return text + laughs;
        },
    },
    calm: {
        name: "Calm Assistant",
        rate: 0.7,
        pitch: 0.3,
        filter: (text) => text,
    },
};

// Initialize
window.addEventListener('load', () => {
    if (!recognition) {
        console.error('Speech Recognition initialization failed');
        return;
    }

    loadSettings();
    applyTheme();
    setInitialUIState();
    
    speak(`Initializing, ${currentUser}.`);
    wishMe();
    
    if (isContinuousListening) {
        startContinuousListening();
    }
});

function setInitialUIState() {
    if (!elements.voiceVisualizer || !elements.listeningIndicator || !elements.typingIndicator) return;
    
    voiceVisualizer.style.display = 'flex';
    listeningIndicator.style.display = 'none';
    typingIndicator.style.display = 'none';
}

// Theme Toggle Handler
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('light-mode');
        if (isDark) {
            document.body.classList.remove('light-mode');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            setToLocalStorage('jarvis_theme', 'dark');
        } else {
            document.body.classList.add('light-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            setToLocalStorage('jarvis_theme', 'light');
        }
    });
}

// Settings Modal Handlers
if (settingsButton) {
    settingsButton.addEventListener('click', () => {
        if (settingsModal) {
            settingsModal.classList.add('active');
        }
    });
}

if (closeSettings) {
    closeSettings.addEventListener('click', () => {
        if (settingsModal) {
            settingsModal.classList.remove('active');
        }
    });
}

if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
        }
    });
}

// Save Settings Handler
if (userNameInput) {
    userNameInput.addEventListener('change', (e) => {
        currentUser = e.target.value || 'Sir';
        setToLocalStorage('jarvis_user_name', currentUser);
        speak(`Hello, ${currentUser}. I will remember your name.`);
    });
}

if (personalitySelect) {
    personalitySelect.addEventListener('change', (e) => {
        const newPersonality = e.target.value;
        if (voiceProfiles[newPersonality]) {
            currentPersonality = newPersonality;
            setToLocalStorage('jarvis_personality', currentPersonality);
            speak(`Switching to ${voiceProfiles[currentPersonality].name} mode.`);
        }
    });
}

if (continuousListeningCheckbox) {
    continuousListeningCheckbox.addEventListener('change', (e) => {
        isContinuousListening = e.target.checked;
        setToLocalStorage('jarvis_continuous_listening', isContinuousListening);
        if (isContinuousListening) {
            speak("Continuous listening enabled.");
            if (voiceVisualizer) voiceVisualizer.style.display = 'flex';
            if (listeningIndicator) listeningIndicator.style.display = 'none';
            startContinuousListening();
        } else {
            speak("Continuous listening disabled.");
            if (recognition) recognition.stop();
            isListening = false;
            resetUIState();
        }
    });
}

// Load Settings from localStorage
function loadSettings() {
    if (userNameInput) userNameInput.value = currentUser;
    if (personalitySelect) personalitySelect.value = currentPersonality;
    if (continuousListeningCheckbox) continuousListeningCheckbox.checked = isContinuousListening;
}

// Apply Theme
function applyTheme() {
    const theme = getFromLocalStorage('jarvis_theme', 'dark');
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('light-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Speech Recognition Setup (only if available)
if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
        if (typingIndicator) typingIndicator.style.display = 'none';
        if (isContinuousListening) {
            if (voiceVisualizer) voiceVisualizer.style.display = 'flex';
            if (listeningIndicator) listeningIndicator.style.display = 'none';
        }
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        if (finalTranscript) {
            finalTranscript = finalTranscript.toLowerCase().trim();

            // Process command
            if (content) content.textContent = finalTranscript;
            takeCommand(finalTranscript);
        } else if (interimTranscript && content) {
            content.textContent = interimTranscript;
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (typingIndicator) typingIndicator.style.display = 'none';
        if (event.error === 'network') {
            speak("Network error. Please check your connection.");
        } else if (event.error !== 'no-speech') {
            speak("Error in speech recognition. Please try again.");
        }
        resetUIState();
    };

    recognition.onend = () => {
        isListening = false;

        if (isContinuousListening) {
            if (voiceVisualizer) voiceVisualizer.style.display = 'flex';
            if (listeningIndicator) listeningIndicator.style.display = 'none';
            // Restart continuous listening after a brief delay
            setTimeout(() => {
                if (isContinuousListening && !isListening && recognition) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.warn('Failed to restart recognition:', e);
                    }
                }
            }, 500);
        } else {
            resetUIState();
        }
    };
}

window.speechSynthesis.onvoiceschanged = () => {
    // Voices are available
};

// Button Click Handler
if (btn) {
    btn.addEventListener('click', () => {
        if (!isListening) {
            startListeningForCommand();
        }
    });
}

// Start Listening for a Single Command
function startListeningForCommand() {
    if (!recognition) {
        console.error('Speech Recognition not available');
        return;
    }

    if (voiceVisualizer) voiceVisualizer.style.display = 'none';
    if (listeningIndicator) listeningIndicator.style.display = 'flex';
    if (typingIndicator) typingIndicator.style.display = 'none';
    if (content) content.textContent = "Listening...";
    
    try {
        recognition.stop();
        setTimeout(() => {
            if (recognition) recognition.start();
        }, 100);
    } catch (e) {
        console.error('Error starting recognition:', e);
    }
}

// Start Continuous Listening
function startContinuousListening() {
    if (!recognition || isListening) return;

    if (voiceVisualizer) voiceVisualizer.style.display = 'flex';
    if (listeningIndicator) listeningIndicator.style.display = 'none';
    
    try {
        recognition.start();
    } catch (e) {
        console.warn('Recognition already started:', e);
    }
}

// Speak Function with Personality and safety checks
function speak(text, skipWakeWord = false) {
    if (!text || isSpeaking) return;
    
    isSpeaking = true;
    
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        let voices = window.speechSynthesis.getVoices();

        if (!voices.length) {
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
            };
        }

        // Apply personality filter with validation
        const profile = voiceProfiles[currentPersonality] || voiceProfiles.jarvis;
        const filteredText = profile.filter(text);
        const utteranceText = new SpeechSynthesisUtterance(filteredText);

        // Preferred male voices
        const preferredMaleVoices = [
            "Google UK English Male",
            "Google US English",
            "Microsoft David Desktop - English (United States)",
            "Microsoft Mark Desktop - English (United States)",
            "Google हिंदी Male"
        ];

        let selectedVoice = voices.find(v =>
            preferredMaleVoices.some(name => v.name.toLowerCase().includes(name.toLowerCase()))
        );

        if (!selectedVoice) {
            selectedVoice = voices.find(v =>
                v.lang.startsWith("en") &&
                !v.name.toLowerCase().includes("female") &&
                !v.name.toLowerCase().includes("zira") &&
                !v.name.toLowerCase().includes("aria")
            );
        }

        utteranceText.voice = selectedVoice || null;
        utteranceText.rate = profile.rate;
        utteranceText.pitch = profile.pitch;
        utteranceText.volume = 1;

        if (typingIndicator) typingIndicator.style.display = 'none';
        
        // Handle speech end
        utteranceText.onend = () => {
            isSpeaking = false;
        };
        
        utteranceText.onerror = () => {
            isSpeaking = false;
        };

        window.speechSynthesis.speak(utteranceText);
    } catch (e) {
        console.error('Error in speak function:', e);
        isSpeaking = false;
    }
}

// Greeting based on time
function wishMe() {
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour < 12) {
        greeting = `Good Morning, ${currentUser}. What can I do for you today?`;
    } else if (hour < 17) {
        greeting = `Good Afternoon, ${currentUser}. How may I assist you?`;
    } else {
        greeting = `Good Evening, ${currentUser}. Ready to work.`;
    }
    
    if (greetingText) greetingText.textContent = greeting;
    speak(greeting);
}

// Command Handler
function takeCommand(message) {
    if (!message || message.trim() === '') return;

    if (message.includes('hello') || message.includes('hey')) {
        speak(`Hello, ${currentUser}. How can I help you?`);
    } else if (message.includes('your name')) {
        speak("I am Jarvis, your AI assistant. But you can call me whatever you like.");
    } else if (message.includes('open google')) {
        window.open("https://google.com", "_blank");
        speak("Opening Google...");
    } else if (message.includes('open youtube')) {
        window.open("https://youtube.com", "_blank");
        speak("Opening YouTube...");
    } else if (message.includes('open facebook')) {
        window.open("https://facebook.com", "_blank");
        speak("Opening Facebook...");
    } else if (message.includes('time')) {
        const time = new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric", second: "numeric" });
        speak(`The current time is ${time}`);
    } else if (message.includes('date')) {
        const date = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
        speak(`Today's date is ${date}`);
    } else if (message.includes('joke')) {
        tellJoke();
    } else if (message.includes('set a timer for')) {
        const timerDuration = parseInt(message.replace('set a timer for', '').replace('minutes', '').trim());
        if (!isNaN(timerDuration) && timerDuration > 0) {
            speak(`Setting a timer for ${timerDuration} minutes.`);
            setTimeout(() => {
                speak(`The timer for ${timerDuration} minutes is up, ${currentUser}!`);
            }, timerDuration * 60 * 1000);
        } else {
            speak("Sorry, I didn't understand the duration. Please specify a positive number of minutes.");
        }
    } else if (message.includes('add to my shopping list')) {
        const item = message.replace('add to my shopping list', '').trim();
        if (item) {
            shoppingList.push(item);
            setToLocalStorage('jarvis_shopping_list', JSON.stringify(shoppingList));
            speak(`${item} has been added to your shopping list.`);
        } else {
            speak("What would you like to add?");
        }
    } else if (message.includes('show my shopping list')) {
        if (shoppingList.length > 0) {
            const listItems = shoppingList.join(', ');
            speak(`Your shopping list contains: ${listItems}.`);
        } else {
            speak("Your shopping list is empty.");
        }
    } else if (message.includes('clear my shopping list')) {
        shoppingList = [];
        setToLocalStorage('jarvis_shopping_list', JSON.stringify(shoppingList));
        speak("Your shopping list has been cleared.");
    } else if (message.includes('what is') || message.includes('who is') || message.includes('what are')) {
        showTypingIndicator();
        getGeminiResponse(message);
    } else if (message.includes('search for')) {
        const query = message.replace('search for', '').trim().replace(/ /g, "+");
        window.open(`https://www.google.com/search?q=${query}`, "_blank");
        speak(`Searching for ${message.replace('search for', '').trim()}.`);
    } else if (message.includes('volume up')) {
        speak("Increasing volume.");
    } else if (message.includes('volume down')) {
        speak("Decreasing volume.");
    } else if (message.includes('shutdown')) {
        speak("Shutting down. Goodbye.");
        setTimeout(() => window.close(), 1000);
    } else if (message.includes('commands')) {
        speak("Here are a few commands you can use: hello, open youtube, tell me a joke, what is the time, add to my shopping list, and search for...");
    } else {
        showTypingIndicator();
        getGeminiResponse(message);
    }
}

// Show Typing Indicator
function showTypingIndicator() {
    if (voiceVisualizer) voiceVisualizer.style.display = 'none';
    if (listeningIndicator) listeningIndicator.style.display = 'none';
    if (typingIndicator) typingIndicator.style.display = 'flex';
}

// Reset UI State
function resetUIState() {
    if (!elements.voiceVisualizer || !elements.listeningIndicator || !elements.typingIndicator) return;
    
    if (isContinuousListening) {
        voiceVisualizer.style.display = 'flex';
        listeningIndicator.style.display = 'none';
    } else {
        voiceVisualizer.style.display = 'flex';
        listeningIndicator.style.display = 'none';
    }
    typingIndicator.style.display = 'none';
}

// Get Response from Gemini with timeout protection
async function getGeminiResponse(query) {
    // Clear previous timeout if any
    if (currentApiTimeout) {
        clearTimeout(currentApiTimeout);
    }

    try {
        // Set 10 second timeout for API call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch("https://jarvis-ai-qsar.onrender.com/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        let geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

        geminiText = geminiText
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .replace(/\\/g, "")
            .replace(/\//g, "")
            .replace(/["""]/g, "")
            .replace(/\n+/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();

        const words = geminiText.split(' ');
        const displayText = words.length > 13 ? words.slice(0, 13).join(' ') + '...' : geminiText;
        if (content) content.textContent = displayText;
        if (typingIndicator) typingIndicator.style.display = 'none';
        speak(geminiText);
        resetUIState();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("Gemini API timeout");
            speak("Sorry, the response took too long. Please try again.");
        } else {
            console.error("Error fetching from Gemini Proxy:", error);
            speak("Sorry, I could not fetch the response. Please try again.");
        }
        if (typingIndicator) typingIndicator.style.display = 'none';
        resetUIState();
    }
}

// Tell a Joke
function tellJoke() {
    const jokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "Why did the computer catch a cold? Because it left its Windows open.",
        "I told my AI to take a break, but it just kept running.",
        "Why did the developer go broke? Because he used up all his cache!",
        "How many programmers does it take to change a light bulb? None, that's a hardware problem!"
    ];
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    speak(randomJoke);
}
