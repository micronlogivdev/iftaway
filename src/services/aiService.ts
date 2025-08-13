// IMPORTANT: In a production environment, this call should be made from a secure backend
// or a Cloud Function to protect the API key. Exposing the API key on the client-side
// is a security risk.

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is not set. AI features will be disabled.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 0.2,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

// Helper function to convert a File object to a base64 string
const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

export const scanReceiptWithAI = async (file: File) => {
    if (!API_KEY) {
        throw new Error("AI Service is not configured. Please set the VITE_GEMINI_API_KEY.");
    }

    const imagePart = await fileToGenerativePart(file);

    const prompt = `Analyze this image of a fuel receipt. Extract the following details precisely:
- total_cost: The final total cost of the transaction as a number.
- fuel_gallons: The total number of gallons purchased as a number.
- purchase_date: The date of the purchase in YYYY-MM-DD format.
- city: The city where the purchase was made.
- state: The 2-letter abbreviation for the state or province.
- fuel_type: The type of fuel (e.g., "Diesel", "DEF", "Gasoline").

Return the result as a JSON object with only these keys. If a value is not found, return null for that key.`;

    try {
        const result = await model.generateContent({
            contents: [{ parts: [{ text: prompt }, imagePart] }],
            generationConfig,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            ],
        });

        const jsonString = result.response.text();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("AI receipt scan failed:", error);
        throw new Error("The AI model could not process the receipt. Please check the image quality or enter the details manually.");
    }
};
