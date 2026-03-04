import { GoogleGenAI, Type } from "@google/genai";
import { TradingSignal } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
    analysis: {
      type: Type.OBJECT,
      properties: {
        marketStructure: { type: Type.STRING },
        supportResistance: { type: Type.STRING },
        rsi: { type: Type.STRING },
        bollingerBands: { type: Type.STRING },
        stochastic: { type: Type.STRING },
        trendlines: { type: Type.STRING },
        patterns: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["marketStructure", "supportResistance", "rsi", "bollingerBands", "stochastic", "trendlines", "patterns"]
    },
    reasoning: { type: Type.STRING }
  },
  required: ["direction", "entry", "stopLoss", "takeProfit1", "takeProfit2", "riskReward", "confidence", "analysis", "reasoning"]
};

export async function analyzeChart(base64Image: string): Promise<TradingSignal> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this Forex/Trading chart screenshot. 
    Act as a professional technical analyst and sniper entry specialist.
    
    1. Detect: Current price, Timeframe, Market structure (HH, HL, LH, LL), Support & Resistance zones.
    2. Indicators (Estimate from visual): 
       - RSI: Overbought/Oversold/Divergence.
       - Trendlines: Breakouts/Retests.
       - Bollinger Bands: Squeeze/Expansion/Rejection.
       - Stochastic: Crossovers/Divergence.
    3. Sniper Entry Logic: 
       - Only give a BUY/SELL signal if at least 3 confirmations align.
       - If conditions are weak, set direction to NEUTRAL and confidence below 50%.
    
    Provide the output in the specified JSON format.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image
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

  return JSON.parse(response.text || "{}") as TradingSignal;
}
