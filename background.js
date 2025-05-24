// --- !!! IMPORTANT SECURITY WARNING !!! ---
// DO NOT hardcode your real API key here in a production extension or public repository.
// For a hackathon, this might be a temporary shortcut, but it's very insecure.
// Ideally, use a backend proxy to make API calls and store the key securely.
// --- !!! REVOKE THE KEY YOU POSTED PUBLICLY IMMEDIATELY !!! ---
const GEMINI_API_KEY = "YOUR_NEW_REPLACEMENT_GEMINI_API_KEY"; // << REPLACE THIS!

// --- Context Menu for Image Description ---
chrome.runtime.onInstalled.addListener(() => {
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
        const description = await getGeminiImageDescription(info.srcUrl, GEMINI_API_KEY);
        chrome.tabs.sendMessage(tab.id, {
          command: "showImageDescription",
          description: description,
          imageUrl: info.srcUrl
        });

      } catch (error) {
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

async function getGeminiImageDescription(imageUrl, apiKey) {
  if (!apiKey || apiKey === "YOUR_NEW_REPLACEMENT_GEMINI_API_KEY") {
    console.error("Gemini API Key is not set or is still the placeholder!");
    return "Error: Gemini API Key not configured.";
  }

  const model = "gemini-pro-vision"; // Or the latest vision model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    // 1. Fetch the image data and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const blob = await imageResponse.blob();
    const base64ImageData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]); // Get base64 part
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const requestBody = {
      "contents": [{
        "parts": [
          { "text": "Describe this image in detail for accessibility purposes. Focus on objects, actions, and context. If there's text, include it." },
          {
            "inline_data": {
              "mime_type": blob.type || "image/jpeg", // Use actual mime type from blob
              "data": base64ImageData
            }
          }
        ]
      }],
      "generationConfig": { // Optional: configure output
        "temperature": 0.4,
        "topK": 32,
        "topP": 1,
        "maxOutputTokens": 4096, // Adjust as needed
        "stopSequences": []
      },
      "safetySettings": [ // Adjust safety settings as needed
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
      ]
    };

    // 2. Make the API call to Gemini
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
      customError.responseBody = responseData; // Attach full response for more context
      throw customError;
    }

    // Extract the text description
    // The structure might vary slightly based on exact API version or if multiple candidates are returned.
    // Check Gemini API documentation for the most up-to-date response structure.
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
    // Re-throw the error so the calling function can catch it and display a message to the user
    // Or handle it here by returning a specific error string
    throw error; // This allows the calling function to access error.responseBody if set
  }
}


// --- Listening for potential messages from content script (e.g., if needing background processing) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "logBackground") {
    console.log("AuraLens Background:", request.data);
    sendResponse({ status: "Logged from background" });
    return true; // Indicates you wish to send a response asynchronously
  }
  // Add more message handlers if needed
});
