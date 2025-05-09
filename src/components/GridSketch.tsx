
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Canvas } from "./Canvas";
import { ToolBar, Tool } from "./ToolBar";
import { toast } from "sonner";
import { useLayerManager } from '../hooks/useLayerManager';
import { useGridSettings } from '../hooks/useGridSettings';
import { useDrawingStyles } from '../hooks/useDrawingStyles';
import { LayerManager } from './LayerManager';

export const GridSketch = () => {
  // Canvas dimensions et référence du conteneur
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>("select");
  
  // Grid settings
  const gridSettings = useGridSettings();
  
  // Style settings
  const drawingStyles = useDrawingStyles();
  
  // Print mode
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Layer management
  const layerManager = useLayerManager();

  // History control
  const undoAction = useCallback(() => {
    // This will be overridden by the Canvas component
    toast("Annuler");
  }, []);

  const redoAction = useCallback(() => {
    // This will be overridden by the Canvas component
    toast("Rétablir");
  }, []);

  // Adjust canvas size based on window size and handle resize events
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(rect.width - 20, 100); // Min width 100px, 20px padding
        const newHeight = Math.max(Math.min(rect.height - 20, 600), 100); // Min height 100px, max 600px
        
        setCanvasWidth(newWidth);
        setCanvasHeight(newHeight);
      }
    };

    // Initial size setting
    updateCanvasSize();
    
    // Add resize event listener with debounce
    let resizeTimer: number;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateCanvasSize, 100);
    };
    
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
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
          gridSettings.toggleGridVisibility();
          break;
        case "s":
          gridSettings.toggleSnapToGrid();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [gridSettings]);

  const clearCanvas = () => {
    // Implementation will be through the Canvas component
    toast("Canevas effacé");
  };

  const togglePrintMode = () => {
    setIsPrintMode(!isPrintMode);
    toast(isPrintMode ? "Mode éditeur" : "Mode impression");
  };

  // Log whenever layers change
  useEffect(() => {
    console.log("Layer update effect triggered. Active layer:", layerManager.activeLayerId);
    console.log("Layers state in GridSketch:", 
      layerManager.layers.map(l => ({
        id: l.id,
        name: l.name,
        objectCount: l.objects?.length || 0,
        visible: l.visible
      }))
    );
  }, [layerManager.layers, layerManager.activeLayerId]);

  return (
    <div className="flex flex-col h-full">
      <ToolBar
        activeTool={activeTool}
        gridVisible={gridSettings.gridVisible}
        snapToGrid={gridSettings.snapToGrid}
        setActiveTool={setActiveTool}
        toggleGridVisibility={gridSettings.toggleGridVisibility}
        toggleSnapToGrid={gridSettings.toggleSnapToGrid}
        clearCanvas={clearCanvas}
        printMode={togglePrintMode}
        undoAction={undoAction}
        redoAction={redoAction}
        gridSize={gridSettings.gridSize}
        setGridSize={gridSettings.setGridSize}
        strokeColor={drawingStyles.strokeColor}
        setStrokeColor={drawingStyles.setStrokeColor}
      />
      
      <div 
        className="flex-1 p-4 overflow-auto bg-gray-100 canvas-container-wrapper" 
        ref={containerRef}
      >
        {/* Layer controls */}
        <LayerManager
          layers={layerManager.layers}
          activeLayerId={layerManager.activeLayerId}
          editingLayerId={layerManager.editingLayerId}
          editLayerName={layerManager.editLayerName}
          setActiveLayerId={layerManager.setActiveLayerId}
          addLayer={layerManager.addLayer}
          removeLayer={layerManager.removeLayer}
          toggleLayerVisibility={layerManager.toggleLayerVisibility}
          toggleLayerLock={layerManager.toggleLayerLock}
          startEditLayerName={layerManager.startEditLayerName}
          saveLayerName={layerManager.saveLayerName}
          setEditLayerName={layerManager.setEditLayerName}
        />

        <Canvas
          width={canvasWidth}
          height={canvasHeight}
          gridSize={gridSettings.gridSize}
          gridDensity={gridSettings.gridDensity}
          gridVisible={gridSettings.gridVisible}
          snapToGrid={gridSettings.snapToGrid}
          strokeWidth={drawingStyles.strokeWidth}
          strokeColor={drawingStyles.strokeColor}
          fillColor={drawingStyles.fillColor}
          activeTool={activeTool}
          isPrintMode={isPrintMode}
          onUndo={undoAction}
          onRedo={redoAction}
          layers={layerManager.layers}
          activeLayerId={layerManager.activeLayerId}
          setLayers={layerManager.setLayers}
          updateLayerObjects={layerManager.updateLayerObjects} 
        />
      </div>
    </div>
  );
};
