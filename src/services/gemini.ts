import { GoogleGenAI, Type } from "@google/genai";
import { TradingSignal } from "../types";
import { resizeImage } from "../utils/image";

const getApiKey = () => {
  try {
    // Try multiple ways to get the API key
    return (
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      ""
    );
  } catch (e) {
    return "";
  }
};

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined" || apiKey === "") {
    throw new Error("Gemini API Key is missing. If you are on Netlify, please add GEMINI_API_KEY to your Site Settings > Environment Variables and redeploy. If you are in the AI Studio preview, please ensure the key is set in the Secrets panel.");
  }
  
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

const TRADING_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    direction: { type: Type.STRING, description: "BUY, SELL, or NEUTRAL" },
    instrument: { type: Type.STRING, description: "The trading pair, e.g., EURUSD, XAUUSD, BTCUSD" },
    entry: { type: Type.STRING },
    stopLoss: { type: Type.STRING },
    takeProfit1: { type: Type.STRING },
    takeProfit2: { type: Type.STRING },
    riskReward: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    confluenceScore: { type: Type.NUMBER, description: "Number of technical confirmations (1-10)" },
    analysis: {
      type: Type.OBJECT,
      properties: {
        marketStructure: { type: Type.STRING },
        supportResistance: { type: Type.STRING },
        rsi: { type: Type.STRING },
        bollingerBands: { type: Type.STRING },
        stochastic: { type: Type.STRING },
        trendlines: { type: Type.STRING },
        fibonacci: { type: Type.STRING },
        macd: { type: Type.STRING },
        volume: { type: Type.STRING },
        movingAverages: { type: Type.STRING },
        candlestickPatterns: { type: Type.STRING },
        patterns: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["marketStructure", "supportResistance", "rsi", "bollingerBands", "stochastic", "trendlines", "fibonacci", "macd", "volume", "movingAverages", "candlestickPatterns", "patterns"]
    },
    reasoning: { type: Type.STRING }
  },
  required: ["direction", "entry", "stopLoss", "takeProfit1", "takeProfit2", "riskReward", "confidence", "analysis", "reasoning"]
};

export async function analyzeChart(base64Image: string): Promise<TradingSignal> {
  // Use a stable and powerful model for vision tasks
  const model = "gemini-3.1-flash-lite-preview";
  
  // 1. Resize/Compress image for mobile performance
  let processedImage = base64Image;
  try {
    // Mobile screenshots can be huge, resize to a safe dimension
    processedImage = await resizeImage(base64Image, 1024);
  } catch (e) {
    console.warn("Image resizing failed, using original:", e);
  }

  const prompt = `
    Analyze this Forex/Trading chart screenshot. 
    Act as a professional technical analyst and sniper entry specialist.
    
    1. Detect: Current price, Timeframe, Market structure (HH, HL, LH, LL), Support & Resistance zones.
    2. Indicators (Estimate from visual): 
       - RSI: Overbought/Oversold/Divergence.
       - Trendlines: Breakouts/Retests.
       - Bollinger Bands: Squeeze/Expansion/Rejection.
       - Stochastic: Crossovers/Divergence.
       - Fibonacci: Key retracement levels (38.2%, 50%, 61.8%).
       - MACD: Histogram momentum and signal crossovers.
       - Volume: Confirming price action or showing exhaustion.
       - Moving Averages: EMA 50/200 crossovers and price relationship.
       - Candlestick Patterns: Engulfing, Pin Bars, Dojis at key levels.
    3. Sniper Entry Logic (95%+ Accuracy Goal): 
       - Only give a BUY/SELL signal if at least 5 confirmations align.
       - confluenceScore: Count how many of the technical indicators (RSI, Trendlines, S/R, etc.) align with the trade direction.
       - Confirm with multiple timeframes if possible (look for confluence).
       - If conditions are weak or conflicting, set direction to NEUTRAL and confidence below 50%.
       - Prioritize high-probability setups like "Break and Retest" or "Double Bottom/Top" at major S/R.
    
    Provide the output in the specified JSON format.
  `;

  try {
    const ai = getAi();
    
    // Extract base64 data and mime type
    const mimeTypeMatch = processedImage.match(/data:([^;]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const base64Data = processedImage.includes(",") ? processedImage.split(",")[1] : processedImage;

    if (!base64Data || base64Data.length < 100) {
      throw new Error("Invalid image data. Please try a different screenshot.");
    }

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: TRADING_ANALYSIS_SCHEMA
      }
    });

    if (!response.text) {
      throw new Error("The AI engine returned an empty response. This can happen if the image is unclear or the model is overloaded.");
    }

    const cleanedText = response.text.trim();
    return JSON.parse(cleanedText) as TradingSignal;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Provide more user-friendly error messages
    let userMessage = "";
    
    if (error instanceof Error) {
      userMessage = error.message;
    } else if (typeof error === 'string') {
      userMessage = error;
    } else {
      userMessage = JSON.stringify(error);
    }

    if (!userMessage || userMessage === "{}" || userMessage === "null") {
      userMessage = "An unexpected error occurred during analysis.";
    }
    
    if (userMessage.includes("API key not valid")) {
      userMessage = "Invalid API Key. Please check your GEMINI_API_KEY in Netlify settings.";
    } else if (userMessage.includes("fetch")) {
      userMessage = "Network error. Please check your internet connection and try again.";
    } else if (userMessage.includes("quota")) {
      userMessage = "API quota exceeded. Please try again in a few minutes.";
    }
    
    throw new Error(userMessage);
  }
}
