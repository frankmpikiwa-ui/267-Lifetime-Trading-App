import { createServer } from "./src/server/app";

const PORT = 3000;

async function start() {
  const app = await createServer();
  
  if (!process.env.NETLIFY) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

start();
