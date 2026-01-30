import "./style.css";

// Get API key from environment or localStorage
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const apiKeyContainer =
  document.querySelector<HTMLDivElement>("#apiKeyContainer");

// get the current theme from the URL
const searchParams = new URLSearchParams(window.location.search);
document.body.dataset.theme = searchParams.get("theme") ?? "light";

// Hide API key input if environment variable is set
if (ENV_API_KEY && apiKeyContainer) {
  apiKeyContainer.style.display = "none";
}

// Load saved API key from localStorage
const apiKeyInput = document.querySelector<HTMLInputElement>("#apiKey");
const savedApiKey = localStorage.getItem("gemini_api_key");
if (savedApiKey && apiKeyInput) {
  apiKeyInput.value = savedApiKey;
}

// Save API key when it changes
apiKeyInput?.addEventListener("change", (e) => {
  const target = e.target as HTMLInputElement;
  localStorage.setItem("gemini_api_key", target.value);
});

const descriptionInput =
  document.querySelector<HTMLTextAreaElement>("#description");
const generateBtn = document.querySelector<HTMLButtonElement>("#generateBtn");
const statusDiv = document.querySelector<HTMLDivElement>("#status");

// Get option elements
const stylePresetSelect =
  document.querySelector<HTMLSelectElement>("#stylePreset");
const colorSchemeSelect =
  document.querySelector<HTMLSelectElement>("#colorScheme");
const complexitySelect =
  document.querySelector<HTMLSelectElement>("#complexity");
const sizeSelect = document.querySelector<HTMLSelectElement>("#size");
const includeGradients =
  document.querySelector<HTMLInputElement>("#includeGradients");
const includeShadows =
  document.querySelector<HTMLInputElement>("#includeShadows");
const includeTexture =
  document.querySelector<HTMLInputElement>("#includeTexture");

// Handle example prompt clicks
document.querySelectorAll(".chip[data-example]").forEach((chip) => {
  chip.addEventListener("click", (e) => {
    const example = (e.target as HTMLElement).getAttribute("data-example");
    if (example && descriptionInput) {
      descriptionInput.value = example;
      descriptionInput.focus();
    }
  });
});

function showStatus(message: string, type: "loading" | "error" | "success") {
  if (!statusDiv) return;
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
}

function clearStatus() {
  if (!statusDiv) return;
  statusDiv.textContent = "";
  statusDiv.className = "status-message";
}

function buildEnhancedPrompt(baseDescription: string): string {
  let enhancedPrompt = baseDescription;

  // Add style preset
  const style = stylePresetSelect?.value;
  if (style) {
    enhancedPrompt += `, in ${style} style`;
  }

  // Add color scheme
  const colors = colorSchemeSelect?.value;
  if (colors) {
    const colorDescriptions: Record<string, string> = {
      vibrant: "with vibrant, bold colors",
      pastel: "using soft pastel colors",
      monochrome: "in monochrome (single color variations)",
      warm: "with warm tones (reds, oranges, yellows)",
      cool: "with cool tones (blues, purples, greens)",
      earth: "using earth tones (browns, greens, tans)",
      neon: "with bright neon colors",
      grayscale: "in grayscale (black, white, and grays only)",
    };
    enhancedPrompt += ` ${colorDescriptions[colors] || ""}`;
  }

  // Add complexity
  const complexity = complexitySelect?.value;
  if (complexity === "simple") {
    enhancedPrompt += ", keep it simple and clean with minimal elements";
  } else if (complexity === "detailed") {
    enhancedPrompt += ", make it detailed and intricate with many elements";
  }

  // Add element preferences
  const elements: string[] = [];
  if (includeGradients?.checked) elements.push("use gradients");
  if (includeShadows?.checked) elements.push("include shadows and depth");
  if (includeTexture?.checked) elements.push("add texture effects");

  if (elements.length > 0) {
    enhancedPrompt += `, ${elements.join(", ")}`;
  }

  return enhancedPrompt;
}

function getSvgDimensions(): { width: number; height: number } {
  const size = sizeSelect?.value || "500x500";
  const [width, height] = size.split("x").map(Number);
  return { width, height };
}

async function generateDesign() {
  // Use environment API key if available, otherwise use user input
  const apiKey = ENV_API_KEY || apiKeyInput?.value.trim();
  const description = descriptionInput?.value.trim();

  if (!apiKey) {
    showStatus("Please enter your Gemini API key", "error");
    return;
  }

  if (!description) {
    showStatus("Please enter a design description", "error");
    return;
  }

  if (generateBtn) generateBtn.disabled = true;
  showStatus("Generating design with AI...", "loading");

  // Try Nano Banana Pro first, fallback to Gemini 3 Pro
  const models = [
    { name: "nano-banana-pro-preview", displayName: "Nano Banana Pro" },
    { name: "gemini-3-pro-preview", displayName: "Gemini 3 Pro" },
    { name: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
  ];

  for (const model of models) {
    try {
      const enhancedDescription = buildEnhancedPrompt(description);
      const { width, height } = getSvgDimensions();

      console.log(`Trying model: ${model.displayName}`);

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Generate a complete, valid SVG image based on this description: "${enhancedDescription}". 

CRITICAL REQUIREMENTS:
- Output ONLY the SVG code, starting with <svg> and ending with </svg>
- Set width="${width}" height="${height}"
- Use viewBox="0 0 ${width} ${height}" for scalability
- Make it visually appealing and professional
- Follow the style and color preferences specified
- Use creative shapes, paths, and visual elements
- Do not include any explanation, markdown formatting, or code blocks
- Just pure SVG XML code that starts with <svg and ends with </svg>`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 8192,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        const errorMsg = error.error?.message || "API request failed";
        console.warn(`${model.displayName} failed: ${errorMsg}`);
        // Try next model
        continue;
      }

      const data = await response.json();
      const svgCode = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!svgCode) {
        console.warn(`${model.displayName} returned no SVG code`);
        continue;
      }

      // Clean up the SVG code (remove markdown formatting if present)
      let cleanSvg = svgCode.trim();
      cleanSvg = cleanSvg.replace(/```svg\n?/g, "");
      cleanSvg = cleanSvg.replace(/```\n?/g, "");
      cleanSvg = cleanSvg.trim();

      // Send SVG to plugin.ts for import
      parent.postMessage(
        {
          type: "import-svg",
          svg: cleanSvg,
        },
        "*",
      );

      console.log(`✓ Successfully generated with ${model.displayName}`);
      showStatus(
        `Design generated successfully! (${model.displayName})`,
        "success",
      );
      setTimeout(clearStatus, 3000);

      if (generateBtn) generateBtn.disabled = false;
      return; // Success, exit function
    } catch (error) {
      console.warn(`${model.displayName} error:`, error);
      // Try next model
      continue;
    }
  }

  // If we get here, all models failed
  console.error("All models failed to generate SVG");
  showStatus("Failed to generate design with all available models", "error");
  if (generateBtn) generateBtn.disabled = false;
}

document
  .querySelector("[data-handler='generate']")
  ?.addEventListener("click", generateDesign);

// Allow Enter key in description to generate
descriptionInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    generateDesign();
  }
});

// Listen plugin.ts messages
window.addEventListener("message", (event) => {
  if (event.data.source === "penpot") {
    document.body.dataset.theme = event.data.theme;
  }
});
