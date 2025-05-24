# Auralens
## How to Use This:
1. Create the Files: Create all the files listed above in the AuraLens directory.
```
AuraLens/
├── manifest.json
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup.html
├── popup.js
├── popup.css
├── background.js
└── content.js
```
2. Add Icons: Place your icon16.png, icon48.png, and icon128.png into an icons subfolder.
3. Replace AI API Placeholder: In background.js, find the section marked // --- !!! PLACEHOLDER FOR ACTUAL AI API CALL !!! --- and integrate your chosen image description AI service (e.g., OpenAI Vision, Google Cloud Vision).
  * API KEY MANAGEMENT: Be very careful with API keys. For a hackathon, hardcoding temporarily might be acceptable, but for anything else, you'd use a backend proxy or a more secure method. The host_permissions in manifest.json needs to match the domain of your API.
4. Load the Extension in Chrome/Edge:
  * Go to chrome://extensions (or edge://extensions).
  * Enable "Developer mode."
  * Click "Load unpacked."
  * Select your AuraLens project folder.
5. Test:
  * Image Description: Right-click on an image on any webpage. Select "AuraLens: Describe Image."
  * Voice Commands: Click the AuraLens extension icon in your toolbar. Click "Activate Voice Commands." Try saying "scroll down," "scroll up," or "click [some visible text on a button/link]."
