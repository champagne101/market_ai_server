import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';

const endpoint = "https://models.github.ai/inference";
const apiKey   = process.env.AZURE_AI_KEY; 
const model    = "deepseek/DeepSeek-R1-0528";

if (!apiKey) {
  console.error("❌ Missing AZURE_AI_KEY environment variable!");
  process.exit(1);
}

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5174',
      'https://aicryptoanalyzer.netlify.app'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(bodyParser.json());

// Init Azure client
const client = ModelClient(endpoint, new AzureKeyCredential(apiKey));




/**
 * Helper to build the long structured prompt
 */
const buildPrompt = (events, economicData, uploadedFiles) => `
You are an advanced AI crypto market analyst. Analyze the provided data and return a structured JSON response with comprehensive market insights.

MARKET EVENTS DATA:
${events && events.length > 0 ? events.map((e, i) => `${i+1}. [${e.date}] ${e.text}`).join('\n') : 'No events provided'}

ECONOMIC DATA:
- Unemployment Rate: ${economicData?.unemployment?.value || 'N/A'}% (Change: ${economicData?.unemployment?.change || 'N/A'})
- Fed Interest Rate: ${economicData?.fedRate?.value || 'N/A'}% (Change: ${economicData?.fedRate?.change || 'N/A'})
- Non-Farm Payrolls: ${economicData?.nfp?.value || 'N/A'} (Change: ${economicData?.nfp?.change || 'N/A'})
- CPI Inflation: ${economicData?.cpi?.value || 'N/A'}% (Change: ${economicData?.cpi?.change || 'N/A'})

UPLOADED FILES: ${uploadedFiles?.length || 0} files uploaded for analysis

ANALYSIS REQUIREMENTS:
Provide a comprehensive JSON response with the following structure. Be specific and data-driven in your analysis:

{
  "marketSentiment": {
    "overall": "Bullish/Bearish/Neutral",
    "score": 7.2, // 0-10 scale
    "indicators": {
      "social": 8.1, // 0-10 based on sentiment
      "technical": 7.5, // 0-10 technical strength
      "fundamental": 6.8, // 0-10 fundamental analysis
      "onchain": 7.9 // 0-10 on-chain metrics
    }
  },
  "predictions": {
    "1d": {
      "trend": "bullish/bearish/neutral",
      "confidence": 78, // 0-100%
      "priceChange": "+3.2%", // expected % change
      "key_factors": ["Factor 1", "Factor 2", "Factor 3"]
    },
    "1w": {
      "trend": "bullish/bearish/neutral", 
      "confidence": 65,
      "priceChange": "+8.5%",
      "key_factors": ["Factor 1", "Factor 2", "Factor 3"]
    },
    "1m": {
      "trend": "bullish/bearish/neutral",
      "confidence": 52,
      "priceChange": "+2.1%", 
      "key_factors": ["Factor 1", "Factor 2", "Factor 3"]
    },
    "1y": {
      "trend": "bullish/bearish/neutral",
      "confidence": 71,
      "priceChange": "+45.3%",
      "key_factors": ["Factor 1", "Factor 2", "Factor 3"]
    }
  },
  "marketMetrics": {
    "volatility": 24.5, // percentage
    "volume_trend": "+15.2%", // volume change
    "market_cap_rank": 2, // market position
    "fear_greed_index": 67, // 0-100
    "social_sentiment": "Positive/Negative/Neutral",
    "technical_score": 8.2 // 0-10
  },
  "riskFactors": [
    {
      "factor": "Regulatory Risk",
      "severity": "High/Medium/Low", 
      "impact": "Detailed impact description"
    }
  ],
  "aiInsights": {
    "keyOpportunities": [
      "Specific opportunity 1",
      "Specific opportunity 2", 
      "Specific opportunity 3"
    ],
    "riskWarnings": [
      "Specific risk 1",
      "Specific risk 2",
      "Specific risk 3"
    ],
    "monthlyOutlook": "Detailed paragraph about next month expectations based on all data",
    "aiRecommendation": "Specific actionable recommendation based on analysis"
  },
  "patternAnalysis": {
    "bullishPatterns": {
      "volumeSpikes": 3, // count from events
      "breakoutEvents": 2,
      "positiveNews": 4
    },
    "bearishSignals": {
      "supportBreaks": 1,
      "negativeEvents": 2, 
      "sellPressure": 1
    },
    "patternStrength": {
      "bullishMomentum": 75, // 0-100%
      "eventDensity": 2.3 // events per day
    }
  },
  "economicImpact": {
    "fedPolicy": "Hawkish/Dovish/Neutral",
    "inflationPressure": "High/Medium/Low",
    "employmentStrength": "Strong/Moderate/Weak",
    "cryptoCorrelation": {
      "btcVsFedRate": -0.73, // correlation coefficient
      "cryptoVsCPI": -0.45,
      "altVsUnemployment": -0.32
    },
    "nextEventImpact": "Analysis of upcoming economic events impact"
  },
  "performanceSummary": {
    "period": "December 2024",
    "eventsAnalyzed": ${events?.length || 0},
    "avgGain": "+12.3%", // calculated estimate
    "bestDay": "+8.2%", // estimated
    "worstDay": "-4.1%", // estimated  
    "volatility": "18.5%", // estimated
    "accuracy": "76%" // model confidence
  }
}

ANALYSIS INSTRUCTIONS:
1. Base your analysis on the actual events and economic data provided
2. If limited data, acknowledge this but still provide reasonable estimates
3. Make specific, actionable insights rather than generic statements
4. Consider the correlation between economic indicators and crypto markets
5. Factor in current market conditions and recent trends
6. Provide realistic confidence levels based on data quality
7. Include both bullish and bearish scenarios
8. Make the analysis professional and data-driven
9. Ensure all numerical values are realistic and justified
10. Return ONLY the JSON response, no additional text

Begin analysis:`;


// -------------------------
// Comprehensive analysis
// -------------------------


app.post('/analyze', async (req, res) => {
  const { events, economicData, uploadedFiles } = req.body;

  try {
    const prompt = buildPrompt(events, economicData, uploadedFiles);

    const response = await client.path("/chat/completions").post({
      body: {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
        temperature: 0.7,
      }
    });

    if (isUnexpected(response)) {
      console.error("Azure API error:", response.body.error);
      return res.status(500).json({ error: response.body.error });
    }

    const text = response.body.choices?.[0]?.message?.content || "";
    let analysisResult;

    try {
      const cleaned = text
        .replace(/<think>[\s\S]*?<\/think>/g, "") // 🔥 remove reasoning blocks
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      analysisResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse failed:", parseErr);
      console.log("Raw AI output:", text);
      analysisResult = { error: "Parsing failed", raw: text };
    }

    res.json({
      success: true,
      analysis: analysisResult,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------------
// Economic analysis
// -------------------------
app.post('/analyze-economic', async (req, res) => {
  const { economicData } = req.body;
  const prompt = `Analyze the following economic indicators and their impact on cryptocurrency markets:\n
${JSON.stringify(economicData, null, 2)}\n
Return JSON with { "economicAssessment": "...", "cryptoImpact": "...", "recommendation": "...", "riskLevel": "..." }`;

  try {
    const response = await client.path("/chat/completions").post({
      body: {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.6,
      }
    });

    if (isUnexpected(response)) {
      return res.status(500).json({ error: response.body.error });
    }

    const text = response.body.choices?.[0]?.message?.content || "";
    res.json({ analysis: text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    model,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 AI Crypto Analyzer running on http://localhost:${PORT}`);
});
