// AuraLens/background.js

// Import the API key from config.js
import { GEMINI_API_KEY } from './config.js'; // Note the './' for relative path

// --- !!! IMPORTANT SECURITY WARNING !!! ---
// The API key is now in config.js. Ensure config.js is in .gitignore
// and NOT committed to your repository.
// --- !!! REVOKE THE KEY YOU POSTED PUBLICLY IMMEDIATELY !!! ---


// --- Context Menu for Image Description ---
chrome.runtime.onInstalled.addListener(() => {
  // ... (rest of your onInstalled listener)
  chrome.contextMenus.create({
    id: "describeImageAuraLens",
    title: "AuraLens: Describe Image (Gemini)",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "describeImageAuraLens" && info.srcUrl) {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        command: "showImageDescription",
        description: "Fetching description from Gemini...",
        imageUrl: info.srcUrl
      });

      try {
        // Pass the imported GEMINI_API_KEY to the function
        const description = await getGeminiImageDescription(info.srcUrl, GEMINI_API_KEY);
        // ... (rest of the try block)
        chrome.tabs.sendMessage(tab.id, {
          command: "showImageDescription",
          description: description,
          imageUrl: info.srcUrl
        });

      } catch (error) {
        // ... (rest of your catch block)
        console.error("AuraLens Error fetching Gemini image description:", error);
        let errorMessage = `Error: ${error.message}`;
        if (error.responseBody && error.responseBody.error && error.responseBody.error.message) {
            errorMessage = `Gemini API Error: ${error.responseBody.error.message}`;
        }
        chrome.tabs.sendMessage(tab.id, {
          command: "showImageDescription",
          description: errorMessage,
          imageUrl: info.srcUrl
        });
      }
    }
  }
});

// The getGeminiImageDescription function remains the same,
// as it already accepts apiKey as a parameter.
async function getGeminiImageDescription(imageUrl, apiKey) {
  if (!apiKey || apiKey === "YOUR_NEW_SECURE_GEMINI_API_KEY_HERE" /* Check against placeholder in config.js */ ) {
    console.error("Gemini API Key is not set or is still the placeholder in config.js!");
    return "Error: Gemini API Key not configured. Please check config.js.";
  }
  // ... (rest of the getGeminiImageDescription function)
  const model = "gemini-pro-vision";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const blob = await imageResponse.blob();
    const base64ImageData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const requestBody = {
      "contents": [{
        "parts": [
          { "text": "Describe this image in detail for accessibility purposes. Focus on objects, actions, and context. If there's text, include it." },
          {
            "inline_data": {
              "mime_type": blob.type || "image/jpeg",
              "data": base64ImageData
            }
          }
        ]
      }],
      "generationConfig": {
        "temperature": 0.4,
        "topK": 32,
        "topP": 1,
        "maxOutputTokens": 4096,
        "stopSequences": []
      },
      "safetySettings": [
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
      ]
    };

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API Error Response:", responseData);
      const errorDetail = responseData.error ? responseData.error.message : `HTTP error ${geminiResponse.status}`;
      const customError = new Error(`Gemini API Error: ${errorDetail}`);
      customError.responseBody = responseData;
      throw customError;
    }

    if (responseData.candidates && responseData.candidates.length > 0 &&
        responseData.candidates[0].content && responseData.candidates[0].content.parts &&
        responseData.candidates[0].content.parts.length > 0 &&
        responseData.candidates[0].content.parts[0].text) {
      return responseData.candidates[0].content.parts[0].text;
    } else {
      console.warn("Gemini response format unexpected:", responseData);
      return "Could not extract description from Gemini response.";
    }

  } catch (error) {
    console.error("Error in getGeminiImageDescription:", error);
    throw error;
  }
}


// --- Listening for potential messages from content script ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "logBackground") {
    console.log("AuraLens Background:", request.data);
    sendResponse({ status: "Logged from background" });
    return true;
  }
});
