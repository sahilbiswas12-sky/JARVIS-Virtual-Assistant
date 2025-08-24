// ==================== INITIALIZATION ====================
// Prevent any extension interference
if (typeof solveSimpleChallenge !== 'undefined') {
    console.warn('Extension function detected, ignoring it');
    window.solveSimpleChallenge = undefined;
}

// DOM Elements
const startBtn = document.getElementById('startBtn');
const buttonText = document.getElementById('button-text');
const statusDiv = document.getElementById('status');
const conversationLog = document.getElementById('conversation-log');
const currentTimeElement = document.getElementById('current-time');
const toggleCommandsBtn = document.getElementById('toggleCommands');
const themeToggleBtn = document.getElementById('themeToggleBtn'); // New theme toggle button
const commandPanel = document.getElementById('command-panel');
const notificationContainer = document.getElementById('notification-container');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let isListening = false;
let isWaitingForCommand = false;
let isActiveSession = false;
const wakeWord = 'jarvis';
const userName = 'Friend'; // Your name for personalized responses

// Application State
let tasks = JSON.parse(localStorage.getItem('jarvisTasks')) || [];
let reminders = JSON.parse(localStorage.getItem('jarvisReminders')) || [];
let timers = JSON.parse(localStorage.getItem('jarvisTimers')) || [];
let volume = localStorage.getItem('jarvisVolume') ? parseInt(localStorage.getItem('jarvisVolume')) : 50;
let isMusicPlaying = false;
let currentTrackIndex = 0;

// Music tracks (simulated)
const musicTracks = [
    { title: "Beyond the Horizon", artist: "SynthWave Revolution" },
    { title: "Neon Dreams", artist: "Cyber Pulse" },
    { title: "Digital Sunrise", artist: "Vector Wave" },
    { title: "Circuit Breaker", artist: "Techno Logic" },
    { title: "Virtual Reality", artist: "Digital Dimension" }
];

// Jokes database
const jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "I told my wife she should embrace her mistakes. She gave me a hug.",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "What do you call fake spaghetti? An Impasta!",
    "Why did the computer go to the doctor? Because it had a virus!",
    "What's a robot's favorite snack? Computer chips!",
    "Why was the math book sad? Because it had too many problems.",
    "What did one ocean say to the other ocean? Nothing, they just waved.",
    "Why don't skeletons fight each other? They don't have the guts.",
    "What do you call a bear with no teeth? A gummy bear!"
];

// Facts database
const facts = [
    "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible.",
    "Octopuses have three hearts.",
    "The shortest war in history lasted only 38 minutes between Britain and Zanzibar in 1896.",
    "A group of flamingos is called a 'flamboyance'.",
    "The world's oldest known living tree is a bristlecone pine in California, aged over 5,000 years.",
    "Bananas are berries, but strawberries aren't.",
    "A day on Venus is longer than a year on Venus.",
    "The inventor of the Pringles can is now buried in one.",
    "The unicorn is the national animal of Scotland.",
    "There are more possible iterations of a game of chess than there are atoms in the known universe."
];

// Website database
const websites = {
    'google': 'https://www.google.com',
    'youtube': 'https://www.youtube.com',
    'amazon': 'https://www.amazon.com',
    'reddit': 'https://www.reddit.com',
    'wikipedia': 'https://www.wikipedia.org',
    'netflix': 'https://www.netflix.com',
    'twitter': 'https://www.twitter.com',
    'facebook': 'https://www.facebook.com',
    'instagram': 'https://www.instagram.com',
    'github': 'https://www.github.com',
    'gmail': 'https://mail.google.com',
    'outlook': 'https://outlook.live.com'
};

// ==================== UTILITY FUNCTIONS ====================

// Update time display
function updateTime() {
    const now = new Date();
    currentTimeElement.textContent = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    // Check reminders
    checkReminders(now);
    
    // Check timers
    checkTimers(now);
}

// Initialize time update
setInterval(updateTime, 1000);
updateTime();

// Show notification function
function showNotification(title, message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Add event listener to close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 300);
    });
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode === notificationContainer) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    notificationContainer.removeChild(notification);
                }, 300);
            }
        }, duration);
    }
    
    return notification;
}

// Check reminders function
function checkReminders(now) {
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDate = now.toDateString();
    
    reminders.forEach((reminder, index) => {
        if (reminder.date === currentDate && reminder.time === currentTime && !reminder.triggered) {
            // Show notification
            showNotification('Reminder', reminder.text, 'info', 10000);
            
            // Speak reminder
            speak(`Reminder: ${reminder.text}`);
            
            // Mark as triggered
            reminders[index].triggered = true;
            localStorage.setItem('jarvisReminders', JSON.stringify(reminders));
        }
    });
}

// Check timers function
function checkTimers(now) {
    timers.forEach((timer, index) => {
        if (now >= timer.endTime && !timer.triggered) {
            // Show notification
            showNotification('Timer Completed', `Your timer for ${timer.duration} ${timer.unit} has ended`, 'info', 10000);
            
            // Speak alert
            speak(`Timer completed. Your timer for ${timer.duration} ${timer.unit} has ended.`);
            
            // Play alert sound
            playAlertSound();
            
            // Mark as triggered
            timers[index].triggered = true;
            localStorage.setItem('jarvisTimers', JSON.stringify(timers));
        }
    });
}

// Play alert sound
function playAlertSound() {
    // In a real implementation, you would play an actual sound
    console.log("Playing alert sound");
}

// Toggle command panel
toggleCommandsBtn.addEventListener('click', () => {
    commandPanel.classList.toggle('open');
    const icon = toggleCommandsBtn.querySelector('i');
    
    if (commandPanel.classList.contains('open')) {
        toggleCommandsBtn.querySelector('span').textContent = 'Hide Available Commands';
        icon.className = 'fas fa-chevron-up';
    } else {
        toggleCommandsBtn.querySelector('span').textContent = 'Show Available Commands';
        icon.className = 'fas fa-chevron-down';
    }
});

// New Theme Toggle Button
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const theme = document.body.classList.contains('light-mode') ? "light" : "dark";
    speak(`Switched to ${theme} mode.`);
    showNotification('Theme Changed', `${theme} mode activated`, 'info');
});

// Open website function
function openWebsite(siteName) {
    const siteUrl = websites[siteName.toLowerCase()];
    if (siteUrl) {
        speak(`Opening ${siteName}`);
        window.open(siteUrl, "_blank");
        showNotification('Browser', `Opening ${siteName}`, 'info');
    } else {
        speak(`I don't know how to open ${siteName}`);
    }
}

// ==================== CORE FUNCTIONS ====================

// Speak function
const speak = (message) => {
    const speechSynthesis = window.speechSynthesis;
    // Cancel any ongoing speech to prevent overlap
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.1;
    utterance.pitch = 0.9; // Slightly lower for more robotic tone
    utterance.volume = volume / 100;
    
    utterance.onend = function() {
        console.log("Finished speaking");
        // Restart listening if we're in an active session
        if (isActiveSession && isListening) {
            setTimeout(() => {
                try {
                    recognition.start();
                    statusDiv.textContent = 'LISTENING';
                } catch (e) {
                    console.error("Error restarting recognition:", e);
                }
            }, 500);
        }
    };
    
    utterance.onerror = function(event) {
        console.error("Speech synthesis error:", event);
    };
    
    speechSynthesis.speak(utterance);
    addMessageToLog('JARVIS', message);
};

// Add message to log
const addMessageToLog = (sender, message) => {
    const messageWrapper = document.createElement('div');
    const messageBubble = document.createElement('div');
    const senderP = document.createElement('p');
    const messageP = document.createElement('p');
    
    senderP.className = 'font-semibold tracking-wider terminal-text';
    senderP.textContent = sender;
    messageP.textContent = message;

    messageBubble.appendChild(senderP);
    messageBubble.appendChild(messageP);
    messageWrapper.appendChild(messageBubble);

    if (sender === 'JARVIS') {
        messageWrapper.className = 'flex justify-start';
        messageBubble.className = 'assistant-bubble bg-cyan-500/20 text-cyan-200 p-3 rounded-lg max-w-md cyber-border';
    } else { // User
        messageWrapper.className = 'flex justify-end';
        messageBubble.className = 'user-bubble bg-gray-700 text-white p-3 rounded-lg max-w-md';
    }
    
    conversationLog.appendChild(messageWrapper);
    conversationLog.scrollTop = conversationLog.scrollHeight;
};

// Get weather function
const getWeather = async (location = null) => {
    try {
        // In a real implementation, you would call a weather API here
        // For now, we'll use sample data
        const weatherData = {
            temperature: Math.floor(Math.random() * 15) + 20, // Random temp between 20-35
            condition: ["sunny", "cloudy", "rainy", "partly cloudy"][Math.floor(Math.random() * 4)],
            location: location || "your location",
            humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
            wind: Math.floor(Math.random() * 15) + 5 // 5-20 km/h
        };
        
        speak(`Current weather in ${weatherData.location}: ${weatherData.temperature} degrees Celsius with ${weatherData.condition} conditions. Humidity is at ${weatherData.humidity} percent with wind speeds of ${weatherData.wind} kilometers per hour.`);
        
        showNotification('Weather Update', 
            `Temperature: ${weatherData.temperature}°C<br>
            Condition: ${weatherData.condition}<br>
            Humidity: ${weatherData.humidity}%<br>
            Wind: ${weatherData.wind} km/h`, 'info', 7000);
            
    } catch (error) {
        console.error("Weather error:", error);
        speak("I'm sorry, I couldn't retrieve the weather information at this time.");
    }
};

// Calculate function
const calculate = (command) => {
    // Extract the mathematical expression from the command
    let expression = command
        .replace(/calculate|what is|by|please/gi, '')
        .replace(/plus/gi, '+')
        .replace(/add/gi, '+')
        .replace(/minus/gi, '-')
        .replace(/subtract/gi, '-')
        .replace(/times|multiplied by|multiply/gi, '*')
        .replace(/divided by|divide/gi, '/')
        .replace(/\s+/g, '')
        .trim();
    
    // Remove any non-math characters for safety
    expression = expression.replace(/[^0-9+\-*/().]/g, '');
    
    try {
        // Use Function constructor for safe evaluation
        const result = new Function('return ' + expression)();
        if (isNaN(result) || !isFinite(result)) {
            speak("I'm sorry, I couldn't understand that calculation.");
        } else {
            speak(`The result is ${result}.`);
            showNotification('Calculation Result', `${expression} = ${result}`, 'success', 5000);
        }
    } catch (error) {
        console.error("Calculation Error:", error);
        speak("I'm sorry, I couldn't perform that calculation. Please try again.");
    }
};

// Set a reminder function
const setReminder = (text, time, date) => {
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    reminders.push({
        text,
        time: timeInMinutes,
        date: date || new Date().toDateString(),
        triggered: false
    });
    
    localStorage.setItem('jarvisReminders', JSON.stringify(reminders));
    
    speak(`I've set a reminder for ${text} at ${time}`);
    showNotification('Reminder Set', `"${text}" at ${time}`, 'success');
};

// Set a timer function
const setTimer = (duration, unit) => {
    const endTime = new Date();
    
    switch(unit) {
        case 'second':
        case 'seconds':
            endTime.setSeconds(endTime.getSeconds() + duration);
            break;
        case 'minute':
        case 'minutes':
            endTime.setMinutes(endTime.getMinutes() + duration);
            break;
        case 'hour':
        case 'hours':
            endTime.setHours(endTime.getHours() + duration);
            break;
        default:
            speak("I'm sorry, I didn't understand the time unit.");
            return;
    }
    
    timers.push({
        duration,
        unit,
        endTime,
        triggered: false
    });
    
    localStorage.setItem('jarvisTimers', JSON.stringify(timers));
    
    speak(`I've set a timer for ${duration} ${unit}`);
    showNotification('Timer Set', `${duration} ${unit} timer started`, 'success');
};

// Play music function (simulated)
const playMusic = () => {
    if (isMusicPlaying) {
        speak("Music is already playing.");
        return;
    }
    
    isMusicPlaying = true;
    const track = musicTracks[currentTrackIndex];
    speak(`Now playing ${track.title} by ${track.artist}`);
    showNotification('Now Playing', `${track.title} by ${track.artist}`, 'info');
};

// Stop music function (simulated)
const stopMusic = () => {
    if (!isMusicPlaying) {
        speak("No music is currently playing.");
        return;
    }
    
    isMusicPlaying = false;
    speak("Music stopped.");
    showNotification('Music Stopped', 'Playback stopped', 'info');
};

// Next track function (simulated)
const nextTrack = () => {
    currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length;
    const track = musicTracks[currentTrackIndex];
    
    if (isMusicPlaying) {
        speak(`Now playing ${track.title} by ${track.artist}`);
        showNotification('Now Playing', `${track.title} by ${track.artist}`, 'info');
    } else {
        speak(`Next track will be ${track.title} by ${track.artist}`);
    }
};

// Previous track function (simulated)
const previousTrack = () => {
    currentTrackIndex = (currentTrackIndex - 1 + musicTracks.length) % musicTracks.length;
    const track = musicTracks[currentTrackIndex];
    
    if (isMusicPlaying) {
        speak(`Now playing ${track.title} by ${track.artist}`);
        showNotification('Now Playing', `${track.title} by ${track.artist}`, 'info');
    } else {
        speak(`Previous track will be ${track.title} by ${track.artist}`);
    }
};

// Adjust volume function
const adjustVolume = (direction) => {
    if (direction === 'up') {
        volume = Math.min(100, volume + 10);
        speak(`Volume increased to ${volume} percent`);
    } else if (direction === 'down') {
        volume = Math.max(0, volume - 10);
        speak(`Volume decreased to ${volume} percent`);
    } else if (direction === 'mute') {
        volume = 0;
        speak("Volume muted");
    } else if (direction === 'unmute') {
        volume = 50;
        speak("Volume unmuted");
    }
    
    localStorage.setItem('jarvisVolume', volume.toString());
    showNotification('Volume Adjusted', `Volume set to ${volume}%`, 'info');
};

// Tell a random fact function
const tellFact = () => {
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    speak(randomFact);
    showNotification('Did You Know?', randomFact, 'info', 8000);
};

// Tell a random joke function
const tellJoke = () => {
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    speak(randomJoke);
    showNotification('Joke', randomJoke, 'info', 7000);
};

// ==================== COMMAND PROCESSING ====================
const processCommand = (transcript) => {
    const command = transcript.toLowerCase().trim();
    console.log("Processing command:", command);

    // Check if command starts with wake word or contains it
    if (!command.includes(wakeWord) && !isActiveSession) {
        return;
    }

    addMessageToLog('You', transcript);
    
    // Extract the command without the wake word
    const wakeWordIndex = command.indexOf(wakeWord);
    const commandWithoutWakeWord = command.substring(wakeWordIndex + wakeWord.length).trim();

    // Check for session control commands first
    if (command.includes('start') && command.includes(wakeWord)) {
        if (!isActiveSession) {
            isActiveSession = true;
            speak("Voice recognition activated. I'm listening for your commands.");
            showNotification('Voice Recognition', 'Listening for commands', 'info');
            return;
        } else {
            speak("Voice recognition is already active.");
            return;
        }
    } else if ((command.includes('goodbye') || command.includes('stop') || command.includes('shut down')) && command.includes(wakeWord)) {
        isActiveSession = false;
        speak("Shutting down non-essential systems. Goodbye!");
        showNotification('System', 'JARVIS is going to sleep', 'info');
        toggleListening(false);
        return;
    }

    // If we're not in an active session, ignore other commands
    if (!isActiveSession) {
        return;
    }

    // Basic commands
    if (commandWithoutWakeWord.includes('hello') || commandWithoutWakeWord.includes('hi')) {
        speak(`Hello ${userName}! How can I assist you?`);
    } else if (commandWithoutWakeWord.includes('how are you')) {
        speak("All systems are operating at peak efficiency. Thank you for asking.");
    } else if (commandWithoutWakeWord.includes('who are you')) {
        speak("I am JARVIS, an advanced virtual assistant designed to be at your service.");
    } else if (commandWithoutWakeWord.includes('what can you do')) {
        speak("I can open websites, tell you the time, date, and weather, perform calculations, save reminders, set timers, play music, and much more. Just say 'Jarvis' followed by your command.");
    } else if (commandWithoutWakeWord.includes('thank you') || commandWithoutWakeWord.includes('thanks')) {
        speak("You're welcome!");
    } else if (commandWithoutWakeWord.includes('help')) {
        speak("You can ask me to open websites, check the time or date, get weather information, set reminders, play music, tell jokes, or perform calculations. Say 'Jarvis, what can you do' for a full list of commands.");
    
    // Web commands
    } else if (commandWithoutWakeWord.includes('open ')) {
        // Extract website name from command
        const siteName = commandWithoutWakeWord.replace('open ', '').trim();
        openWebsite(siteName);
    } else if (commandWithoutWakeWord.startsWith('search for')) {
        const query = commandWithoutWakeWord.substring('search for'.length).trim();
        if (query.length > 0) {
            speak(`Searching Google for ${query}`);
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
            showNotification('Search', `Searching for: ${query}`, 'info');
        } else {
            speak("What would you like me to search for?");
        }
    
    // Time and date commands
    } else if (commandWithoutWakeWord.includes('what time is it') || commandWithoutWakeWord.includes('what is the time')) {
        const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        speak(`The current time is ${time}`);
    } else if (commandWithoutWakeWord.includes('what date is it') || commandWithoutWakeWord.includes('what is the date')) {
        const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        speak(`Today is ${date}`);
    } else if (commandWithoutWakeWord.includes("what day is it") || commandWithoutWakeWord.includes("what is the day")) {
        const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        speak(`Today is ${day}.`);
    } else if (commandWithoutWakeWord.includes("what month is it") || commandWithoutWakeWord.includes("what is the month")) {
        const month = new Date().toLocaleDateString('en-US', { month: 'long' });
        speak(`The current month is ${month}.`);
    } else if (commandWithoutWakeWord.includes("what year is it") || commandWithoutWakeWord.includes("what is the year")) {
        const year = new Date().toLocaleDateString('en-US', { year: 'numeric' });
        speak(`The current year is ${year}.`);
    } else if (commandWithoutWakeWord.includes("what week is it") || commandWithoutWakeWord.includes("what is the week")) {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        const week = Math.floor(diff / oneWeek) + 1;
        speak(`It is week number ${week} of the year.`);
    
    // Weather command
    } else if (commandWithoutWakeWord.includes("what's the weather") || commandWithoutWakeWord.includes("how's the weather") || commandWithoutWakeWord.includes("weather")) {
        // Extract location if mentioned
        let location = null;
        if (commandWithoutWakeWord.includes('in ')) {
            const inIndex = commandWithoutWakeWord.indexOf('in ');
            location = commandWithoutWakeWord.substring(inIndex + 3).trim();
        }
        getWeather(location);
    
    // Task and reminder commands
    } else if (commandWithoutWakeWord.startsWith('remind me to') || commandWithoutWakeWord.startsWith('add task') || commandWithoutWakeWord.startsWith('create a reminder')) {
        let taskText = "";
        if (commandWithoutWakeWord.startsWith('remind me to')) {
            taskText = commandWithoutWakeWord.substring('remind me to'.length).trim();
        } else if (commandWithoutWakeWord.startsWith('add task')) {
            taskText = commandWithoutWakeWord.substring('add task'.length).trim();
        } else {
            taskText = commandWithoutWakeWord.substring('create a reminder'.length).trim();
        }
        
        if (taskText.length > 0) {
            // Try to extract time if mentioned
            const timeMatch = taskText.match(/(at|for) (\d{1,2}:\d{2})/);
            let time = "12:00"; // Default time
            let cleanTaskText = taskText;
            
            if (timeMatch) {
                time = timeMatch[2];
                cleanTaskText = taskText.replace(timeMatch[0], '').trim();
            }
            
            tasks.push(cleanTaskText);
            localStorage.setItem('jarvisTasks', JSON.stringify(tasks));
            
            // Also add to reminders if time was specified
            if (timeMatch) {
                setReminder(cleanTaskText, time);
            } else {
                speak(`Okay, I've saved the reminder: ${cleanTaskText}`);
                showNotification('Task Added', cleanTaskText, 'success');
            }
        } else {
            speak("What would you like me to remind you about?");
        }
    } else if (commandWithoutWakeWord.includes('what are my tasks') || commandWithoutWakeWord.includes('show my reminders') || commandWithoutWakeWord.includes('list tasks')) {
        if (tasks.length === 0) {
            speak("You have no pending tasks.");
        } else {
            speak("Here are your saved reminders:");
            // Create a short delay between speaking each task
            tasks.forEach((task, index) => {
                setTimeout(() => {
                    speak(task);
                }, index * 1500);
            });
            showNotification('Your Tasks', tasks.join('<br>'), 'info', 10000);
        }
    } else if (commandWithoutWakeWord.includes('clear my tasks') || commandWithoutWakeWord.includes('clear reminders') || commandWithoutWakeWord.includes('delete tasks')) {
        tasks = [];
        localStorage.setItem('jarvisTasks', '[]');
        speak("I have cleared all your reminders.");
        showNotification('Tasks Cleared', 'All tasks have been removed', 'info');
    
    // Timer commands
    } else if (commandWithoutWakeWord.includes('set a timer for') || commandWithoutWakeWord.includes('set timer for')) {
        const timerRegex = /set (?:a )?timer for (\d+) (\w+)/;
        const match = commandWithoutWakeWord.match(timerRegex);
        
        if (match) {
            const duration = parseInt(match[1]);
            const unit = match[2];
            setTimer(duration, unit);
        } else {
            speak("I didn't understand the timer duration. Please try something like 'set a timer for 5 minutes'.");
        }
    
    // Calculation commands
    } else if (commandWithoutWakeWord.startsWith('calculate') || commandWithoutWakeWord.startsWith('what is')) {
        calculate(commandWithoutWakeWord);
    
    // Entertainment commands
    } else if (commandWithoutWakeWord.includes('tell me a joke') || commandWithoutWakeWord.includes('joke')) {
        tellJoke();
    } else if (commandWithoutWakeWord.includes('tell me a fact') || commandWithoutWakeWord.includes('fact')) {
        tellFact();
    } else if (commandWithoutWakeWord.includes('play news')) {
        speak("Here are the latest news headlines. Scientists have discovered a new species in the Amazon rainforest. The stock market reached record highs today. A new space mission to Mars is being planned for next year.");
    } else if (commandWithoutWakeWord.includes('movie recommendations')) {
        speak("I recommend watching Inception, The Dark Knight, Interstellar, The Matrix, or Avatar. All of these are excellent films with great reviews.");
    
    // Music commands
    } else if (commandWithoutWakeWord.includes('play music') || commandWithoutWakeWord.includes('start music')) {
        playMusic();
    } else if (commandWithoutWakeWord.includes('stop music') || commandWithoutWakeWord.includes('pause music')) {
        stopMusic();
    } else if (commandWithoutWakeWord.includes('next track') || commandWithoutWakeWord.includes('next song')) {
        nextTrack();
    } else if (commandWithoutWakeWord.includes('previous track') || commandWithoutWakeWord.includes('previous song')) {
        previousTrack();
    
    // System commands
    } else if (commandWithoutWakeWord.includes('toggle theme') || commandWithoutWakeWord.includes('change theme') || commandWithoutWakeWord.includes('switch theme')) {
         document.body.classList.toggle('light-mode');
         const theme = document.body.classList.contains('light-mode') ? "light" : "dark";
         speak(`Switched to ${theme} mode.`);
         showNotification('Theme Changed', `${theme} mode activated`, 'info');
    } else if (commandWithoutWakeWord.includes('increase volume') || commandWithoutWakeWord.includes('volume up')) {
        adjustVolume('up');
    } else if (commandWithoutWakeWord.includes('decrease volume') || commandWithoutWakeWord.includes('volume down')) {
        adjustVolume('down');
    } else if (commandWithoutWakeWord.includes('mute')) {
        adjustVolume('mute');
    } else if (commandWithoutWakeWord.includes('unmute')) {
        adjustVolume('unmute');
    } else if (commandWithoutWakeWord.includes('system status')) {
        speak(`System status: All systems operational. Volume is at ${volume} percent. ${tasks.length} tasks pending. ${reminders.length} reminders set.`);
        showNotification('System Status', 
            `Volume: ${volume}%<br>
            Tasks: ${tasks.length}<br>
            Reminders: ${reminders.length}<br>
            Theme: ${document.body.classList.contains('light-mode') ? 'Light' : 'Dark'}`, 'info', 8000);
    } else {
        speak("Command not recognized. Please try again.");
    }
};

// ==================== SPEECH RECOGNITION CONTROL ====================
const toggleListening = (shouldListen) => {
    if (!recognition) {
        statusDiv.textContent = "SPEECH RECOGNITION NOT SUPPORTED";
        startBtn.disabled = true;
        return;
    }
    
    if (shouldListen) {
        isListening = true;
        isActiveSession = true;
        try {
            recognition.start();
            startBtn.style.backgroundColor = '#dc2626';
            buttonText.textContent = 'Stop Listening';
            statusDiv.textContent = 'LISTENING';
            statusDiv.classList.add('listening-indicator');
            showNotification('Voice Recognition', 'Listening for commands', 'info');
        } catch (error) {
            console.error("Error starting recognition:", error);
            setTimeout(() => toggleListening(true), 500);
        }
    } else {
        isListening = false;
        isActiveSession = false;
        try {
            recognition.stop();
            startBtn.style.backgroundColor = '#0891b2';
            buttonText.textContent = 'Activate Listening';
            statusDiv.textContent = 'AWAITING COMMAND';
            statusDiv.classList.remove('listening-indicator');
        } catch (error) {
            console.error("Error stopping recognition:", error);
        }
    }
};

// ==================== INITIALIZE SPEECH RECOGNITION ====================
if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Add event listener to start button
    startBtn.addEventListener('click', () => toggleListening(!isListening));
    
    recognition.onstart = () => {
        console.log("Speech recognition started.");
        statusDiv.textContent = 'LISTENING';
    };

    recognition.onend = () => {
        console.log("Speech recognition ended.");
        if (isActiveSession && isListening) {
            setTimeout(() => {
                try { 
                    recognition.start(); 
                    console.log("Restarted speech recognition");
                } catch(e) { 
                    console.error("Could not restart recognition:", e);
                    // If there's an error, try again after a longer delay
                    setTimeout(() => {
                        try {
                            recognition.start();
                        } catch (err) {
                            console.error("Still couldn't restart recognition:", err);
                            statusDiv.textContent = 'RECOGNITION ERROR';
                            showNotification('Recognition Error', 'Failed to restart voice recognition', 'error');
                        }
                    }, 1000);
                }
            }, 300);
        } else {
            statusDiv.textContent = 'AWAITING COMMAND';
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        processCommand(transcript);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        let errorMessage = "An error occurred with the speech recognition.";
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            errorMessage = "Microphone access was denied. Please allow microphone access in your browser settings.";
            statusDiv.textContent = 'MIC ACCESS DENIED';
            showNotification('Permission Required', 'Microphone access is needed for voice commands', 'error', 10000);
        } else if (event.error === 'no-speech') {
            return; 
        } else {
            statusDiv.textContent = 'RECOGNITION ERROR';
            showNotification('Recognition Error', 'An error occurred with voice recognition', 'error');
        }
        
        if (event.error !== 'no-speech') {
            speak(errorMessage);
            toggleListening(false);
        }
    };

    // Start listening for the wake word on page load
    setTimeout(() => {
        try {
            recognition.start();
            statusDiv.textContent = 'LISTENING FOR WAKE WORD';
        } catch (e) {
            console.error("Error starting recognition on load:", e);
        }
    }, 1000);
} else {
    statusDiv.textContent = "BROWSER INCOMPATIBLE";
    startBtn.disabled = true;
    speak("I'm sorry, but it looks like your browser doesn't support the necessary voice technology for me to work.");
    showNotification('Browser Incompatible', 'Your browser does not support speech recognition', 'error');
}

// ==================== ADDITIONAL INITIALIZATION ====================
// Show welcome notification
setTimeout(() => {
    showNotification('JARVIS Online', 'System initialized. Say "Jarvis start" to begin.', 'success', 5000);
}, 2000);
