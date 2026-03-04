/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  History, 
  Calculator, 
  ShieldAlert, 
  ChevronRight, 
  Target, 
  Activity, 
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeChart } from './services/gemini';
import { TradingSignal, HistoryItem } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TradingSignal | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [accountSize, setAccountSize] = useState<number>(1000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [showHistory, setShowHistory] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [tradeStatus, setTradeStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('trading_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (imageUrl: string, signal: TradingSignal) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      imageUrl,
      signal
    };
    const updatedHistory = [newItem, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('trading_history', JSON.stringify(updatedHistory));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!image) return;
    setAnalyzing(true);
    try {
      const signal = await analyzeChart(image);
      setResult(signal);
      saveToHistory(image, signal);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze chart. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('trading_history');
  };

  const calculatePositionSize = () => {
    if (!result || result.direction === 'NEUTRAL') return 0;
    const entry = parseFloat(result.entry.replace(/[^0-9.]/g, ''));
    const sl = parseFloat(result.stopLoss.replace(/[^0-9.]/g, ''));
    if (isNaN(entry) || isNaN(sl)) return 0;
    
    const riskAmount = accountSize * (riskPercent / 100);
    const pipsRisk = Math.abs(entry - sl);
    if (pipsRisk === 0) return 0;
    
    return (riskAmount / pipsRisk).toFixed(2);
  };

  const executeTrade = async () => {
    if (!result || result.direction === 'NEUTRAL') return;
    
    setExecuting(true);
    setTradeStatus(null);
    
    try {
      const units = calculatePositionSize();
      const response = await fetch('/api/broker/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: result.direction,
          entry: result.entry,
          stopLoss: result.stopLoss,
          takeProfit: result.takeProfit1,
          units: units,
          instrument: result.instrument
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Execution failed');
      
      setTradeStatus({ success: true, message: data.message });
    } catch (error: any) {
      setTradeStatus({ success: false, message: error.message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-trading-bg text-trading-text trading-grid p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter flex items-center gap-2">
            <Zap className="text-trading-accent fill-trading-accent" />
            267 LIFETIME TRADING APP
          </h1>
          <p className="text-trading-muted text-sm">AI-Powered Sniper Entry Detection</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-lg bg-trading-card border border-white/5 hover:bg-white/10 transition-colors flex items-center gap-2 text-sm"
          >
            <History size={18} />
            History
          </button>
          <div className="h-8 w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-2 text-xs font-mono bg-trading-card px-3 py-1.5 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full bg-trading-success animate-pulse" />
            AI ENGINE ONLINE
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Image */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-trading-card rounded-2xl border border-white/5 overflow-hidden">
            {!image ? (
              <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-trading-accent/10 flex items-center justify-center">
                  <Upload className="text-trading-accent" size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Upload Chart Screenshot</h3>
                  <p className="text-trading-muted text-sm max-w-xs mx-auto mt-2">
                    Supports MT4, MT5, TradingView screenshots. Major pairs, Gold, Crypto.
                  </p>
                </div>
                <label className="cursor-pointer bg-trading-accent hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium transition-all transform active:scale-95">
                  Select File
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </div>
            ) : (
              <div className="relative group">
                <img src={image} alt="Chart" className="w-full h-auto object-contain max-h-[500px]" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                    <RefreshCw size={16} />
                    Change Image
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                  {!result && !analyzing && (
                    <button 
                      onClick={startAnalysis}
                      className="bg-trading-accent text-white px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
                    >
                      <Zap size={16} />
                      Analyze Now
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {image && !result && !analyzing && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <button 
                onClick={startAnalysis}
                className="w-full bg-trading-accent hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-trading-accent/20 transition-all transform active:scale-[0.98] group"
              >
                <Zap className="group-hover:animate-pulse" size={24} />
                SCAN CHART FOR SNIPER ENTRY
              </button>
            </motion.div>
          )}

          {analyzing && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-trading-card p-8 rounded-2xl border border-trading-accent/20 flex flex-col items-center justify-center space-y-4"
            >
              <Loader2 className="text-trading-accent animate-spin" size={40} />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Scanning Market Structure...</h3>
                <p className="text-trading-muted text-sm">Detecting RSI, Bollinger Bands, and Support/Resistance zones</p>
              </div>
            </motion.div>
          )}

          {result && !analyzing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className={cn(
                "p-6 rounded-2xl border flex items-center justify-between",
                result.direction === 'BUY' ? "bg-trading-success/10 border-trading-success/20" :
                result.direction === 'SELL' ? "bg-trading-danger/10 border-trading-danger/20" :
                "bg-trading-warning/10 border-trading-warning/20"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    result.direction === 'BUY' ? "bg-trading-success text-white" :
                    result.direction === 'SELL' ? "bg-trading-danger text-white" :
                    "bg-trading-warning text-white"
                  )}>
                    {result.direction === 'BUY' ? <TrendingUp /> : result.direction === 'SELL' ? <TrendingDown /> : <AlertTriangle />}
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest opacity-60">Signal Direction</div>
                    <div className="text-2xl font-black">{result.direction}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-widest opacity-60">Confidence</div>
                  <div className="text-2xl font-black text-trading-accent">{result.confidence}%</div>
                </div>
              </div>

              {/* Trade Execution Button */}
              {result.direction !== 'NEUTRAL' && (
                <div className="bg-trading-card p-6 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <Zap size={16} className="text-trading-accent" />
                        Broker Execution
                      </h4>
                      <p className="text-xs text-trading-muted mt-1">Execute this trade directly on OANDA</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-trading-muted">Instrument</div>
                      <div className="text-sm font-bold">{result.instrument}</div>
                    </div>
                  </div>

                  <button 
                    onClick={executeTrade}
                    disabled={executing}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]",
                      result.direction === 'BUY' ? "bg-trading-success hover:bg-emerald-600" : "bg-trading-danger hover:bg-red-600",
                      executing && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {executing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        {result.direction === 'BUY' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        EXECUTE {result.direction} ORDER
                      </>
                    )}
                  </button>

                  {tradeStatus && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-3 rounded-lg text-xs flex items-center gap-2",
                        tradeStatus.success ? "bg-trading-success/20 text-trading-success" : "bg-trading-danger/20 text-trading-danger"
                      )}
                    >
                      {tradeStatus.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {tradeStatus.message}
                    </motion.div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-trading-card p-4 rounded-xl border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-trading-muted mb-1">Entry</div>
                  <div className="text-lg font-mono font-bold">{result.entry}</div>
                </div>
                <div className="bg-trading-card p-4 rounded-xl border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-trading-muted mb-1">Stop Loss</div>
                  <div className="text-lg font-mono font-bold text-trading-danger">{result.stopLoss}</div>
                </div>
                <div className="bg-trading-card p-4 rounded-xl border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-trading-muted mb-1">Take Profit 1</div>
                  <div className="text-lg font-mono font-bold text-trading-success">{result.takeProfit1}</div>
                </div>
                <div className="bg-trading-card p-4 rounded-xl border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-trading-muted mb-1">Risk:Reward</div>
                  <div className="text-lg font-mono font-bold">{result.riskReward}</div>
                </div>
              </div>

              <div className="bg-trading-card p-6 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-trading-accent" />
                  Technical Confirmation
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <IndicatorRow label="RSI" value={result.analysis.rsi} />
                    <IndicatorRow label="Bollinger Bands" value={result.analysis.bollingerBands} />
                    <IndicatorRow label="Stochastic" value={result.analysis.stochastic} />
                  </div>
                  <div className="space-y-3">
                    <IndicatorRow label="Trendlines" value={result.analysis.trendlines} />
                    <IndicatorRow label="Market Structure" value={result.analysis.marketStructure} />
                    <IndicatorRow label="S/R Zones" value={result.analysis.supportResistance} />
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/5">
                  <div className="text-xs font-bold uppercase tracking-widest text-trading-muted mb-2">AI Reasoning</div>
                  <p className="text-sm leading-relaxed text-trading-text/80 italic">"{result.reasoning}"</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Tools & History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Risk Calculator */}
          <section className="bg-trading-card p-6 rounded-2xl border border-white/5">
            <h4 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calculator size={16} className="text-trading-accent" />
              Risk Calculator
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-trading-muted mb-1.5 block">Account Size ($)</label>
                <input 
                  type="number" 
                  value={accountSize}
                  onChange={(e) => setAccountSize(Number(e.target.value))}
                  className="w-full bg-trading-bg border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-trading-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-trading-muted mb-1.5 block">Risk per Trade (%)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0.5" 
                    max="5" 
                    step="0.5"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(Number(e.target.value))}
                    className="flex-1 accent-trading-accent"
                  />
                  <span className="text-sm font-bold w-12 text-right">{riskPercent}%</span>
                </div>
              </div>
              
              <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-trading-muted">Position Size</div>
                  <div className="text-xl font-black text-trading-accent">
                    {calculatePositionSize()} <span className="text-xs font-normal text-trading-muted">Units</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-trading-muted">Risk Amount</div>
                  <div className="text-xl font-black text-trading-danger">
                    ${(accountSize * (riskPercent / 100)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="bg-trading-danger/5 p-4 rounded-xl border border-trading-danger/20 flex gap-3">
            <ShieldAlert className="text-trading-danger shrink-0" size={20} />
            <p className="text-[11px] leading-relaxed text-trading-danger/80">
              <strong>RISK DISCLAIMER:</strong> Trading Forex involves significant risk. This app provides AI-generated analysis based on visual data, not financial advice. Past performance does not guarantee future results.
            </p>
          </section>

          {/* History Sidebar/Section */}
          <AnimatePresence>
            {showHistory && (
              <motion.section 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-trading-card p-6 rounded-2xl border border-white/5"
              >
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <History size={16} className="text-trading-accent" />
                    Recent Analysis
                  </h4>
                  <button onClick={clearHistory} className="text-trading-danger hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-trading-muted text-sm italic">
                      No history yet
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="group cursor-pointer bg-trading-bg/50 p-3 rounded-xl border border-white/5 hover:border-trading-accent/30 transition-all">
                        <div className="flex gap-3">
                          <img src={item.imageUrl} className="w-16 h-16 rounded-lg object-cover border border-white/10" alt="History" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                item.signal.direction === 'BUY' ? "bg-trading-success/20 text-trading-success" :
                                item.signal.direction === 'SELL' ? "bg-trading-danger/20 text-trading-danger" :
                                "bg-trading-warning/20 text-trading-warning"
                              )}>
                                {item.signal.direction}
                              </span>
                              <span className="text-[10px] text-trading-muted">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-xs font-mono font-bold truncate">Entry: {item.signal.entry}</div>
                            <div className="text-[10px] text-trading-muted mt-1 truncate">{item.signal.reasoning}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-trading-muted text-[10px] tracking-widest uppercase">
        &copy; 2024 267 Lifetime Trading App • Powered by Gemini AI Engine
      </footer>
    </div>
  );
}

function IndicatorRow({ label, value }: { label: string, value: string }) {
  const isPositive = value.toLowerCase().includes('bullish') || value.toLowerCase().includes('oversold') || value.toLowerCase().includes('breakout') || value.toLowerCase().includes('support');
  const isNegative = value.toLowerCase().includes('bearish') || value.toLowerCase().includes('overbought') || value.toLowerCase().includes('rejection') || value.toLowerCase().includes('resistance');

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-trading-muted whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn(
          "text-xs font-medium truncate",
          isPositive ? "text-trading-success" : isNegative ? "text-trading-danger" : "text-trading-text"
        )}>
          {value}
        </span>
        {isPositive ? <CheckCircle2 size={12} className="text-trading-success shrink-0" /> : 
         isNegative ? <XCircle size={12} className="text-trading-danger shrink-0" /> : 
         <div className="w-1.5 h-1.5 rounded-full bg-trading-muted shrink-0" />}
      </div>
    </div>
  );
}
