export interface TradingSignal {
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  instrument: string;
  entry: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  riskReward: string;
  confidence: number;
  analysis: {
    marketStructure: string;
    supportResistance: string;
    rsi: string;
    bollingerBands: string;
    stochastic: string;
    trendlines: string;
    patterns: string[];
  };
  reasoning: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  imageUrl: string;
  signal: TradingSignal;
}
