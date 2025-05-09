
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Canvas } from "./Canvas";
import { ToolBar, Tool } from "./ToolBar";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Layers, Eye, EyeOff, Lock, Unlock, Edit, Check, Trash } from "lucide-react";
import { Input } from "./ui/input";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: any[]; // Fabric.js objects
}

export const GridSketch = () => {
  // Canvas dimensions et référence du conteneur
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Layer being edited state
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editLayerName, setEditLayerName] = useState("");

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
    const newLayerId = `layer-${Date.now()}`; // Using timestamp to ensure unique IDs
    const newLayer: Layer = {
      id: newLayerId,
      name: `Calque ${layers.length + 1}`,
      visible: true,
      locked: false,
      objects: [] // Initialize with empty objects array
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

  // Start editing a layer name
  const startEditLayerName = (layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditLayerName(currentName);
  };

  // Save edited layer name
  const saveLayerName = () => {
    if (!editingLayerId || editLayerName.trim() === "") {
      setEditingLayerId(null);
      return;
    }

    renameLayer(editingLayerId, editLayerName.trim());
    setEditingLayerId(null);
    setEditLayerName("");
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
      
      <div 
        className="flex-1 p-4 overflow-auto bg-gray-100 canvas-container-wrapper" 
        ref={containerRef}
      >
        {/* Layer controls */}
        <div className="mb-2 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                <Layers className="mr-2 h-4 w-4" />
                <span>{layers.find(layer => layer.id === activeLayerId)?.name || "Calque"}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[280px] bg-white">
                {layers.map((layer) => (
                  <DropdownMenuItem
                    key={layer.id}
                    className={`flex items-center justify-between p-2 ${layer.id === activeLayerId ? 'bg-accent' : ''}`}
                    onClick={() => layer.id !== editingLayerId && setActiveLayerId(layer.id)}
                  >
                    {editingLayerId === layer.id ? (
                      <div className="flex items-center space-x-2 w-full">
                        <Input 
                          value={editLayerName} 
                          onChange={(e) => setEditLayerName(e.target.value)}
                          className="h-8 w-full"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveLayerName();
                            } else if (e.key === 'Escape') {
                              setEditingLayerId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            saveLayerName();
                          }}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center">
                          {layer.visible ? 
                            <Eye className="h-4 w-4 mr-2" /> : 
                            <EyeOff className="h-4 w-4 mr-2 text-gray-400" />
                          }
                          {layer.locked ? 
                            <Lock className="h-4 w-4 mr-2" /> : 
                            <Unlock className="h-4 w-4 mr-2 text-gray-400" />
                          }
                          <span>{layer.name}</span>
                        </div>
                        <div className="ml-2 space-x-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditLayerName(layer.id, layer.name);
                            }}
                            className="text-xs px-1 py-0.5 hover:bg-gray-100 rounded"
                            title="Renommer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerVisibility(layer.id);
                            }}
                            className="text-xs px-1 py-0.5 hover:bg-gray-100 rounded"
                            title={layer.visible ? 'Masquer' : 'Afficher'}
                          >
                            {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerLock(layer.id);
                            }}
                            className="text-xs px-1 py-0.5 hover:bg-gray-100 rounded"
                            title={layer.locked ? 'Déverrouiller' : 'Verrouiller'}
                          >
                            {layer.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLayer(layer.id);
                            }}
                            className="text-xs text-red-500 px-1 py-0.5 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={addLayer} className="text-green-600 p-2">
                  + Nouveau calque
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
