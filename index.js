import express from "express";
import cors from "cors";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const token = process.env.GITHUB_AI_TOKEN;
const endpoint = "https://models.github.ai/inference";
const model = "deepseek/DeepSeek-R1-0528";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const generateAnalysisPrompt = (events, priceData) => {
  const formatPriceData = (data) => ({
    btc: {
      open: data.btc.open || "N/A",
      high: data.btc.high || "N/A",
      low: data.btc.low || "N/A",
      close: data.btc.close || "N/A",
      volume: data.btc.volume || "N/A",
      change:
        data.btc.close && data.btc.open
          ? (((data.btc.close - data.btc.open) / data.btc.open) * 100).toFixed(2) + "%"
          : "N/A",
    },
    eth: {
      open: data.eth.open || "N/A",
      high: data.eth.high || "N/A",
      low: data.eth.low || "N/A",
      close: data.eth.close || "N/A",
      volume: data.eth.volume || "N/A",
      change:
        data.eth.close && data.eth.open
          ? (((data.eth.close - data.eth.open) / data.eth.open) * 100).toFixed(2) + "%"
          : "N/A",
    },
  });

  const formattedPriceData = formatPriceData(priceData);

  return `You are a senior crypto market analyst. Analyze this data and provide a comprehensive report:

## Market Events (${events.length}):
${events.slice(0, 50).map((e) => `- [${e.date}] ${e.text}`).join("\n")}
${events.length > 50 ? `\n(Plus ${events.length - 50} more)` : ""}

## Price Data:
- BTC: Open $${formattedPriceData.btc.open} | Close $${formattedPriceData.btc.close} | Change ${formattedPriceData.btc.change}
- ETH: Open $${formattedPriceData.eth.open} | Close $${formattedPriceData.eth.close} | Change ${formattedPriceData.eth.change}

## Required Analysis:
1. Market health assessment with trends
2. Top 3-5 significant events and their impacts
3. Price predictions for 2 weeks and 1 month
4. Economic outlook
5. Investment recommendations (buy/hold/sell)
6. Risk assessment

Format professionally with clear sections. Be data-driven and realistic.`;
};

app.post("/analyze", async (req, res) => {
  try {
    const { events, priceData } = req.body;
    if (!events || !priceData) {
      return res.status(400).json({ error: "Missing events or priceData" });
    }

    const client = ModelClient(endpoint, new AzureKeyCredential(token));
    const prompt = generateAnalysisPrompt(events, priceData);

    const response = await client.path("/chat/completions").post({
      body: {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
        model: model,
      },
    });

    if (isUnexpected(response)) {
      console.error(response.body.error);
      return res.status(500).json({ error: response.body.error });
    }

    const output = response.body.choices[0].message.content;
    res.json({ analysis: output });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
