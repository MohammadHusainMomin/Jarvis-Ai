const btn = document.querySelector('.talk-button');
const content = document.querySelector('.content');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

window.speechSynthesis.onvoiceschanged = () => {
  
};


recognition.onresult = (event) => {
  const transcript = event.results[event.resultIndex][0].transcript;
  content.textContent = transcript;
  takeCommand(transcript.toLowerCase());
};

btn.addEventListener('click', () => {
  content.textContent = "Listening...";
  recognition.start();
});

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  //  Prefer only MALE voices (Google/Microsoft)
  const preferredMaleVoices = [
    "Google UK English Male",
    "Microsoft David Desktop",
    "Microsoft Mark Desktop",
    "Google US English", // Some male-sounding variants
    "Google हिंदी Male"
  ];

  // Select a male voice if available
  let selectedVoice = voices.find(v =>
    preferredMaleVoices.some(name => v.name.toLowerCase().includes(name.toLowerCase()))
  );

  // If none of the preferred are found, fallback to any EN male voice
  if (!selectedVoice) {
    selectedVoice = voices.find(v =>
      (v.lang.startsWith("en") || v.lang.startsWith("hi")) &&
      !v.name.toLowerCase().includes("female") &&
      !v.name.toLowerCase().includes("zira") &&   // Microsoft Zira is female
      !v.name.toLowerCase().includes("aria")      // Microsoft Aria is female
    );
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.rate = 1;
  utterance.pitch = 1; // normal tone for male
  utterance.volume = 1;

  console.log("🎙️ Speaking with male voice:", selectedVoice?.name || "default male");
  window.speechSynthesis.speak(utterance);
}

window.addEventListener('load', () => {
  speak("Initializing, Sir.");
  wishMe();
});

function wishMe() {
  const hour = new Date().getHours();
  if (hour < 12) {
    speak("Good Morning, Sir. What can I do for you today?");
  } else if (hour < 17) {
    speak("Good Afternoon, Sir. How may I assist you?");
  } else {
    speak("Good Evening, Sir. Ready to work.");
  }
}

let shoppingList = [];

function takeCommand(message) {
  if (message.includes('hello') || message.includes('hey')) {
    speak("Hello, Sir. How can I help you?");
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
    if (!isNaN(timerDuration)) {
      speak(`Setting a timer for ${timerDuration} minutes.`);
      setTimeout(() => {
        speak(`The timer for ${timerDuration} minutes is up, Sir!`);
      }, timerDuration * 60 * 1000);
    } else {
      speak("Sorry, I didn't understand the duration. Please specify the number of minutes.");
    }
  } else if (message.includes('add to my shopping list')) {
    const item = message.replace('add to my shopping list', '').trim();
    if (item) {
      shoppingList.push(item);
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
    speak("Your shopping list has been cleared.");
  } else if (message.includes('what is') || message.includes('who is') || message.includes('what are')) {
    getGeminiResponse(message);
  } else if (message.includes('search for')) {
    const query = message.replace('search for', '').trim().replace(/ /g, "+");
    window.open(`https://www.google.com/search?q=${query}`, "_blank");
    speak(`Searching for ${message}.`);
  } else if (message.includes('volume up')) {
    speak("Increasing volume.");
  } else if (message.includes('volume down')) {
    speak("Decreasing volume.");
  } else if (message.includes('shutdown')) {
    speak("Shutting down. Goodbye.");
    window.close();
    
  } else if (message.includes('commands')) {
    speak("Here are a few commands you can use: hello, open youtube, tell me a joke, what is the time, add to my shopping list, and search for...");
  } else {
    getGeminiResponse(message);
  }
}

async function getGeminiResponse(query) {
  try {
    const response = await fetch("https://jarvis-ai-qsar.onrender.com/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    if (!response.ok) {
      throw new Error("Proxy error: " + response.statusText);
    }

    const data = await response.json();
    let geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    //  Clean up unwanted characters and formatting
    geminiText = geminiText
      .replace(/\*\*/g, "")       // remove bold markdown **
      .replace(/\*/g, "")         // remove list bullets *
      .replace(/\\/g, "")         // remove backslashes \
      .replace(/\//g, "")         // remove slashes /
      .replace(/["“”]/g, "")      // remove quotes
      .replace(/\n+/g, " ")       // replace newlines with space
      .replace(/\s{2,}/g, " ")    // remove extra spaces
      .trim();                    // trim extra whitespace

    const words = geminiText.split(' ');
    const displayText = words.length > 13 ? words.slice(0, 13).join(' ') + '...' : geminiText;
    content.textContent = displayText;
    speak(geminiText);
  } catch (error) {
    console.error("Error fetching from Gemini Proxy:", error);
    speak("Sorry, I could not fetch the Gemini response.");
  }
}


function tellJoke() {
  const jokes = [
    "Why don’t scientists trust atoms? Because they make up everything!",
    "Why did the computer catch a cold? Because it left its Windows open.",
    "I told my AI to take a break, but it just kept running."
  ];
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
  speak(randomJoke);
}
