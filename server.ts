import express from "express";
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
    const { broker, direction, entry, stopLoss, takeProfit, units, instrument } = req.body;

    if (broker === "OANDA") {
      const apiKey = process.env.OANDA_API_KEY;
      const accountId = process.env.OANDA_ACCOUNT_ID;
      const oandaEnv = process.env.OANDA_ENV || "practice";

      if (!apiKey || !accountId) {
        return res.status(400).json({ 
          error: "OANDA not configured. Please set OANDA_API_KEY and OANDA_ACCOUNT_ID in environment variables." 
        });
      }

      const baseUrl = oandaEnv === "live" 
        ? "https://api-fxtrade.oanda.com" 
        : "https://api-fxpractice.oanda.com";

      try {
        const formattedInstrument = instrument.replace("/", "_").replace(" ", "_");
        
        const orderPayload = {
          order: {
            units: direction === "BUY" ? units.toString() : `-${units}`,
            instrument: formattedInstrument,
            timeInForce: "GTC",
            type: "MARKET",
            positionFill: "DEFAULT",
            stopLossOnFill: { price: stopLoss.toString() },
            takeProfitOnFill: { price: takeProfit.toString() }
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
        if (!response.ok) throw new Error(data.errorMessage || "Failed to place order with OANDA");

        return res.json({ success: true, message: `OANDA: ${direction} ${units} ${instrument}`, data });
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }

    if (broker === "DERIV") {
      const apiToken = process.env.DERIV_API_TOKEN;
      if (!apiToken) {
        return res.status(400).json({ 
          error: "Deriv not configured. Please set DERIV_API_TOKEN in environment variables." 
        });
      }
      return res.status(501).json({ 
        error: "Deriv integration requires a WebSocket bridge for real-time execution. We are currently optimizing this. Please use OANDA for now." 
      });
    }

    if (broker === "WELTRADE" || broker === "GENERIC_MT4") {
      return res.status(501).json({ 
        error: `${broker} integration typically requires a MetaTrader Bridge (MT4/MT5). Direct API execution is being developed.` 
      });
    }

    return res.status(400).json({ error: "Unsupported broker selected." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.NETLIFY) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.NETLIFY) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  if (!process.env.NETLIFY) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

export const appPromise = startServer();
