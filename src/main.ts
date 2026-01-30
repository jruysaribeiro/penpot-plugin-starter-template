import "./style.css";
// @ts-ignore - imagetracerjs has no type definitions
import ImageTracer from "imagetracerjs";
import * as pdfjsLib from "pdfjs-dist";

// Tab switching functionality
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tabName = button.getAttribute("data-tab");

    // Remove active class from all buttons and contents
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));

    // Add active class to clicked button and corresponding content
    button.classList.add("active");
    const targetContent = document.getElementById(tabName || "");
    if (targetContent) {
      targetContent.classList.add("active");
    }
  });
});

// Get API key from environment or localStorage
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const apiKeyContainer =
  document.querySelector<HTMLDivElement>("#apiKeyContainer");

// Always use light theme
document.body.dataset.theme = "light";

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

// Store selection context, dimensions, and SVG
let selectionContext = "";
let selectionDimensions = { width: 500, height: 500 };
let selectionSvg = "";
let referenceImageBase64 = "";

const descriptionInput =
  document.querySelector<HTMLTextAreaElement>("#description");
const generateBtn = document.querySelector<HTMLButtonElement>("#generateBtn");
const statusDiv = document.querySelector<HTMLDivElement>("#status");

// Get option elements
const modelSelect = document.querySelector<HTMLSelectElement>("#modelSelect");
const stylePresetSelect =
  document.querySelector<HTMLSelectElement>("#stylePreset");
const colorSchemeSelect =
  document.querySelector<HTMLSelectElement>("#colorScheme");
const complexitySelect =
  document.querySelector<HTMLSelectElement>("#complexity");
const sizeSelect = document.querySelector<HTMLSelectElement>("#size");
const svgModeSelect = document.querySelector<HTMLSelectElement>("#svgMode");
const variationsSelect =
  document.querySelector<HTMLSelectElement>("#variations");
const includeGradients =
  document.querySelector<HTMLInputElement>("#includeGradients");
const includeShadows =
  document.querySelector<HTMLInputElement>("#includeShadows");
const includeTexture =
  document.querySelector<HTMLInputElement>("#includeTexture");
const useSelectionReference = document.querySelector<HTMLInputElement>(
  "#useSelectionReference",
);

// Image upload elements
const dropZone = document.querySelector<HTMLDivElement>("#dropZone");
const fileInput = document.querySelector<HTMLInputElement>("#fileInput");
const previewImage = document.querySelector<HTMLImageElement>("#previewImage");
const dropZoneText = document.querySelector<HTMLSpanElement>("#dropZoneText");

// Image tracing elements
const traceDropZone = document.querySelector<HTMLDivElement>("#traceDropZone");
const traceFileInput =
  document.querySelector<HTMLInputElement>("#traceFileInput");
const tracePreviewImage =
  document.querySelector<HTMLImageElement>("#tracePreviewImage");
const traceDropZoneText =
  document.querySelector<HTMLSpanElement>("#traceDropZoneText");
const traceBtn = document.querySelector<HTMLButtonElement>("#traceBtn");
let traceImageData: HTMLImageElement | null = null;

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

// Image upload handlers
function handleImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    showStatus("Please upload an image file", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    referenceImageBase64 = result.split(",")[1]; // Remove data:image/xxx;base64, prefix

    console.log("✓ Image loaded successfully");
    console.log("Base64 length:", referenceImageBase64.length);
    console.log("First 50 chars:", referenceImageBase64.substring(0, 50));

    if (previewImage && dropZoneText && dropZone) {
      previewImage.src = result;
      previewImage.style.display = "block";
      dropZoneText.textContent = "✓ Image uploaded - Click to change";
      dropZone.classList.add("has-image");
    }
  };
  reader.readAsDataURL(file);
}

dropZone?.addEventListener("click", () => fileInput?.click());

fileInput?.addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleImageFile(file);
});

dropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone?.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file) handleImageFile(file);
});

// Image tracing handlers
function handleTraceImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    showStatus("Please upload an image file", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;

    const img = new Image();
    img.onload = () => {
      traceImageData = img;
      if (tracePreviewImage && traceDropZoneText && traceDropZone && traceBtn) {
        tracePreviewImage.src = result;
        tracePreviewImage.style.display = "block";
        traceDropZoneText.textContent = "✓ Image ready - Click button to trace";
        traceDropZone.classList.add("has-image");
        traceBtn.style.display = "block";
      }
    };
    img.src = result;
  };
  reader.readAsDataURL(file);
}

traceDropZone?.addEventListener("click", () => traceFileInput?.click());

traceFileInput?.addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleTraceImageFile(file);
});

traceDropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  traceDropZone?.classList.add("drag-over");
});

traceDropZone?.addEventListener("dragleave", () => {
  traceDropZone?.classList.remove("drag-over");
});

traceDropZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  traceDropZone?.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file) handleTraceImageFile(file);
});

traceBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (!traceImageData) return;

  showStatus("Tracing image to SVG...", "loading");
  if (traceBtn) traceBtn.disabled = true;

  // Use setTimeout to let UI update
  setTimeout(async () => {
    try {
      if (!traceImageData) return;

      // Limit image size to prevent freezing
      const maxDimension = 800;
      let width = traceImageData.width;
      let height = traceImageData.height;

      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
        console.log(
          `Resizing image from ${traceImageData.width}x${traceImageData.height} to ${width}x${height}`,
        );
      }

      // Create a canvas and draw the image on it
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(traceImageData, 0, 0, width, height);

      // High quality settings for best results
      const svgString = ImageTracer.imagedataToSVG(
        ImageTracer.getImgdata(canvas),
        {
          ltres: 2, // Higher line threshold for smoother paths
          qtres: 2, // Higher quad threshold for better curves
          pathomit: 4, // Keep more detail - lower omit threshold
          colorsampling: 2, // Good color detection
          numberofcolors: 32, // More colors for maximum detail
          mincolorratio: 0.01, // Keep subtle colors
          colorquantcycles: 5, // More cycles for best color accuracy
          strokewidth: 1, // Visible strokes
          blurradius: 0, // No blur for crisp edges
          blurdelta: 20,
          scale: 1, // No scaling
          roundcoords: 2, // Round to 2 decimals for precision
        },
      );

      // Send to Penpot
      parent.postMessage(
        {
          type: "import-svg",
          svg: svgString,
          offsetX: 0,
        },
        "*",
      );

      showStatus("✓ SVG traced and imported successfully!", "success");
      setTimeout(clearStatus, 3000);
    } catch (error) {
      console.error("Tracing error:", error);
      showStatus("Failed to trace image", "error");
    } finally {
      if (traceBtn) traceBtn.disabled = false;
    }
  }, 100);
});

function showStatus(message: string, type: "loading" | "error" | "success") {
  if (!statusDiv) return;
  // Use innerHTML to preserve line breaks
  statusDiv.innerHTML = message.replace(/\n/g, "<br>");
  statusDiv.className = `status-message ${type}`;
}

function clearStatus() {
  if (!statusDiv) return;
  statusDiv.textContent = "";
  statusDiv.className = "status-message";
}

function buildEnhancedPrompt(baseDescription: string): string {
  let enhancedPrompt = baseDescription;

  // Add selection reference if enabled - use context since SVG export isn't working
  if (useSelectionReference?.checked && selectionContext) {
    enhancedPrompt = `${selectionContext}\n\nCRITICAL: Match the EXACT VISUAL STYLE of the selected reference. If it's line art, create ONLY line art with no fills. If it's minimal, stay minimal. Create a variation that looks like it belongs to the same design set.\n\nDesign request: ${enhancedPrompt}`;
  }

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

  // Use selection dimensions if that option is chosen
  if (size === "from-selection") {
    return selectionDimensions;
  }

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

  const numVariations = parseInt(variationsSelect?.value || "1", 10);
  showStatus(
    `Generating ${numVariations} design${numVariations > 1 ? "s" : ""} with AI...`,
    "loading",
  );

  let successCount = 0;
  const errors: string[] = [];
  const spacing = 50; // Space between variations
  const { width } = getSvgDimensions(); // Get width for horizontal spacing

  // Get selected model
  const selectedModel = modelSelect?.value || "nano-banana-pro-preview";
  const modelDisplayNames: Record<string, string> = {
    "nano-banana-pro-preview": "Nano Banana Pro",
    "gemini-3-pro-preview": "Gemini 3 Pro",
    "gemini-2.5-pro": "Gemini 2.5 Pro",
    "gemini-2.5-flash": "Gemini 2.5 Flash",
    "gemini-2.0-flash": "Gemini 2.0 Flash",
  };
  const modelDisplayName = modelDisplayNames[selectedModel] || selectedModel;

  for (let i = 0; i < numVariations; i++) {
    showStatus(
      `Generating variation ${i + 1} of ${numVariations}...`,
      "loading",
    );

    try {
      console.log(`Using model: ${modelDisplayName} (variation ${i + 1})`);

      // Call Gemini API - Keep it simple
      const parts: any[] = [];

      if (referenceImageBase64) {
        console.log("📤 Sending request WITH reference image");
        console.log("Image data length:", referenceImageBase64.length);
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: referenceImageBase64,
          },
        });
        parts.push({
          text: `Create an SVG similar to this: ${description}. Output only SVG code.`,
        });
      } else {
        console.log("📤 Sending request WITHOUT reference image");
        parts.push({
          text: `Create an SVG: ${description}. Output only SVG code.`,
        });
      }

      console.log("Request parts:", parts.length, "parts");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: parts,
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
        throw new Error(`${modelDisplayName} failed: ${errorMsg}`);
      }

      const data = await response.json();
      const svgCode = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!svgCode) {
        throw new Error(`${modelDisplayName} returned no SVG code`);
      }

      // Clean up the SVG code (remove markdown formatting if present)
      let cleanSvg = svgCode.trim();
      cleanSvg = cleanSvg.replace(/```svg\n?/g, "");
      cleanSvg = cleanSvg.replace(/```\n?/g, "");
      cleanSvg = cleanSvg.trim();

      // Send SVG to plugin.ts for import with positioning info
      parent.postMessage(
        {
          type: "import-svg",
          svg: cleanSvg,
          offsetX: i * (width + spacing), // Offset each variation horizontally
        },
        "*",
      );

      successCount++;
      console.log(
        `✓ Successfully generated variation ${i + 1} with ${modelDisplayName}`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Variation ${i + 1}: ${errorMsg}`);
      console.error(`Failed to generate variation ${i + 1}:`, error);
    }
  }

  // Show final status
  if (successCount > 0) {
    let statusMsg = `Successfully generated ${successCount} of ${numVariations} design${successCount > 1 ? "s" : ""}!`;
    if (errors.length > 0) {
      statusMsg += `\n\nErrors:\n${errors.join("\n")}`;
    }
    showStatus(statusMsg, successCount === numVariations ? "success" : "error");
    setTimeout(clearStatus, errors.length > 0 ? 6000 : 3000);
  } else {
    showStatus(
      `Failed to generate designs.\n\nErrors:\n${errors.join("\n")}`,
      "error",
    );
  }

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
    if (event.data.type === "selection-context") {
      selectionContext = event.data.context || "";
      selectionSvg = event.data.svg || "";

      // Update selection dimensions if provided
      if (event.data.width && event.data.height) {
        selectionDimensions = {
          width: event.data.width,
          height: event.data.height,
        };
        console.log("Selection dimensions updated:", selectionDimensions);
      }

      console.log("Selection context updated:", selectionContext);
      console.log("Selection SVG available:", selectionSvg ? "Yes" : "No");

      // Show/hide selection hint and options
      const selectionHint = document.getElementById("selectionHint");
      const selectionOptions = document.getElementById("selectionOptions");
      // Show options if there's ANY selection context (colors, shapes, etc.)
      const hasSelection =
        !!selectionContext && selectionContext.trim().length > 0;

      console.log(
        "Has selection:",
        hasSelection,
        "Context:",
        selectionContext,
        "SVG length:",
        selectionSvg?.length || 0,
      );

      if (selectionHint) {
        selectionHint.style.display = hasSelection ? "block" : "none";
        console.log(
          "Selection hint display set to:",
          hasSelection ? "block" : "none",
        );
      }
      if (selectionOptions) {
        selectionOptions.style.display = hasSelection ? "block" : "none";
        console.log(
          "Selection options display set to:",
          hasSelection ? "block" : "none",
        );
      }
    }
  }
});

// ===========================
// PDF Import Feature
// ===========================

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

let pdfDocument: any = null;
let currentPage = 1;

const pdfDropZone = document.getElementById("pdfDropZone");
const pdfFileInput = document.getElementById(
  "pdfFileInput",
) as HTMLInputElement;
const pdfInfo = document.getElementById("pdfInfo");
const pdfFileName = document.getElementById("pdfFileName");
const pdfPageCount = document.getElementById("pdfPageCount");
const pdfControls = document.getElementById("pdfControls");
const pdfButtons = document.getElementById("pdfButtons");
const pdfPreviewContainer = document.getElementById("pdfPreviewContainer");
const pdfPreviewCanvas = document.getElementById(
  "pdfPreviewCanvas",
) as HTMLCanvasElement;
const pdfStatus = document.getElementById("pdfStatus");
const importAllPagesBtn = document.getElementById("importAllPagesBtn");
const importCurrentPageBtn = document.getElementById("importCurrentPageBtn");
const prevPageBtn = document.getElementById("prevPageBtn") as HTMLButtonElement;
const nextPageBtn = document.getElementById("nextPageBtn") as HTMLButtonElement;
const pageIndicator = document.getElementById("pageIndicator");
const totalPages = document.getElementById("totalPages");
const currentPageNum = document.getElementById("currentPageNum");
const pdfScale = document.getElementById("pdfScale") as HTMLSelectElement;

// Drop zone click handler
pdfDropZone?.addEventListener("click", () => {
  pdfFileInput?.click();
});

// Drop zone drag and drop handlers
pdfDropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  pdfDropZone.style.borderColor = "var(--color-primary)";
  pdfDropZone.style.backgroundColor = "rgba(var(--color-primary-rgb), 0.1)";
});

pdfDropZone?.addEventListener("dragleave", () => {
  pdfDropZone.style.borderColor = "var(--color-border)";
  pdfDropZone.style.backgroundColor = "transparent";
});

pdfDropZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  pdfDropZone.style.borderColor = "var(--color-border)";
  pdfDropZone.style.backgroundColor = "transparent";

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handlePDFFile(files[0]);
  }
});

// File input change handler
pdfFileInput?.addEventListener("change", (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    handlePDFFile(target.files[0]);
  }
});

// Handle PDF file upload
async function handlePDFFile(file: File) {
  if (!file.type.includes("pdf")) {
    showPDFStatus("Please upload a valid PDF file", "error");
    return;
  }

  showPDFStatus("Loading PDF...", "loading");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfDocument = await loadingTask.promise;

    const numPages = pdfDocument.numPages;
    currentPage = 1;

    // Update UI
    if (pdfFileName) pdfFileName.textContent = file.name;
    if (pdfPageCount) pdfPageCount.textContent = String(numPages);
    if (totalPages) totalPages.textContent = String(numPages);

    if (pdfInfo) pdfInfo.style.display = "block";
    if (pdfControls) pdfControls.style.display = "block";
    if (pdfButtons) pdfButtons.style.display = "block";
    if (pdfPreviewContainer) pdfPreviewContainer.style.display = "block";

    // Render first page
    await renderPage(currentPage);
    updatePageNavigation();
    showPDFStatus(
      `PDF loaded successfully! ${numPages} pages found.`,
      "success",
    );
  } catch (error) {
    console.error("Error loading PDF:", error);
    showPDFStatus("Failed to load PDF. Please try again.", "error");
  }
}

// Render a specific page
async function renderPage(pageNum: number) {
  if (!pdfDocument) return;

  try {
    const page = await pdfDocument.getPage(pageNum);
    const scale = parseFloat(pdfScale?.value || "2");
    const viewport = page.getViewport({ scale });

    const canvas = pdfPreviewCanvas;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    if (pageIndicator) pageIndicator.textContent = String(pageNum);
    if (currentPageNum) currentPageNum.textContent = String(pageNum);
  } catch (error) {
    console.error("Error rendering page:", error);
    showPDFStatus("Failed to render page", "error");
  }
}

// Update page navigation buttons
function updatePageNavigation() {
  if (!pdfDocument) return;

  const numPages = pdfDocument.numPages;
  if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= numPages;
}

// Previous page button
prevPageBtn?.addEventListener("click", async () => {
  if (currentPage > 1) {
    currentPage--;
    await renderPage(currentPage);
    updatePageNavigation();
  }
});

// Next page button
nextPageBtn?.addEventListener("click", async () => {
  if (pdfDocument && currentPage < pdfDocument.numPages) {
    currentPage++;
    await renderPage(currentPage);
    updatePageNavigation();
  }
});

// Scale change handler
pdfScale?.addEventListener("change", async () => {
  if (pdfDocument) {
    await renderPage(currentPage);
  }
});

// Import current page
importCurrentPageBtn?.addEventListener("click", async () => {
  if (!pdfDocument) return;

  showPDFStatus(`Importing page ${currentPage}...`, "loading");
  try {
    await importPage(currentPage);
    showPDFStatus(`Page ${currentPage} imported successfully!`, "success");
  } catch (error) {
    console.error("Error importing page:", error);
    showPDFStatus("Failed to import page", "error");
  }
});

// Import all pages
importAllPagesBtn?.addEventListener("click", async () => {
  if (!pdfDocument) return;

  const numPages = pdfDocument.numPages;
  showPDFStatus(`Importing all ${numPages} pages...`, "loading");

  try {
    for (let i = 1; i <= numPages; i++) {
      showPDFStatus(`Importing page ${i} of ${numPages}...`, "loading");
      await importPage(i);
      // Small delay to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    showPDFStatus(`All ${numPages} pages imported successfully!`, "success");
  } catch (error) {
    console.error("Error importing pages:", error);
    showPDFStatus("Failed to import all pages", "error");
  }
});

// Import a specific page to Penpot
async function importPage(pageNum: number) {
  if (!pdfDocument) return;

  const page = await pdfDocument.getPage(pageNum);
  const scale = parseFloat(pdfScale?.value || "2");
  const viewport = page.getViewport({ scale });

  // Create a temporary canvas for this page
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get canvas context");

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to convert canvas to blob"));
    }, "image/png");
  });

  // Convert blob to Uint8Array
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Send to plugin (convert Uint8Array to regular array for postMessage serialization)
  parent.postMessage(
    {
      type: "import-pdf-page",
      data: Array.from(uint8Array),
      width: viewport.width,
      height: viewport.height,
      pageNum: pageNum,
    },
    "*",
  );
}

// Show PDF status message
function showPDFStatus(message: string, type: "success" | "error" | "loading") {
  if (!pdfStatus) return;

  pdfStatus.textContent = message;
  pdfStatus.className = `status-message ${type}`;
  pdfStatus.style.display = "block";

  if (type === "success" || type === "error") {
    setTimeout(() => {
      if (pdfStatus) pdfStatus.style.display = "none";
    }, 3000);
  }
}

// ===========================
// Translation Feature
// ===========================

const sourceLanguage = document.getElementById(
  "sourceLanguage",
) as HTMLSelectElement;
const targetLanguage = document.getElementById(
  "targetLanguage",
) as HTMLSelectElement;
const useSelectedText = document.getElementById(
  "useSelectedText",
) as HTMLInputElement;
const textInputGroup = document.getElementById("textInputGroup");
const textToTranslate = document.getElementById(
  "textToTranslate",
) as HTMLTextAreaElement;
const translateBtn = document.getElementById("translateBtn");
const translationResult = document.getElementById("translationResult");
const translatedText = document.getElementById("translatedText");
const translationStatus = document.getElementById("translationStatus");
const copyTranslationBtn = document.getElementById("copyTranslationBtn");
const replaceTextBtn = document.getElementById("replaceTextBtn");

let selectedTextFromPenpot = "";
let selectedShapeId = "";

// Toggle text input visibility based on checkbox
useSelectedText?.addEventListener("change", () => {
  if (textInputGroup) {
    textInputGroup.style.display = useSelectedText.checked ? "none" : "block";
  }
  if (replaceTextBtn) {
    replaceTextBtn.style.display = useSelectedText.checked ? "block" : "none";
  }
});

// Request selected text from Penpot
function requestSelectedText() {
  parent.postMessage({ type: "get-selected-text" }, "*");
}

// Listen for messages from plugin
window.addEventListener("message", (event) => {
  if (event.data?.source === "penpot") {
    if (event.data.type === "selected-text") {
      selectedTextFromPenpot = event.data.text || "";
      selectedShapeId = event.data.shapeId || "";

      if (selectedTextFromPenpot) {
        showTranslationStatus(
          `Loaded text from selection: "${selectedTextFromPenpot.substring(0, 50)}${selectedTextFromPenpot.length > 50 ? "..." : ""}"`,
          "success",
        );
      } else {
        showTranslationStatus("No text found in selected shape", "error");
      }
    }
  }
});

// Translate button handler
translateBtn?.addEventListener("click", async () => {
  const apiKey = ENV_API_KEY || apiKeyInput?.value;

  if (!apiKey) {
    showTranslationStatus("Please enter your Gemini API key", "error");
    return;
  }

  let textContent = "";

  if (useSelectedText?.checked) {
    // Request text from Penpot selection
    if (!selectedTextFromPenpot) {
      showTranslationStatus("Getting text from selection...", "loading");
      requestSelectedText();
      // Wait a bit for the response
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!selectedTextFromPenpot) {
      showTranslationStatus(
        "No text found in selection. Please select a text shape in Penpot.",
        "error",
      );
      return;
    }

    textContent = selectedTextFromPenpot;
  } else {
    textContent = textToTranslate?.value || "";
  }

  if (!textContent.trim()) {
    showTranslationStatus("Please enter text to translate", "error");
    return;
  }

  const sourceLang = sourceLanguage?.value || "auto";
  const targetLang = targetLanguage?.value || "en";

  showTranslationStatus("Translating...", "loading");

  try {
    const prompt =
      sourceLang === "auto"
        ? `Translate the following text to ${getLanguageName(targetLang)}. Only output the translated text, nothing else:\n\n${textContent}`
        : `Translate the following text from ${getLanguageName(sourceLang)} to ${getLanguageName(targetLang)}. Only output the translated text, nothing else:\n\n${textContent}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Translation API response:", data);

    const translation = data.candidates[0]?.content?.parts[0]?.text || "";
    console.log("Translation result:", translation);

    if (translation) {
      console.log("Setting translation text to:", translation);
      if (translatedText) {
        translatedText.textContent = translation;
        console.log("translatedText element updated");
      }
      if (translationResult) {
        translationResult.style.display = "block";
        console.log("translationResult displayed");
      }
      showTranslationStatus("Translation complete!", "success");
    } else {
      console.error("No translation in response:", data);
      throw new Error("No translation received");
    }
  } catch (error) {
    console.error("Translation error:", error);
    showTranslationStatus(
      error instanceof Error ? error.message : "Translation failed",
      "error",
    );
  }
});

// Copy translation button
copyTranslationBtn?.addEventListener("click", async () => {
  const text = translatedText?.textContent || "";
  console.log("Attempting to copy text:", text);

  try {
    await navigator.clipboard.writeText(text);
    console.log("Copied successfully");
    showTranslationStatus("Copied to clipboard!", "success");
  } catch (error) {
    console.error("Clipboard API failed:", error);
    // Fallback method
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      console.log("Copied using fallback method");
      showTranslationStatus("Copied to clipboard!", "success");
    } catch (fallbackError) {
      console.error("Fallback copy failed:", fallbackError);
      showTranslationStatus("Failed to copy", "error");
    }
  }
});

// Replace text button
replaceTextBtn?.addEventListener("click", () => {
  const translation = translatedText?.textContent || "";

  if (!translation || !selectedShapeId) {
    showTranslationStatus("No translation or selected shape", "error");
    return;
  }

  parent.postMessage(
    {
      type: "replace-text",
      shapeId: selectedShapeId,
      text: translation,
    },
    "*",
  );

  showTranslationStatus("Text replaced in Penpot!", "success");
});

// Helper function to get language name
function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "European Portuguese",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    ru: "Russian",
  };
  return languages[code] || code;
}

// Show translation status
function showTranslationStatus(
  message: string,
  type: "success" | "error" | "loading",
) {
  if (!translationStatus) return;

  translationStatus.textContent = message;
  translationStatus.className = `status-message ${type}`;
  translationStatus.style.display = "block";

  if (type === "success" || type === "error") {
    setTimeout(() => {
      if (translationStatus) translationStatus.style.display = "none";
    }, 3000);
  }
}
