import { GoogleGenAI, Type } from "@google/genai";
import { TradingSignal } from "../types";

const getApiKey = () => {
  try {
    return process.env.GEMINI_API_KEY || "";
  } catch (e) {
    return "";
  }
};

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    const apiKey = getApiKey();
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

  const ai = getAi();
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
