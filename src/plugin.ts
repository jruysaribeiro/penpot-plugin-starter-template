penpot.ui.open("Penpot AI Designer", `?theme=${penpot.theme}`, {
  width: 440,
  height: 600,
});

interface ImportSVGMessage {
  type: "import-svg";
  svg: string;
}

penpot.ui.onMessage<ImportSVGMessage>((message) => {
  if (message.type === "import-svg") {
    try {
      // Create SVG shape in Penpot
      const svgShape = penpot.createShapeFromSvg(message.svg);

      if (svgShape) {
        // Position in viewport center
        svgShape.x = penpot.viewport.center.x - (svgShape.width || 0) / 2;
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
