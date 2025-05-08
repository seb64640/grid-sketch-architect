
import React, { useState, useEffect, useCallback } from "react";
import { Canvas } from "./Canvas";
import { ToolBar, Tool } from "./ToolBar";
import { toast } from "sonner";

export const GridSketch = () => {
  // Canvas dimensions
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>("select");
  
  // Grid settings
  const [gridVisible, setGridVisible] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [gridDensity, setGridDensity] = useState(20);
  
  // Style settings
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("rgba(200, 200, 255, 0.1)");
  
  // Print mode
  const [isPrintMode, setIsPrintMode] = useState(false);

  // History control
  const undoAction = useCallback(() => {
    // This will be overridden by the Canvas component
    toast("Annuler");
  }, []);

  const redoAction = useCallback(() => {
    // This will be overridden by the Canvas component
    toast("Rétablir");
  }, []);

  // Adjust canvas size based on window size
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = document.querySelector(".canvas-container-wrapper");
      if (container) {
        const rect = container.getBoundingClientRect();
        setCanvasWidth(rect.width - 20); // 20px for padding
        setCanvasHeight(Math.min(rect.height - 20, 600)); // Max height of 600px
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "v":
          setActiveTool("select");
          break;
        case "l":
          setActiveTool("line");
          break;
        case "c":
          setActiveTool("circle");
          break;
        case "r":
          setActiveTool("rectangle");
          break;
        case "t":
          setActiveTool("text");
          break;
        case "e":
          setActiveTool("erase");
          break;
        case "g":
          toggleGridVisibility();
          break;
        case "s":
          toggleSnapToGrid();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [gridVisible, snapToGrid]);

  const toggleGridVisibility = () => {
    setGridVisible(!gridVisible);
    toast(gridVisible ? "Grille masquée" : "Grille visible");
  };

  const toggleSnapToGrid = () => {
    setSnapToGrid(!snapToGrid);
    toast(snapToGrid ? "Alignement désactivé" : "Alignement activé");
  };

  const clearCanvas = () => {
    // Implementation will be through the Canvas component
    toast("Canevas effacé");
  };

  const togglePrintMode = () => {
    setIsPrintMode(!isPrintMode);
    toast(isPrintMode ? "Mode éditeur" : "Mode impression");
  };

  return (
    <div className="flex flex-col h-full">
      <ToolBar
        activeTool={activeTool}
        gridVisible={gridVisible}
        snapToGrid={snapToGrid}
        setActiveTool={setActiveTool}
        toggleGridVisibility={toggleGridVisibility}
        toggleSnapToGrid={toggleSnapToGrid}
        clearCanvas={clearCanvas}
        printMode={togglePrintMode}
        undoAction={undoAction}
        redoAction={redoAction}
        gridSize={gridSize}
        setGridSize={setGridSize}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
      />
      
      <div className="flex-1 p-4 overflow-auto bg-gray-100 canvas-container-wrapper">
        <Canvas
          width={canvasWidth}
          height={canvasHeight}
          gridSize={gridSize}
          gridDensity={gridDensity}
          gridVisible={gridVisible}
          snapToGrid={snapToGrid}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          fillColor={fillColor}
          activeTool={activeTool}
          isPrintMode={isPrintMode}
          onUndo={undoAction}
          onRedo={redoAction}
        />
      </div>
    </div>
  );
};
