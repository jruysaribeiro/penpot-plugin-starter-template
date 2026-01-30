penpot.ui.open("Penpot AI Designer", "", {
  width: 440,
  height: 600,
});

// Function to extract context from selected elements
function getSelectionContext(): {
  context: string;
  width: number;
  height: number;
  svg: string;
} {
  const selection = penpot.selection;

  if (!selection || selection.length === 0) {
    return { context: "", width: 500, height: 500, svg: "" };
  }

  const colors = new Set<string>();
  const shapes: string[] = [];
  let hasText = false;
  let hasFills = false;
  let hasStrokes = false;
  let strokeCount = 0;
  let fillCount = 0;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  selection.forEach((shape) => {
    // Calculate bounding box
    if (
      shape.x !== undefined &&
      shape.y !== undefined &&
      shape.width &&
      shape.height
    ) {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + shape.width);
      maxY = Math.max(maxY, shape.y + shape.height);
    }

    // Collect colors and analyze style
    if (shape.fills && Array.isArray(shape.fills)) {
      shape.fills.forEach((fill: any) => {
        if (fill.fillColor) {
          colors.add(fill.fillColor);
          hasFills = true;
          fillCount++;
        }
      });
    }
    if (shape.strokes && Array.isArray(shape.strokes)) {
      shape.strokes.forEach((stroke: any) => {
        if (stroke.strokeColor) {
          colors.add(stroke.strokeColor);
          hasStrokes = true;
          strokeCount++;
        }
      });
    }

    // Identify shape types
    if (shape.type === "text") {
      hasText = true;
    } else if (shape.type === "rectangle") {
      shapes.push("rectangles");
    } else if (shape.type === "ellipse") {
      shapes.push("circles/ellipses");
    } else if (shape.type === "path") {
      shapes.push("custom paths");
    }
  });

  let context = "";
  const hasSelection = selection.length > 0;

  console.log("Selection analysis:", {
    selectionCount: selection.length,
    hasStrokes,
    hasFills,
    strokeCount,
    fillCount,
    colorsFound: colors.size,
    shapesFound: shapes.length,
  });

  // Determine visual style based on fills vs strokes
  if (hasSelection) {
    if (hasStrokes && !hasFills) {
      context +=
        "IMPORTANT STYLE: Create a SIMPLE LINE DRAWING with outlines only, NO FILLS. Use minimalist line art style. ";
    } else if (!hasStrokes && hasFills) {
      context += "STYLE: Use solid filled shapes without outlines. ";
    } else if (strokeCount > fillCount * 2) {
      context +=
        "IMPORTANT STYLE: Emphasize line work and outlines over fills. Keep it minimal. ";
    } else if (!hasStrokes && !hasFills && shapes.length > 0) {
      // Paths without detected fills/strokes - likely line art
      context +=
        "IMPORTANT STYLE: Create a SIMPLE LINE DRAWING with clean outlines. Use minimalist line art style with NO FILLS. ";
    }
  }

  if (colors.size > 0) {
    context += `Use these colors: ${Array.from(colors).join(", ")}. `;
  }

  if (shapes.length > 0) {
    context += `Incorporate similar shapes like ${[...new Set(shapes)].join(", ")}. `;
  }

  if (hasText) {
    context += `Include text elements in the design. `;
  }

  // If we have a selection but no specific context, add a generic note
  if (hasSelection && !context) {
    context = `${selection.length} element${selection.length > 1 ? "s" : ""} selected. `;
  }

  // Calculate dimensions from bounding box
  const width = maxX > minX ? Math.round(maxX - minX) : 500;
  const height = maxY > minY ? Math.round(maxY - minY) : 500;

  // Export selection as SVG - TODO: Find correct Penpot API for SVG export
  let svg = "";
  // For now, we'll add this feature later when we find the right API
  // The checkbox will still appear based on context

  return { context, width, height, svg };
}

// Send selection context when it changes
penpot.on("selectionchange", () => {
  const { context, width, height, svg } = getSelectionContext();
  penpot.ui.sendMessage({
    source: "penpot",
    type: "selection-context",
    context,
    width,
    height,
    svg,
  });
});

// Send initial selection context
setTimeout(() => {
  const { context, width, height, svg } = getSelectionContext();
  penpot.ui.sendMessage({
    source: "penpot",
    type: "selection-context",
    context,
    width,
    height,
    svg,
  });
}, 100);

interface ImportSVGMessage {
  type: "import-svg" | "insert-svg";
  svg?: string;
  content?: string;
  offsetX?: number;
}

penpot.ui.onMessage<ImportSVGMessage>(async (message) => {
  if (message.type === "import-svg" || message.type === "insert-svg") {
    try {
      const svgContent = message.svg || message.content;
      if (!svgContent) {
        throw new Error("No SVG content provided");
      }

      // Create SVG shape in Penpot
      const svgShape = penpot.createShapeFromSvg(svgContent);

      if (svgShape) {
        // Position in viewport center with optional horizontal offset
        const offsetX = message.offsetX || 0;
        svgShape.x =
          penpot.viewport.center.x - (svgShape.width || 0) / 2 + offsetX;
        svgShape.y = penpot.viewport.center.y - (svgShape.height || 0) / 2;

        // Select the newly created shape
        penpot.selection = [svgShape];

        // Send success message back to UI
        penpot.ui.sendMessage({
          source: "penpot",
          type: "import-success",
        });
      } else {
        throw new Error("Failed to create SVG shape");
      }
    } catch (error) {
      console.error("SVG import error:", error);
      penpot.ui.sendMessage({
        source: "penpot",
        type: "import-error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Handle PDF page import
  if (message.type === "import-pdf-page") {
    try {
      const imageData = new Uint8Array(message.data);
      const imageName = `PDF Page ${message.pageNum}`;

      // Upload the image to Penpot
      const imageAsset = await penpot.uploadMediaData(
        imageName,
        imageData,
        "image/png",
      );

      if (imageAsset) {
        // Create a rectangle to hold the image
        const imageShape = penpot.createRectangle();

        if (imageShape) {
          // Set the image as a fill
          imageShape.fills = [
            {
              fillOpacity: 1,
              fillImage: imageAsset,
            },
          ];

          // Set dimensions based on the PDF page
          imageShape.resize(message.width, message.height);

          // Position the image
          // For multiple pages, offset them vertically to avoid overlap
          const verticalOffset = (message.pageNum - 1) * (message.height + 50);
          imageShape.x = penpot.viewport.center.x - message.width / 2;
          imageShape.y =
            penpot.viewport.center.y - message.height / 2 + verticalOffset;

          // Name the shape
          imageShape.name = imageName;

          // Select the newly created shape
          penpot.selection = [imageShape];
        }
      }
    } catch (error) {
      console.error("PDF import error:", error);
      penpot.ui.sendMessage({
        source: "penpot",
        type: "import-error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Handle get selected text request
  if (message.type === "get-selected-text") {
    const selection = penpot.selection;

    if (selection && selection.length > 0) {
      const firstShape = selection[0];

      // Check if it's a text shape
      if (firstShape.type === "text") {
        penpot.ui.sendMessage({
          source: "penpot",
          type: "selected-text",
          text: firstShape.characters || "",
          shapeId: firstShape.id,
        });
      } else {
        penpot.ui.sendMessage({
          source: "penpot",
          type: "selected-text",
          text: "",
          shapeId: "",
        });
      }
    } else {
      penpot.ui.sendMessage({
        source: "penpot",
        type: "selected-text",
        text: "",
        shapeId: "",
      });
    }
  }

  // Handle replace text request
  if (message.type === "replace-text") {
    const selection = penpot.selection;

    if (selection && selection.length > 0) {
      const shape = selection[0];

      if (shape.type === "text") {
        shape.characters = message.text;
      }
    }
  }
});

// Update the theme in the iframe
penpot.on("themechange", (theme) => {
  penpot.ui.sendMessage({
    source: "penpot",
    type: "themechange",
    theme,
  });
});
