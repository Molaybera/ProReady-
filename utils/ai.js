const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    readiness_score: { type: "INTEGER", description: "Overall readiness score from 0 to 100." },
    sub_scores: {
      type: "OBJECT",
      properties: {
        sleepScore: { type: "INTEGER", description: "Score from 0 to 100 based on sleep quality." },
        fatigueScore: { type: "INTEGER", description: "Score from 0 to 100 based on soreness/recovery." },
        intensityScore: { type: "INTEGER", description: "Score from 0 to 100 based on training intensity." }
      },
      required: ["sleepScore", "fatigueScore", "intensityScore"]
    },
    alerts: {
      type: "ARRAY",
      description: "List of actionable alerts regarding preparation.",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["danger", "warning", "info"] },
          icon: { type: "STRING", description: "Emoji icon" },
          title: { type: "STRING" },
          message: { type: "STRING" }
        },
        required: ["type", "icon", "title", "message"]
      }
    },
    insights: {
      type: "ARRAY",
      description: "Insights comparing current preparation to historical data.",
      items: {
        type: "OBJECT",
        properties: {
          icon: { type: "STRING", description: "Emoji icon" },
          text: { type: "STRING" },
          type: { type: "STRING", enum: ["info", "tip", "positive", "warning"] }
        },
        required: ["icon", "text", "type"]
      }
    },
    days: {
      type: "ARRAY",
      description: "Day-by-day plan leading up to the match.",
      items: {
        type: "OBJECT",
        properties: {
          day_label: { type: "STRING", description: "e.g., 'Day -2' or '🏆 Match Day'" },
          date: { type: "STRING", description: "Short date string, e.g. 'Thu, 15 Oct'" },
          daysToMatch: { type: "INTEGER" },
          isMatchDay: { type: "BOOLEAN" },
          schedule: {
            type: "OBJECT",
            properties: {
              morning: {
                type: "OBJECT",
                properties: {
                  activity: { type: "STRING" },
                  food: { type: "STRING" },
                  notes: { type: "STRING" },
                  intensity: { type: "INTEGER", description: "0-100" },
                  tags: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["activity", "food", "notes", "intensity", "tags"]
              },
              afternoon: {
                type: "OBJECT",
                properties: {
                  activity: { type: "STRING" },
                  food: { type: "STRING" },
                  notes: { type: "STRING" },
                  intensity: { type: "INTEGER", description: "0-100" },
                  tags: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["activity", "food", "notes", "intensity", "tags"]
              },
              evening: {
                type: "OBJECT",
                properties: {
                  activity: { type: "STRING" },
                  food: { type: "STRING" },
                  notes: { type: "STRING" },
                  intensity: { type: "INTEGER", description: "0-100" },
                  tags: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["activity", "food", "notes", "intensity", "tags"]
              },
              night: {
                type: "OBJECT",
                properties: {
                  activity: { type: "STRING" },
                  food: { type: "STRING" },
                  notes: { type: "STRING" },
                  intensity: { type: "INTEGER", description: "0-100" },
                  tags: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["activity", "food", "notes", "intensity", "tags"]
              }
            },
            required: ["morning", "afternoon", "evening", "night"]
          }
        },
        required: ["day_label", "date", "daysToMatch", "isMatchDay", "schedule"]
      }
    }
  },
  required: ["readiness_score", "sub_scores", "alerts", "insights", "days"]
};

async function generatePreparationPlan(inputs, history) {
  const { sport, matchDate, matchTime, sleepHours, soreness, intensity, scheduleHours } = inputs;
  
  // Calculate days to match
  const [mY, mM, mD] = matchDate.split('-').map(Number);
  const matchObj = new Date(mY, mM - 1, mD, 12, 0, 0);
  const now = new Date();
  const diffMs = matchObj - now;
  const diffDays = Math.ceil(diffMs / 86400000);

  const systemInstruction = `You are an elite sports scientist and AI coach for the sports: Football and Cricket.
Your task is to generate a highly personalized, intelligent match preparation plan based on the user's current condition and historical performance.
The plan should optimize readiness by adjusting training load, nutrition, and recovery based on how many days are left until the match.
Incorporate standard sports science principles:
- Carbohydrate loading starting 2-3 days prior.
- Tapering training intensity as match day approaches.
- Active recovery and sleep optimization.
The user sport is ${sport.toUpperCase()}.
Ensure your plan is practical and specifically tailored to their inputted soreness (${soreness}), intensity (${intensity}), and sleep (${sleepHours}h).
If there is history, reference it to provide intelligent insights (e.g., comparing current sleep to past pre-match sleep, or suggesting adjustments based on past poor performance ratings).
Return the plan strictly adhering to the JSON schema.`;

  const prompt = `Current Preparation Inputs:
Sport: ${sport}
Match Date: ${matchDate}
Match Time: ${matchTime || '15:00'}
Current Sleep (last night): ${sleepHours} hours
Muscle Soreness: ${soreness} (low/medium/high)
Recent Training Intensity: ${intensity} (low/medium/high)
College/Work Schedule Today: ${scheduleHours || 'none'}
Days until Match: ${diffDays}

Historical Performance Data (up to 3 most recent):
${history && history.length > 0 ? history.slice(0, 3).map((h, i) => `Match ${i+1}: Sport=${h.sport}, Readiness Score=${h.readiness_score}, ${h.report ? `Match Result=${h.report.result}, Rating=${h.report.rating}/10` : 'No report filed yet'}`).join('\n') : 'No past data available.'}

Generate the preparation plan in the structured format required. Ensure dates match the days leading up to ${matchDate}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate AI preparation plan.");
  }
}

module.exports = {
  generatePreparationPlan
};
