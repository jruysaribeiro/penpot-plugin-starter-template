penpot.ui.open("Penpot AI Designer", `?theme=${penpot.theme}`, {
  width: 440,
  height: 600,
});

// Function to extract context from selected elements
function getSelectionContext(): string {
  const selection = penpot.selection;

  if (!selection || selection.length === 0) {
    return "";
  }

  const colors = new Set<string>();
  const shapes: string[] = [];
  let hasText = false;

  selection.forEach((shape) => {
    // Collect colors
    if (shape.fills && Array.isArray(shape.fills)) {
      shape.fills.forEach((fill: any) => {
        if (fill.fillColor) colors.add(fill.fillColor);
      });
    }
    if (shape.strokes && Array.isArray(shape.strokes)) {
      shape.strokes.forEach((stroke: any) => {
        if (stroke.strokeColor) colors.add(stroke.strokeColor);
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

  if (colors.size > 0) {
    context += `Use these colors: ${Array.from(colors).join(", ")}. `;
  }

  if (shapes.length > 0) {
    context += `Incorporate similar shapes like ${[...new Set(shapes)].join(", ")}. `;
  }

  if (hasText) {
    context += `Include text elements in the design. `;
  }

  return context;
}

// Send selection context when it changes
penpot.on("selectionchange", () => {
  const context = getSelectionContext();
  penpot.ui.sendMessage({
    source: "penpot",
    type: "selection-context",
    context,
  });
});

// Send initial selection context
setTimeout(() => {
  const context = getSelectionContext();
  penpot.ui.sendMessage({
    source: "penpot",
    type: "selection-context",
    context,
  });
}, 100);

interface ImportSVGMessage {
  type: "import-svg";
  svg: string;
  offsetX?: number;
}

penpot.ui.onMessage<ImportSVGMessage>((message) => {
  if (message.type === "import-svg") {
    try {
      // Create SVG shape in Penpot
      const svgShape = penpot.createShapeFromSvg(message.svg);

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
});

// Update the theme in the iframe
penpot.on("themechange", (theme) => {
  penpot.ui.sendMessage({
    source: "penpot",
    type: "themechange",
    theme,
  });
});
