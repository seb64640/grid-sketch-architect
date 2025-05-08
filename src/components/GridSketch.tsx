
import React, { useState, useEffect, useCallback } from "react";
import { Canvas } from "./Canvas";
import { ToolBar, Tool } from "./ToolBar";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Layers } from "lucide-react";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: any[]; // Fabric.js objects
}

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

  // Layers management - Initialize with a default layer
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: "layer-1",
      name: "Calque 1",
      visible: true,
      locked: false,
      objects: []
    }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>("layer-1");

  // History control
  const undoAction = useCallback(() => {
    // This will be overridden by the Canvas component
    toast("Annuler");
  }, []);

  const redoAction = useCallback(() => {
    // This will be overridden by the Canvas component
    toast("Rétablir");
  }, []);

  // Layer management functions
  const addLayer = () => {
    const newLayerId = `layer-${layers.length + 1}`;
    const newLayer: Layer = {
      id: newLayerId,
      name: `Calque ${layers.length + 1}`,
      visible: true,
      locked: false,
      objects: []
    };
    
    setLayers([...layers, newLayer]);
    setActiveLayerId(newLayerId);
    toast(`Nouveau calque: ${newLayer.name}`);
  };

  const removeLayer = (layerId: string) => {
    // Don't allow removing the last layer
    if (layers.length <= 1) {
      toast.error("Impossible de supprimer le dernier calque");
      return;
    }
    
    const updatedLayers = layers.filter(layer => layer.id !== layerId);
    setLayers(updatedLayers);
    
    // If active layer was removed, select another one
    if (activeLayerId === layerId) {
      setActiveLayerId(updatedLayers[0].id);
    }
    
    toast("Calque supprimé");
  };

  const toggleLayerVisibility = (layerId: string) => {
    const updatedLayers = layers.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          visible: !layer.visible
        };
      }
      return layer;
    });
    
    setLayers(updatedLayers);
    const targetLayer = layers.find(layer => layer.id === layerId);
    toast(`Calque ${targetLayer?.name} ${targetLayer?.visible ? "masqué" : "visible"}`);
  };

  const toggleLayerLock = (layerId: string) => {
    const updatedLayers = layers.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          locked: !layer.locked
        };
      }
      return layer;
    });
    
    setLayers(updatedLayers);
    const targetLayer = layers.find(layer => layer.id === layerId);
    toast(`Calque ${targetLayer?.name} ${targetLayer?.locked ? "déverrouillé" : "verrouillé"}`);
  };

  const renameLayer = (layerId: string, newName: string) => {
    const updatedLayers = layers.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          name: newName
        };
      }
      return layer;
    });
    
    setLayers(updatedLayers);
    toast(`Calque renommé en: ${newName}`);
  };

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
        {/* Layer controls */}
        <div className="mb-2 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {/* Ensure we're using a function component for DropdownMenu */}
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                  <Layers className="mr-2 h-4 w-4" />
                  <span>{layers.find(layer => layer.id === activeLayerId)?.name || "Calque"}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {layers.map((layer) => (
                    <DropdownMenuItem
                      key={layer.id}
                      className={`flex items-center justify-between ${layer.id === activeLayerId ? 'bg-accent' : ''}`}
                      onClick={() => setActiveLayerId(layer.id)}
                    >
                      <span>{layer.visible ? '👁️ ' : '🔒 '}{layer.name}</span>
                      <div className="ml-2 space-x-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(layer.id);
                          }}
                          className="text-xs px-1 py-0.5"
                        >
                          {layer.visible ? 'Masquer' : 'Afficher'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerLock(layer.id);
                          }}
                          className="text-xs px-1 py-0.5"
                        >
                          {layer.locked ? 'Déverrouiller' : 'Verrouiller'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLayer(layer.id);
                          }}
                          className="text-xs text-red-500 px-1 py-0.5"
                        >
                          Supprimer
                        </button>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={addLayer} className="text-green-600">
                    + Nouveau calque
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

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
          layers={layers}
          activeLayerId={activeLayerId}
          setLayers={setLayers}
        />
      </div>
    </div>
  );
};
