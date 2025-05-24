document.addEventListener('DOMContentLoaded', function() {
  const activateVoiceBtn = document.getElementById('activateVoiceBtn');
  const voiceStatus = document.getElementById('voiceStatus');
  let isListening = false;

  // Check initial listening state (if stored)
  chrome.storage.local.get(['isListening'], function(result) {
    if (result.isListening) {
      isListening = true;
      activateVoiceBtn.textContent = 'Deactivate Voice Commands';
      voiceStatus.textContent = 'Status: Active';
    }
  });

  activateVoiceBtn.addEventListener('click', () => {
    isListening = !isListening;
    chrome.storage.local.set({ isListening: isListening });

    if (isListening) {
      activateVoiceBtn.textContent = 'Deactivate Voice Commands';
      voiceStatus.textContent = 'Status: Active. Listening for commands...';
      // Send message to content script to start listening
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { command: "toggleVoiceCommands", active: true });
        } else {
          console.error("AuraLens: Could not find active tab.");
          voiceStatus.textContent = 'Error: Could not connect to page.';
        }
      });
    } else {
      activateVoiceBtn.textContent = 'Activate Voice Commands';
      voiceStatus.textContent = 'Status: Inactive';
      // Send message to content script to stop listening
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { command: "toggleVoiceCommands", active: false });
        }
      });
    }
  });
});
