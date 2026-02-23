import { json } from "@sveltejs/kit";
import dotenv from "dotenv";
dotenv.config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log(
  "✓ API route loaded. API key status:",
  GEMINI_API_KEY ? "✓ SET" : "✗ MISSING"
);
const GET = async () => {
  console.log("GET /api/gemini - Fetching models list");
  if (!GEMINI_API_KEY) {
    return json({ error: "API key not configured" }, { status: 500 });
  }
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    if (!response.ok) {
      const error = await response.json();
      return json(
        {
          error: error.error?.message || "Failed to fetch models"
        },
        { status: response.status }
      );
    }
    const result = await response.json();
    return json(result);
  } catch (error) {
    console.error("Gemini API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};
const POST = async ({ request }) => {
  console.log("POST /api/gemini - Processing AI request");
  if (!GEMINI_API_KEY) {
    return json({ error: "API key not configured" }, { status: 500 });
  }
  try {
    const { base64Data, model, action, prompt } = await request.json();
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    let requestBody = {};
    if (action === "background-removal") {
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: "Remove the background from this image. Return ONLY the subject with a transparent background as a PNG image. Do not add text or explanations - output the image directly."
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "image/png"
        }
      };
    } else if (action === "translation") {
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      };
    } else {
      return json({ error: "Invalid action" }, { status: 400 });
    }
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const error = await response.json();
      return json(
        {
          error: error.error?.message || "Generation failed"
        },
        { status: response.status }
      );
    }
    const result = await response.json();
    return json(result);
  } catch (error) {
    console.error("Gemini API error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
};
export {
  GET,
  POST
};
