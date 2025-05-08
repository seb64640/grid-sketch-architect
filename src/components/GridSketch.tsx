
import React, { useState, useEffect } from "react";
import { Canvas } from "./Canvas";
import { ToolBar, Tool } from "./ToolBar";
import { SidePanel } from "./SidePanel";
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
  const [gridDensity, setGridDensity] = useState(20); // On garde la variable mais on ne l'utilise plus dans l'interface
  
  // Style settings
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("rgba(200, 200, 255, 0.1)");
  
  // Print mode
  const [isPrintMode, setIsPrintMode] = useState(false);

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
    toast(gridVisible ? "Grid hidden" : "Grid visible");
  };

  const toggleSnapToGrid = () => {
    setSnapToGrid(!snapToGrid);
    toast(snapToGrid ? "Snap to grid disabled" : "Snap to grid enabled");
  };

  const clearCanvas = () => {
    // Implementation will be through the Canvas component
    toast("Canvas cleared");
  };

  const togglePrintMode = () => {
    setIsPrintMode(!isPrintMode);
    toast(isPrintMode ? "Editor mode" : "Print mode");
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
      />
      
      <div className="flex flex-1 overflow-hidden">
        <SidePanel
          gridSize={gridSize}
          setGridSize={setGridSize}
          gridDensity={gridDensity}
          setGridDensity={setGridDensity}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          strokeColor={strokeColor}
          setStrokeColor={setStrokeColor}
          fillColor={fillColor}
          setFillColor={setFillColor}
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
          />
        </div>
      </div>
    </div>
  );
};
