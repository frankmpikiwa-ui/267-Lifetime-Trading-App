import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Broker Integration: Execute Trade
  app.post("/api/broker/trade", async (req, res) => {
    const { direction, entry, stopLoss, takeProfit, units, instrument } = req.body;

    const apiKey = process.env.OANDA_API_KEY;
    const accountId = process.env.OANDA_ACCOUNT_ID;
    const oandaEnv = process.env.OANDA_ENV || "practice";

    if (!apiKey || !accountId) {
      return res.status(400).json({ 
        error: "Broker not configured. Please set OANDA_API_KEY and OANDA_ACCOUNT_ID in environment variables." 
      });
    }

    const baseUrl = oandaEnv === "live" 
      ? "https://api-fxtrade.oanda.com" 
      : "https://api-fxpractice.oanda.com";

    try {
      // 1. Get current price for the instrument (e.g., EUR_USD)
      // Note: In a real app, we'd map "EURUSD" to "EUR_USD"
      const formattedInstrument = instrument.replace("/", "_").replace(" ", "_");
      
      const orderPayload = {
        order: {
          units: direction === "BUY" ? units.toString() : `-${units}`,
          instrument: formattedInstrument,
          timeInForce: "GTC",
          type: "MARKET",
          positionFill: "DEFAULT",
          stopLossOnFill: {
            price: stopLoss.toString()
          },
          takeProfitOnFill: {
            price: takeProfit.toString()
          }
        }
      };

      const response = await fetch(`${baseUrl}/v3/accounts/${accountId}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errorMessage || "Failed to place order with OANDA");
      }

      res.json({ 
        success: true, 
        message: `Trade executed: ${direction} ${units} ${instrument}`,
        data 
      });
    } catch (error: any) {
      console.error("Trade execution error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
