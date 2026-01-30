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

  // Handle get selected image request
  if (message.type === "get-selected-image") {
    const selection = penpot.selection;
    console.log("Get selected image request, selection:", selection);

    if (selection && selection.length > 0) {
      const shape = selection[0];
      console.log("Shape type:", shape.type);
      console.log("Shape fills:", shape.fills);

      // Check if it's a rectangle with an image fill
      if (shape.type === "rectangle" && shape.fills && shape.fills.length > 0) {
        console.log("Checking fills for image...");
        const imageFill = shape.fills.find((fill: any) => fill.fillImage);
        console.log("Image fill found:", imageFill);

        if (imageFill && imageFill.fillImage) {
          console.log("fillImage object:", imageFill.fillImage);
          console.log("fillImage keys:", Object.keys(imageFill.fillImage));

          const imageInfo = {
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            imageName: imageFill.fillImage.name,
            imageAssetId: imageFill.fillImage.id,
          };

          // Export for preview at full quality without borders
          try {
            console.log("Exporting preview at 1.0 scale without borders...");

            // Temporarily remove strokes/borders before export
            const originalStrokes = shape.strokes;
            const originalBorderRadius = shape.borderRadius;
            shape.strokes = [];
            if (shape.borderRadius) {
              shape.borderRadius = 0;
            }

            const exportData = await shape.export({ type: "png", scale: 1.0 });

            // Restore original strokes/borders
            shape.strokes = originalStrokes;
            if (originalBorderRadius) {
              shape.borderRadius = originalBorderRadius;
            }

            console.log("Preview export successful, size:", exportData?.length);

            if (exportData && exportData.length > 0) {
              // Manual base64 encoding
              const bytes = new Uint8Array(exportData);
              const base64chars =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
              let base64 = "";

              for (let i = 0; i < bytes.length; i += 3) {
                const byte1 = bytes[i];
                const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
                const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

                const encoded1 = byte1 >> 2;
                const encoded2 = ((byte1 & 3) << 4) | (byte2 >> 4);
                const encoded3 = ((byte2 & 15) << 2) | (byte3 >> 6);
                const encoded4 = byte3 & 63;

                base64 += base64chars[encoded1];
                base64 += base64chars[encoded2];
                base64 += i + 1 < bytes.length ? base64chars[encoded3] : "=";
                base64 += i + 2 < bytes.length ? base64chars[encoded4] : "=";
              }

              imageInfo.dataUrl = `data:image/png;base64,${base64}`;
              imageInfo.previewScale = 1.0; // Tell UI this is 1.0 scale (full quality)
              console.log("Preview base64 conversion successful");
            }
          } catch (error) {
            console.error("Preview export failed:", error);
          }

          penpot.ui.sendMessage({
            source: "penpot",
            type: "selected-image",
            imageData: imageInfo,
            shapeId: shape.id,
          });
          return;
        }
      }
    }

    // No image found
    console.log("No image found in selection");
    penpot.ui.sendMessage({
      source: "penpot",
      type: "selected-image",
      imageData: null,
      shapeId: null,
    });
  }

  // Handle upload cropped image request
  if (message.type === "upload-cropped-image") {
    try {
      const selection = penpot.selection;

      if (selection && selection.length > 0) {
        const originalShape = selection[0];

        // Convert array back to Uint8Array - this is the actual cropped pixel data from canvas
        const imageData = new Uint8Array(message.imageData);

        console.log(
          "Uploading cropped image from canvas, size:",
          imageData.length,
        );

        // Upload the cropped image to Penpot
        const imageAsset = await penpot.uploadMediaData(
          "Cropped Image",
          imageData,
          "image/png",
        );

        if (imageAsset) {
          // Create a new rectangle for the cropped image
          const croppedShape = penpot.createRectangle();

          if (croppedShape) {
            // Set the cropped image as fill
            croppedShape.fills = [
              {
                fillOpacity: 1,
                fillImage: imageAsset,
              },
            ];

            // Set dimensions to match the cropped area
            croppedShape.resize(message.width, message.height);

            // Position at the same location as the crop was on the original
            croppedShape.x = originalShape.x + message.originalX;
            croppedShape.y = originalShape.y + message.originalY;

            // Name the shape
            croppedShape.name = "Cropped Image";

            // Remove strokes
            croppedShape.strokes = [];

            // Select the new shape
            penpot.selection = [croppedShape];

            console.log("Cropped image uploaded and placed successfully");

            penpot.ui.sendMessage({
              source: "penpot",
              type: "crop-success",
            });
          }
        }
      }
    } catch (error) {
      console.error("Upload cropped image error:", error);
      penpot.ui.sendMessage({
        source: "penpot",
        type: "crop-error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Handle get image for background removal request
  if (message.type === "get-image-for-bg-removal") {
    const selection = penpot.selection;

    if (selection && selection.length > 0) {
      const shape = selection[0];

      if (shape.type === "rectangle" && shape.fills && shape.fills.length > 0) {
        const imageFill = shape.fills.find((fill: any) => fill.fillImage);

        if (imageFill && imageFill.fillImage) {
          try {
            console.log("Exporting image for background removal...");

            // Temporarily remove strokes/borders before export
            const originalStrokes = shape.strokes;
            const originalBorderRadius = shape.borderRadius;
            shape.strokes = [];
            if (shape.borderRadius) {
              shape.borderRadius = 0;
            }

            const exportData = await shape.export({ type: "png", scale: 1.0 });

            // Restore original strokes/borders
            shape.strokes = originalStrokes;
            if (originalBorderRadius) {
              shape.borderRadius = originalBorderRadius;
            }

            if (exportData && exportData.length > 0) {
              // Manual base64 encoding
              const bytes = new Uint8Array(exportData);
              const base64chars =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
              let base64 = "";

              for (let i = 0; i < bytes.length; i += 3) {
                const byte1 = bytes[i];
                const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
                const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

                const encoded1 = byte1 >> 2;
                const encoded2 = ((byte1 & 3) << 4) | (byte2 >> 4);
                const encoded3 = ((byte2 & 15) << 2) | (byte3 >> 6);
                const encoded4 = byte3 & 63;

                base64 += base64chars[encoded1];
                base64 += base64chars[encoded2];
                base64 += i + 1 < bytes.length ? base64chars[encoded3] : "=";
                base64 += i + 2 < bytes.length ? base64chars[encoded4] : "=";
              }

              penpot.ui.sendMessage({
                source: "penpot",
                type: "image-for-bg-removal",
                imageData: `data:image/png;base64,${base64}`,
                shapeId: shape.id,
                width: shape.width,
                height: shape.height,
              });
              return;
            }
          } catch (error) {
            console.error("Export for bg removal failed:", error);
          }
        }
      }
    }

    // No valid image found
    penpot.ui.sendMessage({
      source: "penpot",
      type: "image-for-bg-removal",
      imageData: null,
      shapeId: null,
    });
  }

  // Handle upload background-removed image
  if (message.type === "upload-bg-removed-image") {
    try {
      const selection = penpot.selection;

      if (selection && selection.length > 0) {
        const originalShape = selection[0];

        // Convert array back to Uint8Array
        const imageData = new Uint8Array(message.imageData);

        console.log(
          "Uploading background-removed image, size:",
          imageData.length,
        );

        // Upload the image to Penpot
        const imageAsset = await penpot.uploadMediaData(
          "Background Removed",
          imageData,
          "image/png",
        );

        if (imageAsset) {
          // Create a new rectangle for the image
          const newShape = penpot.createRectangle();

          if (newShape) {
            // Set the image as fill
            newShape.fills = [
              {
                fillOpacity: 1,
                fillImage: imageAsset,
              },
            ];

            // Set dimensions to match original
            newShape.resize(message.width, message.height);

            // Position at the same location as original
            newShape.x = originalShape.x;
            newShape.y = originalShape.y;

            // Name the shape
            newShape.name = "Background Removed";

            // Remove strokes
            newShape.strokes = [];

            // Select the new shape
            penpot.selection = [newShape];

            console.log("Background-removed image uploaded successfully");

            penpot.ui.sendMessage({
              source: "penpot",
              type: "bg-removal-success",
            });
          }
        }
      }
    } catch (error) {
      console.error("Upload background-removed image error:", error);
      penpot.ui.sendMessage({
        source: "penpot",
        type: "bg-removal-error",
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
