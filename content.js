console.log("AuraLens Content Script Loaded!");

let recognition;
let isListening = false;
const AURALENS_DESCRIPTION_ID = 'auralens-image-description-overlay';
const AURALENS_VOICE_FEEDBACK_ID = 'auralens-voice-feedback-overlay';

// --- Image Description Display ---
function displayImageDescription(description, imageUrl) {
  removeExistingOverlay(AURALENS_DESCRIPTION_ID);

  const overlay = document.createElement('div');
  overlay.id = AURALENS_DESCRIPTION_ID;
  overlay.style.position = 'fixed';
  overlay.style.bottom = '20px';
  overlay.style.left = '20px';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
  overlay.style.color = 'white';
  overlay.style.padding = '15px';
  overlay.style.borderRadius = '8px';
  overlay.style.zIndex = '999999'; // High z-index
  overlay.style.fontSize = '16px';
  overlay.style.maxWidth = '300px';
  overlay.textContent = description;
  document.body.appendChild(overlay);

  speak(description); // Speak the description

  // Auto-remove overlay after some time
  setTimeout(() => {
    if (document.getElementById(AURALENS_DESCRIPTION_ID)) {
      document.getElementById(AURALENS_DESCRIPTION_ID).remove();
    }
  }, 7000); // Display for 7 seconds
}

// --- Voice Feedback Display ---
function displayVoiceFeedback(text) {
    removeExistingOverlay(AURALENS_VOICE_FEEDBACK_ID);

    const feedbackOverlay = document.createElement('div');
    feedbackOverlay.id = AURALENS_VOICE_FEEDBACK_ID;
    // Style similarly to image description or uniquely
    feedbackOverlay.style.position = 'fixed';
    feedbackOverlay.style.top = '20px';
    feedbackOverlay.style.right = '20px';
    feedbackOverlay.style.backgroundColor = 'rgba(0, 123, 255, 0.8)';
    feedbackOverlay.style.color = 'white';
    feedbackOverlay.style.padding = '10px';
    feedbackOverlay.style.borderRadius = '5px';
    feedbackOverlay.style.zIndex = '999999';
    feedbackOverlay.style.fontSize = '14px';
    feedbackOverlay.textContent = text;
    document.body.appendChild(feedbackOverlay);

    setTimeout(() => {
        if (document.getElementById(AURALENS_VOICE_FEEDBACK_ID)) {
            document.getElementById(AURALENS_VOICE_FEEDBACK_ID).remove();
        }
    }, 3000); // Display for 3 seconds
}


function removeExistingOverlay(id) {
  const existingOverlay = document.getElementById(id);
  if (existingOverlay) {
    existingOverlay.remove();
  }
}

// --- Text-to-Speech (TTS) ---
function speak(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    // You can configure voice, rate, pitch etc. here
    // utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === "Google UK English Female");
    // utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  } else {
    console.warn("AuraLens: Speech synthesis not supported in this browser.");
  }
}

// --- Speech-to-Text (STT) & Voice Commands ---
function initializeSpeechRecognition() {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!window.SpeechRecognition) {
    console.error("AuraLens: Speech Recognition API not supported in this browser.");
    displayVoiceFeedback("Speech recognition not supported.");
    return null;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false; // Process single utterances
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim().toLowerCase();
    console.log('AuraLens Voice Command:', transcript);
    displayVoiceFeedback(`Heard: ${transcript}`);
    processVoiceCommand(transcript);
  };

  recognition.onspeechend = () => {
    // recognition.stop(); // Automatically stops if continuous is false
    // If you want it to keep listening after a command, you might restart it here
    // or manage it based on the 'isListening' state.
    if (isListening) {
        setTimeout(() => recognition.start(), 200); // Small delay before restarting
    }
  };

  recognition.onerror = (event) => {
    console.error('AuraLens Speech recognition error:', event.error);
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // Don't show an error for these common non-issues if continuously listening
        if (isListening) setTimeout(() => recognition.start(), 200);
    } else {
        displayVoiceFeedback(`Speech error: ${event.error}`);
    }
  };

  recognition.onend = () => {
    console.log("AuraLens: Speech recognition service disconnected.");
    // If isListening is still true, and it wasn't an error that should stop it, restart.
    // This handles cases where the service might time out.
    if (isListening && recognition && !recognition.manualStop) {
        console.log("AuraLens: Restarting listening due to unexpected stop.");
        setTimeout(() => {
            if (recognition && isListening) recognition.start();
        }, 500); // Delay before restart
    }
    if (recognition) recognition.manualStop = false; // Reset flag
  };

  return recognition;
}

function toggleListening(activate) {
    if (activate) {
        if (!recognition) {
            recognition = initializeSpeechRecognition();
        }
        if (recognition && !isListening) {
            try {
                recognition.start();
                isListening = true;
                console.log("AuraLens: Voice commands activated.");
                displayVoiceFeedback("Voice commands active.");
            } catch (e) {
                console.error("AuraLens: Error starting speech recognition:", e);
                isListening = false; // Ensure state is correct
                displayVoiceFeedback("Error starting voice commands.");
            }
        }
    } else {
        if (recognition && isListening) {
            recognition.manualStop = true; // Flag to prevent auto-restart on 'end'
            recognition.stop();
            isListening = false;
            console.log("AuraLens: Voice commands deactivated.");
            displayVoiceFeedback("Voice commands inactive.");
        }
    }
}


function processVoiceCommand(command) {
  let actionTaken = false;
  // Simple command processing
  if (command.includes("scroll down")) {
    window.scrollBy(0, window.innerHeight / 2);
    speak("Scrolling down.");
    actionTaken = true;
  } else if (command.includes("scroll up")) {
    window.scrollBy(0, -window.innerHeight / 2);
    speak("Scrolling up.");
    actionTaken = true;
  } else if (command.startsWith("click")) {
    // Example: "click login button" or "click the about link"
    const targetText = command.replace("click", "").replace("button", "").replace("link", "").trim();
    const clickableElements = Array.from(document.querySelectorAll('a, button, input[type="submit"], [role="button"], [role="link"]'));
    let foundElement = null;

    for (let el of clickableElements) {
      const elText = (el.textContent || el.innerText || el.value || el.getAttribute('aria-label') || "").trim().toLowerCase();
      if (elText.includes(targetText) && isVisible(el)) {
        foundElement = el;
        break;
      }
    }

    if (foundElement) {
      foundElement.click();
      speak(`Clicked ${targetText}.`);
      actionTaken = true;
    } else {
      speak(`Could not find an element to click for "${targetText}".`);
    }
  }
  // Add more commands here (e.g., "read page", "go to [URL]", "fill [field] with [value]")

  if (!actionTaken) {
    // speak("Sorry, I didn't understand that command.");
  }
}

function isVisible(elem) {
    if (!(elem instanceof Element)) throw Error('DomUtil: elem is not an element.');
    const style = getComputedStyle(elem);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (style.opacity < 0.1) return false;
    if (elem.offsetWidth + elem.offsetHeight + elem.getBoundingClientRect().height +
        elem.getBoundingClientRect().width === 0) {
        return false;
    }
    const elemCenter   = {
        x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
        y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
    };
    if (elemCenter.x < 0) return false;
    if (elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
    if (elemCenter.y < 0) return false;
    if (elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
    let pointContainer = document.elementFromPoint(elemCenter.x, elemCenter.y);
    do {
        if (pointContainer === elem) return true;
    } while (pointContainer = pointContainer.parentNode);
    return false;
}


// --- Message Listener (from popup or background) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "showImageDescription") {
    displayImageDescription(request.description, request.imageUrl);
    sendResponse({ status: "Description displayed" });
  } else if (request.command === "toggleVoiceCommands") {
    toggleListening(request.active);
    sendResponse({ status: `Voice commands ${request.active ? 'activated' : 'deactivated'}` });
  }
  return true; // Keep the message channel open for asynchronous response
});

// Initialize listening state based on storage on page load
chrome.storage.local.get(['isListening'], function(result) {
  if (result.isListening) {
    // We might want to auto-activate voice if the popup was left in an active state
    // For now, let's just log it. The user will click the button in popup to start.
    console.log("AuraLens: Previous listening state was active. Click popup button to re-activate on this page.");
    // To auto-activate:
    // toggleListening(true);
  }
});
