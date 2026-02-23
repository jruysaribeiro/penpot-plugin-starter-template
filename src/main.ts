import "./style.css";
// @ts-ignore - imagetracerjs has no type definitions
import ImageTracer from "imagetracerjs";
import * as pdfjsLib from "pdfjs-dist";

// API Configuration - Uses SvelteKit route
const API_URL = "/api/gemini";

console.log("Using API URL:", API_URL);

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

// Always use light theme
document.body.dataset.theme = "light";

// ========================================
// Model Selection Modal
// ========================================

const modelModal = document.getElementById("modelModal");
const closeModal = document.getElementById("closeModal");
const cancelModelSelection = document.getElementById("cancelModelSelection");
const confirmModelSelection = document.getElementById(
  "confirmModelSelection",
) as HTMLButtonElement | null;
const modelList = document.getElementById("modelList");
const modelLoadingState = document.getElementById("modelLoadingState");

let selectedModel: string | null = null;
let pendingActionData: any = null;

interface GeminiModel {
  name: string;
  displayName: string;
  description: string;
  supportedGenerationMethods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

async function fetchAvailableModels(): Promise<GeminiModel[]> {
  try {
    console.log("Fetching models from", API_URL);
    const response = await fetch(API_URL, {
      method: "GET",
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch models:", errorText);
      return [];
    }

    const data = await response.json();
    console.log("Fetched models:", data);
    return data.models || [];
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
}

// Helper function to call Gemini API via SvelteKit server route
async function callGeminiAPI(
  base64DataOrPrompt: string,
  model: string,
  action: string,
  originalWidth?: number,
  originalHeight?: number,
): Promise<any> {
  console.log("Calling API endpoint:", API_URL);
  console.log("Model being sent:", model);
  const body: any = {
    model,
    action,
  };

  if (action === "translation") {
    body.prompt = base64DataOrPrompt;
  } else {
    body.base64Data = base64DataOrPrompt;
    body.originalWidth = originalWidth;
    body.originalHeight = originalHeight;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API request failed:", errorText);
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
}

function showModelModal(
  action: string,
  description: string,
  actionData?: any,
): Promise<string | null> {
  return new Promise((resolve) => {
    pendingActionData = actionData;
    selectedModel = null;

    if (modelModal) modelModal.style.display = "flex";

    const modalDescription = document.getElementById("modalDescription");
    if (modalDescription) modalDescription.textContent = description;

    if (modelLoadingState) modelLoadingState.style.display = "block";
    if (modelList) modelList.style.display = "none";
    if (confirmModelSelection) confirmModelSelection.disabled = true;

    // Fetch models
    fetchAvailableModels().then((models) => {
      if (modelLoadingState) modelLoadingState.style.display = "none";

      if (models.length === 0) {
        if (modelList) {
          modelList.innerHTML =
            '<p style="text-align: center; color: #999; padding: 20px;">⚠️ Could not fetch models from API.<br><br>Make sure your .env file has:<br><code style="background: #333; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">GEMINI_API_KEY=your_key</code></p>';
          modelList.style.display = "block";
        }
        return;
      }

      // Filter models based on action
      let filteredModels = models;
      if (action === "background-removal") {
        // Filter for vision models that support image generation
        filteredModels = models.filter(
          (m) =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            (m.name.includes("vision") ||
              m.name.includes("flash") ||
              m.name.includes("pro")),
        );
      } else if (action === "translation") {
        // Filter for text generation models
        filteredModels = models.filter(
          (m) =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            !m.name.includes("embedding"),
        );
      }

      if (modelList) {
        modelList.innerHTML = filteredModels
          .map(
            (model) => `
          <div class="model-item" data-model="${model.name}">
            <div class="model-name">${model.displayName || model.name.split("/").pop()}</div>
            <div class="model-description">${model.description || "No description available"}</div>
            <div class="model-capabilities">
              ${model.supportedGenerationMethods?.map((method) => `<span class="model-capability">${method}</span>`).join("") || ""}
            </div>
          </div>
        `,
          )
          .join("");
        modelList.style.display = "block";

        // Add click handlers
        modelList.querySelectorAll(".model-item").forEach((item) => {
          item.addEventListener("click", () => {
            modelList
              .querySelectorAll(".model-item")
              .forEach((i) => i.classList.remove("selected"));
            item.classList.add("selected");
            selectedModel = item.getAttribute("data-model");
            if (confirmModelSelection) confirmModelSelection.disabled = false;
          });
        });
      }
    });

    const closeHandler = () => {
      if (modelModal) modelModal.style.display = "none";
      resolve(null);
    };

    const confirmHandler = () => {
      if (modelModal) modelModal.style.display = "none";
      resolve(selectedModel);
    };

    closeModal?.addEventListener("click", closeHandler, { once: true });
    cancelModelSelection?.addEventListener("click", closeHandler, {
      once: true,
    });
    confirmModelSelection?.addEventListener("click", confirmHandler, {
      once: true,
    });
  });
}

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

// Image tracing handlers
function handleTraceImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    showTraceStatus("Please upload an image file", "error");
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

  showTraceStatus("Tracing image to SVG...", "loading");
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

      showTraceStatus("✓ SVG traced and imported successfully!", "success");
      setTimeout(clearTraceStatus, 3000);
    } catch (error) {
      console.error("Tracing error:", error);
      showTraceStatus("Failed to trace image", "error");
    } finally {
      if (traceBtn) traceBtn.disabled = false;
    }
  }, 100);
});

// Image tracing status
const traceStatusDiv = document.getElementById("imageEditorStatus");

function showTraceStatus(
  message: string,
  type: "loading" | "error" | "success",
) {
  if (!traceStatusDiv) return;
  traceStatusDiv.innerHTML = message.replace(/\n/g, "<br>");
  traceStatusDiv.className = `status-message ${type}`;
}

function clearTraceStatus() {
  if (!traceStatusDiv) return;
  traceStatusDiv.textContent = "";
  traceStatusDiv.className = "status-message";
}

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

  // Show model selection modal
  const model = await showModelModal(
    "translation",
    "Select a model for translation:",
  );

  if (!model) {
    showTranslationStatus("Operation cancelled", "error");
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

    // Use the selected model
    const data = await callGeminiAPI(prompt, model, "translation");

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

// ===========================
// Image Editor Feature
// ===========================

const loadImageBtn = document.getElementById("loadImageBtn");
const imageEditorCanvas = document.getElementById("imageEditorCanvas");
const imageEditOptions = document.getElementById("imageEditOptions");
const cropCanvas = document.getElementById("cropCanvas") as HTMLCanvasElement;
const cropOverlay = document.getElementById("cropOverlay");
const startCropBtn = document.getElementById("startCropBtn");
const resetCropBtn = document.getElementById("resetCropBtn");
const flipHorizontalBtn = document.getElementById("flipHorizontalBtn");
const flipVerticalBtn = document.getElementById("flipVerticalBtn");
const cropControls = document.getElementById("cropControls");
const applyCropBtn = document.getElementById("applyCropBtn");
const cancelCropBtn = document.getElementById("cancelCropBtn");
const imageEditorStatus = document.getElementById("imageEditorStatus");

// Filter controls
const brightnessSlider = document.getElementById(
  "brightnessSlider",
) as HTMLInputElement;
const brightnessValue = document.getElementById("brightnessValue");
const contrastSlider = document.getElementById(
  "contrastSlider",
) as HTMLInputElement;
const contrastValue = document.getElementById("contrastValue");
const saturationSlider = document.getElementById(
  "saturationSlider",
) as HTMLInputElement;
const saturationValue = document.getElementById("saturationValue");
const hueSlider = document.getElementById("hueSlider") as HTMLInputElement;
const hueValue = document.getElementById("hueValue");
const blurSlider = document.getElementById("blurSlider") as HTMLInputElement;
const blurValue = document.getElementById("blurValue");
const grayscaleSlider = document.getElementById(
  "grayscaleSlider",
) as HTMLInputElement;
const grayscaleValue = document.getElementById("grayscaleValue");
const sepiaSlider = document.getElementById("sepiaSlider") as HTMLInputElement;
const sepiaValue = document.getElementById("sepiaValue");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const applyChangesBtn = document.getElementById("applyChangesBtn");

let originalImage: HTMLImageElement | null = null;
let selectedImageId = "";
let isCropping = false;
// Variables kept for potential future use but currently unused
// @ts-ignore - Unused variable
let cropStart: { x: number; y: number } | null = null;
// @ts-ignore - Unused variable
let cropEnd: { x: number; y: number } | null = null;

// Filter state
const filterState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
};

// Apply all filters to the canvas
function applyFilters() {
  if (!originalImage) return;

  const ctx = cropCanvas.getContext("2d");
  if (!ctx) return;

  // Clear and redraw original image
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

  // Build CSS filter string
  const filters: string[] = [];

  if (filterState.brightness !== 0) {
    filters.push(`brightness(${100 + filterState.brightness}%)`);
  }

  if (filterState.contrast !== 0) {
    filters.push(`contrast(${100 + filterState.contrast}%)`);
  }

  if (filterState.saturation !== 0) {
    filters.push(`saturate(${100 + filterState.saturation}%)`);
  }

  if (filterState.hue !== 0) {
    filters.push(`hue-rotate(${filterState.hue}deg)`);
  }

  if (filterState.blur > 0) {
    filters.push(`blur(${filterState.blur}px)`);
  }

  if (filterState.grayscale > 0) {
    filters.push(`grayscale(${filterState.grayscale}%)`);
  }

  if (filterState.sepia > 0) {
    filters.push(`sepia(${filterState.sepia}%)`);
  }

  // Apply filters
  if (filters.length > 0) {
    ctx.filter = filters.join(" ");
  } else {
    ctx.filter = "none";
  }

  ctx.drawImage(originalImage, 0, 0, cropCanvas.width, cropCanvas.height);
  ctx.filter = "none"; // Reset filter for future draws
}

// Load selected image from Penpot
loadImageBtn?.addEventListener("click", () => {
  showImageEditorStatus("Loading image from selection...", "loading");
  parent.postMessage({ type: "get-selected-image" }, "*");
});

// Listen for image data from Penpot
window.addEventListener("message", (event) => {
  if (event.data?.source === "penpot" && event.data.type === "selected-image") {
    if (event.data.message) {
      showImageEditorStatus(event.data.message, "error");
    } else if (event.data.imageData && event.data.shapeId) {
      // imageData now contains shape info (x, y, width, height)
      setupCropInterface(event.data.imageData, event.data.shapeId);
    } else {
      showImageEditorStatus("No image selected or image not found", "error");
    }
  }
});

// Setup crop interface without loading actual image
function setupCropInterface(imageInfo: any, shapeId: string) {
  selectedImageId = shapeId;

  // If we have the actual image data, load it
  if (imageInfo.dataUrl) {
    const img = new Image();
    img.onload = () => {
      originalImage = img;

      // PRESERVE ORIGINAL DIMENSIONS - Never resize the canvas
      // This maintains aspect ratio, size, and resolution
      const width = img.width;
      const height = img.height;

      console.log("Image loaded with ORIGINAL dimensions:", {
        originalShapeWidth: imageInfo.width,
        originalShapeHeight: imageInfo.height,
        canvasWidth: width,
        canvasHeight: height,
        aspectRatio: (width / height).toFixed(2),
        previewScale: imageInfo.previewScale || 1.0,
      });

      // Set canvas to EXACT original dimensions
      cropCanvas.width = width;
      cropCanvas.height = height;

      // CSS will handle display scaling while preserving actual dimensions

      const ctx = cropCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }

      if (imageEditorCanvas) imageEditorCanvas.style.display = "block";
      if (imageEditOptions) imageEditOptions.style.display = "block";
      if (cropControls) cropControls.style.display = "none";
      isCropping = false;
      cropStart = null;
      cropEnd = null;

      // Reset filters when loading new image
      filterState.brightness = 0;
      filterState.contrast = 0;
      filterState.saturation = 0;
      filterState.hue = 0;
      filterState.blur = 0;
      filterState.grayscale = 0;
      filterState.sepia = 0;

      if (brightnessSlider) brightnessSlider.value = "0";
      if (brightnessValue) brightnessValue.textContent = "0";
      if (contrastSlider) contrastSlider.value = "0";
      if (contrastValue) contrastValue.textContent = "0";
      if (saturationSlider) saturationSlider.value = "0";
      if (saturationValue) saturationValue.textContent = "0";
      if (hueSlider) hueSlider.value = "0";
      if (hueValue) hueValue.textContent = "0";
      if (blurSlider) blurSlider.value = "0";
      if (blurValue) blurValue.textContent = "0";
      if (grayscaleSlider) grayscaleSlider.value = "0";
      if (grayscaleValue) grayscaleValue.textContent = "0";
      if (sepiaSlider) sepiaSlider.value = "0";
      if (sepiaValue) sepiaValue.textContent = "0";

      showImageEditorStatus(
        "Image loaded! Use sliders to adjust or click operations.",
        "success",
      );
    };

    img.onerror = () => {
      showImageEditorStatus("Failed to load image", "error");
    };

    img.src = imageInfo.dataUrl;
    return;
  }

  // Fallback to placeholder if no image data - preserve original dimensions
  const width = imageInfo.width;
  const height = imageInfo.height;

  cropCanvas.width = width;
  cropCanvas.height = height;

  const ctx = cropCanvas.getContext("2d");
  if (ctx) {
    // Draw a placeholder showing the image area
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#999";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    ctx.fillStyle = "#666";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Image Area", width / 2, height / 2 - 10);
    ctx.fillText(
      `${Math.round(imageInfo.width)} × ${Math.round(imageInfo.height)}`,
      width / 2,
      height / 2 + 10,
    );
  }

  if (imageEditorCanvas) imageEditorCanvas.style.display = "block";
  if (cropControls) cropControls.style.display = "none";
  isCropping = false;
  cropStart = null;
  cropEnd = null;

  showImageEditorStatus(
    "Click 'Start Crop' and draw the area you want to keep",
    "success",
  );
}

// Variables for corner-drag cropping
let dragHandle: string | null = null; // 'tl', 'tr', 'bl', 'br' for corners
let cropRect = { x: 0, y: 0, width: 0, height: 0 };

// Start crop mode
startCropBtn?.addEventListener("click", () => {
  isCropping = true;
  // Initialize crop rect to full canvas
  cropRect = {
    x: 0,
    y: 0,
    width: cropCanvas.width,
    height: cropCanvas.height,
  };
  if (cropControls) cropControls.style.display = "block";
  drawCropHandles();
  showImageEditorStatus("Drag the corners to adjust crop area", "loading");
});

// Reset crop
resetCropBtn?.addEventListener("click", () => {
  isCropping = false;
  dragHandle = null;
  if (cropControls) cropControls.style.display = "none";
  if (cropOverlay) cropOverlay.innerHTML = "";

  // Reset filters too
  filterState.brightness = 0;
  filterState.contrast = 0;
  filterState.saturation = 0;
  filterState.hue = 0;
  filterState.blur = 0;
  filterState.grayscale = 0;
  filterState.sepia = 0;

  if (brightnessSlider) brightnessSlider.value = "0";
  if (brightnessValue) brightnessValue.textContent = "0";
  if (contrastSlider) contrastSlider.value = "0";
  if (contrastValue) contrastValue.textContent = "0";
  if (saturationSlider) saturationSlider.value = "0";
  if (saturationValue) saturationValue.textContent = "0";
  if (hueSlider) hueSlider.value = "0";
  if (hueValue) hueValue.textContent = "0";
  if (blurSlider) blurSlider.value = "0";
  if (blurValue) blurValue.textContent = "0";
  if (grayscaleSlider) grayscaleSlider.value = "0";
  if (grayscaleValue) grayscaleValue.textContent = "0";
  if (sepiaSlider) sepiaSlider.value = "0";
  if (sepiaValue) sepiaValue.textContent = "0";

  // Redraw clean image
  const ctx = cropCanvas.getContext("2d");
  if (ctx && originalImage) {
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    ctx.drawImage(originalImage, 0, 0, cropCanvas.width, cropCanvas.height);
  }

  showImageEditorStatus("Image and filters reset", "success");
});

// Flip horizontal
flipHorizontalBtn?.addEventListener("click", () => {
  const ctx = cropCanvas.getContext("2d");
  if (!ctx || !originalImage) return;

  // Create a temporary canvas to flip the original image without filters
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = cropCanvas.width;
  tempCanvas.height = cropCanvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  // Draw original without filters
  tempCtx.save();
  tempCtx.scale(-1, 1);
  tempCtx.drawImage(
    originalImage,
    -tempCanvas.width,
    0,
    tempCanvas.width,
    tempCanvas.height,
  );
  tempCtx.restore();

  // Update original image to the flipped version
  const flippedImage = new Image();
  flippedImage.onload = () => {
    originalImage = flippedImage;
    applyFilters(); // Reapply current filters
    showImageEditorStatus("Image flipped horizontally", "success");
    setTimeout(() => {
      if (imageEditorStatus) imageEditorStatus.style.display = "none";
    }, 2000);
  };
  flippedImage.src = tempCanvas.toDataURL();
});

// Flip vertical
flipVerticalBtn?.addEventListener("click", () => {
  const ctx = cropCanvas.getContext("2d");
  if (!ctx || !originalImage) return;

  // Create a temporary canvas to flip the original image without filters
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = cropCanvas.width;
  tempCanvas.height = cropCanvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  // Draw original without filters
  tempCtx.save();
  tempCtx.scale(1, -1);
  tempCtx.drawImage(
    originalImage,
    0,
    -tempCanvas.height,
    tempCanvas.width,
    tempCanvas.height,
  );
  tempCtx.restore();

  // Update original image to the flipped version
  const flippedImage = new Image();
  flippedImage.onload = () => {
    originalImage = flippedImage;
    applyFilters(); // Reapply current filters
    showImageEditorStatus("Image flipped vertically", "success");
    setTimeout(() => {
      if (imageEditorStatus) imageEditorStatus.style.display = "none";
    }, 2000);
  };
  flippedImage.src = tempCanvas.toDataURL();
});

// Filter slider event listeners
brightnessSlider?.addEventListener("input", (e) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  filterState.brightness = value;
  if (brightnessValue) brightnessValue.textContent = value.toString();
  applyFilters();
});

contrastSlider?.addEventListener("input", (e) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  filterState.contrast = value;
  if (contrastValue) contrastValue.textContent = value.toString();
  applyFilters();
});

saturationSlider?.addEventListener("input", (e) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  filterState.saturation = value;
  if (saturationValue) saturationValue.textContent = value.toString();
  applyFilters();
});

hueSlider?.addEventListener("input", (e) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  filterState.hue = value;
  if (hueValue) hueValue.textContent = value.toString();
  applyFilters();
});

blurSlider?.addEventListener("input", (e) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  filterState.blur = value;
  if (blurValue) blurValue.textContent = value.toString();
  applyFilters();
});

grayscaleSlider?.addEventListener("input", (e) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  filterState.grayscale = value;
  if (grayscaleValue) grayscaleValue.textContent = value.toString();
  applyFilters();
});

sepiaSlider?.addEventListener("input", (e) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  filterState.sepia = value;
  if (sepiaValue) sepiaValue.textContent = value.toString();
  applyFilters();
});

// Reset all filters
resetFiltersBtn?.addEventListener("click", () => {
  filterState.brightness = 0;
  filterState.contrast = 0;
  filterState.saturation = 0;
  filterState.hue = 0;
  filterState.blur = 0;
  filterState.grayscale = 0;
  filterState.sepia = 0;

  if (brightnessSlider) brightnessSlider.value = "0";
  if (brightnessValue) brightnessValue.textContent = "0";
  if (contrastSlider) contrastSlider.value = "0";
  if (contrastValue) contrastValue.textContent = "0";
  if (saturationSlider) saturationSlider.value = "0";
  if (saturationValue) saturationValue.textContent = "0";
  if (hueSlider) hueSlider.value = "0";
  if (hueValue) hueValue.textContent = "0";
  if (blurSlider) blurSlider.value = "0";
  if (blurValue) blurValue.textContent = "0";
  if (grayscaleSlider) grayscaleSlider.value = "0";
  if (grayscaleValue) grayscaleValue.textContent = "0";
  if (sepiaSlider) sepiaSlider.value = "0";
  if (sepiaValue) sepiaValue.textContent = "0";

  applyFilters();
  showImageEditorStatus("All filters reset", "success");
  setTimeout(() => {
    if (imageEditorStatus) imageEditorStatus.style.display = "none";
  }, 2000);
});

// Apply changes and replace in Penpot
applyChangesBtn?.addEventListener("click", async () => {
  if (!selectedImageId || !originalImage) {
    showImageEditorStatus("No image loaded", "error");
    return;
  }

  showImageEditorStatus("Processing and uploading image...", "loading");

  try {
    // Get the current canvas with all filters applied
    const imageDataUrl = cropCanvas.toDataURL("image/png");

    // Convert to array buffer
    const base64Data = imageDataUrl.split(",")[1];
    const binaryData = atob(base64Data);
    const uint8Array = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      uint8Array[i] = binaryData.charCodeAt(i);
    }

    console.log(
      "Applying changes with dimensions:",
      cropCanvas.width,
      "x",
      cropCanvas.height,
    );

    // Send to Penpot with actual canvas dimensions
    parent.postMessage(
      {
        type: "upload-cropped-image",
        imageData: Array.from(uint8Array),
        shapeId: selectedImageId,
        width: cropCanvas.width,
        height: cropCanvas.height,
      },
      "*",
    );

    showImageEditorStatus("Image updated successfully!", "success");
    setTimeout(() => {
      if (imageEditorStatus) imageEditorStatus.style.display = "none";
    }, 3000);
  } catch (error) {
    console.error("Error applying changes:", error);
    showImageEditorStatus("Failed to apply changes", "error");
  }
});

// Canvas mouse events for corner dragging
cropCanvas?.addEventListener("mousedown", (e) => {
  if (!isCropping) return;

  const rect = cropCanvas.getBoundingClientRect();
  // Scale mouse coordinates to match actual canvas dimensions
  const scaleX = cropCanvas.width / rect.width;
  const scaleY = cropCanvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  // Check if clicking on a corner handle (20px radius)
  const handleSize = 20;
  if (
    Math.abs(mouseX - cropRect.x) < handleSize &&
    Math.abs(mouseY - cropRect.y) < handleSize
  ) {
    dragHandle = "tl"; // top-left
  } else if (
    Math.abs(mouseX - (cropRect.x + cropRect.width)) < handleSize &&
    Math.abs(mouseY - cropRect.y) < handleSize
  ) {
    dragHandle = "tr"; // top-right
  } else if (
    Math.abs(mouseX - cropRect.x) < handleSize &&
    Math.abs(mouseY - (cropRect.y + cropRect.height)) < handleSize
  ) {
    dragHandle = "bl"; // bottom-left
  } else if (
    Math.abs(mouseX - (cropRect.x + cropRect.width)) < handleSize &&
    Math.abs(mouseY - (cropRect.y + cropRect.height)) < handleSize
  ) {
    dragHandle = "br"; // bottom-right
  }
});

cropCanvas?.addEventListener("mousemove", (e) => {
  if (!isCropping || !dragHandle) return;

  const rect = cropCanvas.getBoundingClientRect();
  // Scale mouse coordinates to match actual canvas dimensions
  const scaleX = cropCanvas.width / rect.width;
  const scaleY = cropCanvas.height / rect.height;
  const mouseX = Math.max(
    0,
    Math.min(cropCanvas.width, (e.clientX - rect.left) * scaleX),
  );
  const mouseY = Math.max(
    0,
    Math.min(cropCanvas.height, (e.clientY - rect.top) * scaleY),
  );

  // Update crop rect based on which handle is being dragged
  if (dragHandle === "tl") {
    const newWidth = cropRect.x + cropRect.width - mouseX;
    const newHeight = cropRect.y + cropRect.height - mouseY;
    if (newWidth > 20 && newHeight > 20) {
      cropRect.x = mouseX;
      cropRect.y = mouseY;
      cropRect.width = newWidth;
      cropRect.height = newHeight;
    }
  } else if (dragHandle === "tr") {
    const newWidth = mouseX - cropRect.x;
    const newHeight = cropRect.y + cropRect.height - mouseY;
    if (newWidth > 20 && newHeight > 20) {
      cropRect.width = newWidth;
      cropRect.y = mouseY;
      cropRect.height = newHeight;
    }
  } else if (dragHandle === "bl") {
    const newWidth = cropRect.x + cropRect.width - mouseX;
    const newHeight = mouseY - cropRect.y;
    if (newWidth > 20 && newHeight > 20) {
      cropRect.x = mouseX;
      cropRect.width = newWidth;
      cropRect.height = newHeight;
    }
  } else if (dragHandle === "br") {
    const newWidth = mouseX - cropRect.x;
    const newHeight = mouseY - cropRect.y;
    if (newWidth > 20 && newHeight > 20) {
      cropRect.width = newWidth;
      cropRect.height = newHeight;
    }
  }

  drawCropHandles();
});

cropCanvas?.addEventListener("mouseup", () => {
  dragHandle = null;
});

// Draw crop rectangle with handles
function drawCropHandles() {
  const ctx = cropCanvas.getContext("2d");
  if (!ctx) return;

  // Redraw original image
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  if (originalImage) {
    ctx.drawImage(originalImage, 0, 0, cropCanvas.width, cropCanvas.height);
  }

  // Draw semi-transparent overlay outside crop area
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

  // Top
  ctx.fillRect(0, 0, cropCanvas.width, cropRect.y);
  // Bottom
  ctx.fillRect(
    0,
    cropRect.y + cropRect.height,
    cropCanvas.width,
    cropCanvas.height - cropRect.y - cropRect.height,
  );
  // Left
  ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.height);
  // Right
  ctx.fillRect(
    cropRect.x + cropRect.width,
    cropRect.y,
    cropCanvas.width - cropRect.x - cropRect.width,
    cropRect.height,
  );

  // Draw crop rectangle border
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2;
  ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

  // Draw corner handles
  const handleSize = 10;
  ctx.fillStyle = "#6366f1";

  // Top-left
  ctx.fillRect(
    cropRect.x - handleSize / 2,
    cropRect.y - handleSize / 2,
    handleSize,
    handleSize,
  );
  // Top-right
  ctx.fillRect(
    cropRect.x + cropRect.width - handleSize / 2,
    cropRect.y - handleSize / 2,
    handleSize,
    handleSize,
  );
  // Bottom-left
  ctx.fillRect(
    cropRect.x - handleSize / 2,
    cropRect.y + cropRect.height - handleSize / 2,
    handleSize,
    handleSize,
  );
  // Bottom-right
  ctx.fillRect(
    cropRect.x + cropRect.width - handleSize / 2,
    cropRect.y + cropRect.height - handleSize / 2,
    handleSize,
    handleSize,
  );

  // Show dimensions (canvasScale is 1 now, so dimensions are actual pixels)
  ctx.fillStyle = "#6366f1";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(
    `${Math.round(cropRect.width)} × ${Math.round(cropRect.height)}px`,
    cropRect.x + 5,
    cropRect.y + 20,
  );
}

// Apply crop
applyCropBtn?.addEventListener("click", async () => {
  if (!cropRect || cropRect.width === 0 || cropRect.height === 0) {
    showImageEditorStatus("No crop area selected", "error");
    return;
  }

  if (!originalImage) {
    showImageEditorStatus("No image loaded", "error");
    return;
  }

  showImageEditorStatus("Processing crop...", "loading");

  try {
    // Since we preserve original dimensions, crop coordinates are already in pixels
    console.log("Crop area (in pixels):", {
      x: cropRect.x,
      y: cropRect.y,
      width: cropRect.width,
      height: cropRect.height,
    });

    // Create output canvas with exact crop dimensions
    const cropOutputCanvas = document.createElement("canvas");
    cropOutputCanvas.width = cropRect.width;
    cropOutputCanvas.height = cropRect.height;
    const cropCtx = cropOutputCanvas.getContext("2d");

    if (!cropCtx) {
      throw new Error("Could not get canvas context");
    }

    // Draw the cropped portion from the original image
    cropCtx.drawImage(
      originalImage,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      cropRect.width,
      cropRect.height,
    );

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      cropOutputCanvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to create blob"));
      }, "image/png");
    });

    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log("Crop output:", {
      blobSize: uint8Array.length + " bytes",
      width: cropRect.width,
      height: cropRect.height,
    });

    // Send cropped image data to plugin
    parent.postMessage(
      {
        type: "upload-cropped-image",
        imageData: Array.from(uint8Array),
        width: cropRect.width,
        height: cropRect.height,
        originalX: cropRect.x,
        originalY: cropRect.y,
        shapeId: selectedImageId,
      },
      "*",
    );

    showImageEditorStatus("Uploading cropped image...", "loading");
  } catch (error) {
    console.error("Crop error:", error);
    showImageEditorStatus("Failed to crop image", "error");
  }
});

// Listen for crop success
window.addEventListener("message", (event) => {
  if (event.data.source === "penpot" && event.data.type === "crop-success") {
    showImageEditorStatus("Image cropped successfully!", "success");

    // Reset UI
    setTimeout(() => {
      if (imageEditorCanvas) imageEditorCanvas.style.display = "none";
      if (cropControls) cropControls.style.display = "none";
      isCropping = false;
      dragHandle = null;
    }, 1500);
  }
});

// Cancel crop
cancelCropBtn?.addEventListener("click", () => {
  isCropping = false;
  dragHandle = null;
  if (cropControls) cropControls.style.display = "none";
  if (cropOverlay) cropOverlay.innerHTML = "";

  // Redraw clean image
  const ctx = cropCanvas.getContext("2d");
  if (ctx && originalImage) {
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    ctx.drawImage(originalImage, 0, 0, cropCanvas.width, cropCanvas.height);
  }
});

// Show image editor status
function showImageEditorStatus(
  message: string,
  type: "success" | "error" | "loading",
) {
  if (!imageEditorStatus) return;

  imageEditorStatus.textContent = message;
  imageEditorStatus.className = `status-message ${type}`;
  imageEditorStatus.style.display = "block";

  if (type === "success" || type === "error") {
    setTimeout(() => {
      if (imageEditorStatus) imageEditorStatus.style.display = "none";
    }, 3000);
  }
}

// ========================================
// Background Removal Feature
// ========================================

const removeBgBtn = document.querySelector<HTMLButtonElement>("#removeBgBtn");

function showBgRemovalStatus(
  message: string,
  type: "success" | "error" | "loading",
) {
  // Use the same status display as image editor
  if (!imageEditorStatus) return;

  imageEditorStatus.textContent = message;
  imageEditorStatus.className = `status-message ${type}`;
  imageEditorStatus.style.display = "block";

  if (type === "success" || type === "error") {
    setTimeout(() => {
      if (imageEditorStatus) imageEditorStatus.style.display = "none";
    }, 3000);
  }
}

removeBgBtn?.addEventListener("click", async () => {
  showBgRemovalStatus("Requesting image from Penpot...", "loading");

  // Request the selected image from Penpot
  parent.postMessage(
    {
      type: "get-image-for-bg-removal",
    },
    "*",
  );
});

// Listen for image data from Penpot
window.addEventListener("message", async (event) => {
  if (
    event.data.source === "penpot" &&
    event.data.type === "image-for-bg-removal"
  ) {
    if (!event.data.imageData) {
      showBgRemovalStatus("Please select an image in Penpot first", "error");
      return;
    }

    try {
      showBgRemovalStatus(
        "Click on the background color to remove...",
        "loading",
      );

      // Store original dimensions
      const originalWidth = event.data.width;
      const originalHeight = event.data.height;

      console.log("Original image dimensions:", originalWidth, originalHeight);

      const imageDataUrl = event.data.imageData; // Full data URL

      // Load the original image
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        // Create preview canvas
        const previewCanvas = document.createElement("canvas");
        const maxPreviewSize = 400;
        const scale = Math.min(
          1,
          maxPreviewSize / Math.max(originalWidth, originalHeight),
        );
        const previewWidth = originalWidth * scale;
        const previewHeight = originalHeight * scale;

        previewCanvas.width = previewWidth;
        previewCanvas.height = previewHeight;
        previewCanvas.style.cursor = "crosshair";
        previewCanvas.style.border = "2px solid var(--color-accent)";
        previewCanvas.style.maxWidth = "100%";
        previewCanvas.style.display = "block";
        previewCanvas.style.margin = "0 auto";

        const previewCtx = previewCanvas.getContext("2d");
        if (!previewCtx) {
          throw new Error("Failed to get preview context");
        }

        previewCtx.drawImage(img, 0, 0, previewWidth, previewHeight);

        // Show preview with instructions
        showBgRemovalStatus(
          "Click on the background color you want to remove",
          "success",
        );

        // Insert canvas after the status message
        const imageEditorTab = document.querySelector("#image-editor");
        if (imageEditorTab && imageEditorStatus) {
          imageEditorTab.insertBefore(previewCanvas, imageEditorStatus);
        }

        // Handle click to select color
        previewCanvas.addEventListener("click", (e) => {
          const rect = previewCanvas.getBoundingClientRect();
          const x = Math.floor(
            (e.clientX - rect.left) * (previewWidth / rect.width),
          );
          const y = Math.floor(
            (e.clientY - rect.top) * (previewHeight / rect.height),
          );

          const pixelData = previewCtx.getImageData(x, y, 1, 1).data;
          const selectedColor = {
            r: pixelData[0],
            g: pixelData[1],
            b: pixelData[2],
          };

          console.log("Selected background color:", selectedColor);

          // Remove the preview canvas
          previewCanvas.remove();

          showBgRemovalStatus("Removing background...", "loading");

          // Process the full-size image
          const canvas = document.createElement("canvas");
          canvas.width = originalWidth;
          canvas.height = originalHeight;
          const ctx = canvas.getContext("2d", { alpha: true });

          if (!ctx) {
            throw new Error("Failed to get canvas context");
          }

          ctx.drawImage(img, 0, 0, originalWidth, originalHeight);

          const imageData = ctx.getImageData(
            0,
            0,
            originalWidth,
            originalHeight,
          );
          const pixels = imageData.data;

          // Scan every pixel and make matching colors transparent
          const tolerance = 50;
          let pixelsRemoved = 0;

          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            // Check if this pixel matches the selected color
            if (
              Math.abs(r - selectedColor.r) <= tolerance &&
              Math.abs(g - selectedColor.g) <= tolerance &&
              Math.abs(b - selectedColor.b) <= tolerance
            ) {
              pixels[i + 3] = 0; // Make transparent
              pixelsRemoved++;
            }
          }

          console.log("Pixels made transparent:", pixelsRemoved);

          // Put the modified image data back
          ctx.putImageData(imageData, 0, 0);

          // Convert to PNG with alpha channel
          canvas.toBlob(
            (blob) => {
              if (blob) {
                blob.arrayBuffer().then((buffer) => {
                  const pngArray = new Uint8Array(buffer);

                  showBgRemovalStatus(
                    "Uploading result to Penpot...",
                    "loading",
                  );

                  // Send PNG result back to Penpot
                  parent.postMessage(
                    {
                      type: "upload-bg-removed-image",
                      imageData: Array.from(pngArray),
                      originalShapeId: event.data.shapeId,
                      width: originalWidth,
                      height: originalHeight,
                    },
                    "*",
                  );
                });
              }
            },
            "image/png",
            1.0,
          );
        });
      };

      img.onerror = () => {
        throw new Error("Failed to load image");
      };

      img.src = imageDataUrl;
    } catch (error) {
      console.error("Background removal error:", error);
      showBgRemovalStatus(
        error instanceof Error ? error.message : "Failed to remove background",
        "error",
      );
    }
  }

  if (
    event.data.source === "penpot" &&
    event.data.type === "bg-removal-success"
  ) {
    showBgRemovalStatus("Background removed successfully!", "success");
  }
});
