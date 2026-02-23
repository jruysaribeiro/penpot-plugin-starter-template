import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

// GET /api/gemini - List available models
export const GET: RequestHandler = async () => {
  const GEMINI_API_KEY = env.GEMINI_API_KEY;
  console.log("GET /api/gemini - Fetching models list");
  if (!GEMINI_API_KEY) {
    return json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
    );

    if (!response.ok) {
      const error = await response.json();
      return json(
        {
          error: error.error?.message || "Failed to fetch models",
        },
        { status: response.status },
      );
    }

    const result = await response.json();
    return json(result);
  } catch (error) {
    console.error("Gemini API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};

// POST /api/gemini - Generate content
export const POST: RequestHandler = async ({ request }) => {
  const GEMINI_API_KEY = env.GEMINI_API_KEY;
  console.log("POST /api/gemini - Processing AI request");
  if (!GEMINI_API_KEY) {
    return json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { base64Data, model, action, prompt } = await request.json();

    console.log(`Processing ${action} request with model: ${model}`);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${GEMINI_API_KEY}`;
    console.log(
      `Constructed URL: ${apiUrl.replace(GEMINI_API_KEY || "", "API_KEY")}`,
    );

    let requestBody: any = {};

    if (action === "background-removal") {
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: "Remove the background from this image. Output a PNG image with an alpha channel where the background pixels have 0% opacity (fully transparent, alpha=0). The subject should remain fully opaque. Do not draw a checkerboard pattern - make the background actually transparent using the alpha channel.",
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Data,
                },
              },
            ],
          },
        ],
      };
    } else if (action === "translation") {
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      };
    } else {
      return json({ error: "Invalid action" }, { status: 400 });
    }

    console.log(
      `Calling Gemini API: ${apiUrl.replace(GEMINI_API_KEY || "", "API_KEY")}`,
    );

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`Gemini API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error response: ${errorText}`);

      try {
        const error = JSON.parse(errorText);
        return json(
          {
            error: error.error?.message || "Generation failed",
          },
          { status: response.status },
        );
      } catch {
        return json(
          {
            error: `API returned status ${response.status}: ${errorText}`,
          },
          { status: response.status },
        );
      }
    }

    const resultText = await response.text();
    try {
      const result = JSON.parse(resultText);
      console.log(
        "Gemini API success response structure:",
        JSON.stringify(result, null, 2).substring(0, 500),
      );
      return json(result);
    } catch {
      console.error(
        `Failed to parse Gemini response: ${resultText.substring(0, 200)}`,
      );
      return json({ error: "Invalid JSON response from API" }, { status: 500 });
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
};
