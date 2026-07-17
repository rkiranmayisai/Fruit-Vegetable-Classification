// AGROSCAN - Interactive Voice Assistant Module

class AgroscanVoiceAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        
        this.initSpeechRecognition();
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported in this browser.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicUI(true, "Listening for commands...");
            this.logToConsole("Microphone active. Ask a question...", "system");
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.logToConsole(transcript, "user");
            this.processCommand(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            let errMsg = "Speech Recognition Error";
            if (event.error === 'not-allowed') {
                errMsg = "Mic Blocked: Grant microphone access / run on localhost or HTTPS";
            } else if (event.error === 'no-speech') {
                errMsg = "No speech detected. Try speaking again.";
            } else if (event.error === 'audio-capture') {
                errMsg = "Microphone not found.";
            } else {
                errMsg = `Voice Error: ${event.error}`;
            }
            this.logToConsole(errMsg, "system");
            this.updateMicUI(false, errMsg);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateMicUI(false, "Voice Assistant Idle");
        };
    }

    toggle() {
        if (!this.recognition) {
            this.speak("Voice recognition is not supported in your browser. Please use Google Chrome.");
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (e) {
                console.error(e);
            }
        }
    }

    updateMicUI(active, text) {
        const widget = document.getElementById("voice-assistant-widget");
        const statusTxt = document.getElementById("mic-status");
        if (!widget || !statusTxt) return;

        if (active) {
            widget.classList.add("listening");
        } else {
            widget.classList.remove("listening");
        }
        statusTxt.innerText = text;
    }

    logToConsole(text, sender) {
        const consoleLogs = document.getElementById("voice-console-logs");
        if (!consoleLogs) return;

        const line = document.createElement("div");
        line.classList.add("console-line", sender);
        line.innerText = text;
        consoleLogs.appendChild(line);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }

    speak(text) {
        if (!this.synthesis) return;
        
        // Cancel any active speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // Try to select a premium natural sounding voice if available
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes("Google") || 
            voice.name.includes("Natural") || 
            voice.name.includes("Microsoft Zira")
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        this.logToConsole(text, "ai");
        this.synthesis.speak(utterance);
    }

    processCommand(rawCommand) {
        const command = rawCommand.toLowerCase().trim();
        
        if (!window.App) {
            this.speak("Application state is not initialized.");
            return;
        }

        // Project Info & Advantages Commands
        const isProjectQuery = command.includes('project') && (
            command.includes('explain') || command.includes('about') || command.includes('what') || 
            command.includes('tell') || command.includes('info') || command.includes('detail') || 
            command.includes('desc') || command.includes('work')
        );

        const isAdvantageQuery = command.includes('advantage') || command.includes('benefit') || 
                                 command.includes('why') || command.includes('value') || 
                                 command.includes('pro') || command.includes('usefulness') || 
                                 command.includes('good') || command.includes('help');

        if (isProjectQuery) {
            this.speak("AgroScan AI is an advanced fruit and vegetable classification platform. It uses deep learning models to identify produce, determine freshness, classify quality grades, assess disease infections, and estimate shelf life. It also provides storage recommendations, recipes, and features a smart digital inventory ledger.");
            return;
        }
        if (isAdvantageQuery) {
            this.speak("Key advantages of AgroScan AI include: automated quality grading and sorting of agricultural produce, real-time freshness detection to minimize food waste, automated disease scanning to prevent crop infection spread, seamless inventory ledger synchronization, and custom storage and recipe recommendations to optimize food utilization.");
            return;
        }

        const activeObj = window.App.getActiveObject();

        // 1. Navigation Commands
        if (command.includes("inventory") || command.includes("ledger") || command.includes("stock")) {
            window.App.switchView('inventory');
            this.speak("Switching to Smart Inventory view.");
            return;
        }
        if (command.includes("dashboard") || command.includes("scanner") || command.includes("scan")) {
            window.App.switchView('dashboard');
            this.speak("Switching to Scanner Dashboard.");
            return;
        }
        if (command.includes("harvest") || command.includes("guide") || command.includes("recommendation")) {
            window.App.switchView('harvest');
            this.speak("Opening Harvest and Storage Guide.");
            return;
        }

        // 2. Scan Operations
        if (command.includes("analyze") || command.includes("check image") || command.includes("process")) {
            this.speak("Processing the loaded image.");
            window.App.triggerAnalysis();
            return;
        }

        // If no active object detected, tell user to load something
        if (!activeObj) {
            this.speak("No produce has been scanned yet. Please select a sample or upload a photo first.");
            return;
        }

        // 3. Info Query Commands (on Active Object)
        // A. General Identification
        if (command.includes("what is this") || command.includes("what fruit") || command.includes("what vegetable") || command.includes("identify")) {
            const name = activeObj.label;
            const grade = activeObj.grade;
            const fresh = activeObj.freshness;
            this.speak(`This is identified as a ${fresh} ${name}, categorized as ${grade}.`);
            return;
        }

        // B. Freshness Queries
        if (command.includes("freshness") || command.includes("fresh") || command.includes("rotten") || command.includes("spoil")) {
            const name = activeObj.label;
            const pct = Math.round(activeObj.freshness_confidence * 100);
            const state = activeObj.freshness;
            const days = activeObj.shelf_life_days;
            
            if (state === "fresh") {
                this.speak(`The ${name} is fresh, with a freshness score of ${pct} percent. It should stay fresh for about ${days} days in correct storage.`);
            } else if (state === "semi-fresh") {
                this.speak(`The ${name} is semi-fresh. It has about ${days} days of shelf life left. I recommend cooking or processing it soon.`);
            } else {
                this.speak(`Warning, the ${name} is decayed or rotten. It has zero days of shelf life. Do not consume.`);
            }
            return;
        }

        // C. Quality Grade
        if (command.includes("grade") || command.includes("quality") || command.includes("grading")) {
            this.speak(`This item is graded as ${activeObj.grade}. Reason: ${activeObj.grade_reason}`);
            return;
        }

        // D. Nutrition
        if (command.includes("nutrition") || command.includes("calories") || command.includes("vitamin") || command.includes("potassium")) {
            const nutrition = activeObj.nutrition;
            this.speak(`Nutritional profile for ${activeObj.label} per 100 grams: Calories: ${nutrition.calories}, Carbohydrates: ${nutrition.carbs}, Fiber: ${nutrition.fiber}, Vitamin C: ${nutrition.vitamin_c}.`);
            return;
        }

        // E. Advice, Storage, Recipes
        if (command.includes("recipe") || command.includes("cook") || command.includes("eat")) {
            this.speak(`Here is a recipe recommendation for this ${activeObj.label}: ${activeObj.recipe_advice}`);
            return;
        }
        if (command.includes("store") || command.includes("keep") || command.includes("storage")) {
            this.speak(`Storage tips for ${activeObj.label}: ${activeObj.storage_tips}`);
            return;
        }
        if (command.includes("action") || command.includes("advice") || command.includes("do with it")) {
            this.speak(`Action recommendation: ${activeObj.action_advice}`);
            return;
        }
        if (command.includes("disease") || command.includes("pathogen") || command.includes("infection")) {
            if (activeObj.disease) {
                const dis = activeObj.disease;
                this.speak(`Alert: Detected ${dis.name} infection, caused by ${dis.pathogen}. Severity is ${dis.severity}.`);
            } else {
                this.speak(`No active crop diseases or lesions were detected on this ${activeObj.label}.`);
            }
            return;
        }

        // Default Fallback
        this.speak("I heard your command, but didn't recognize a specific action. You can say identify, check freshness, show nutrition, or switch to inventory.");
    }
}

// Instantiate voice assistant
window.VoiceAssistant = new AgroscanVoiceAssistant();
