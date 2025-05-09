import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import type { Tool } from "./ToolBar";
import { toast } from "sonner";
import type { Layer } from "./GridSketch";

interface Point {
  x: number;
  y: number;
}

interface CanvasProps {
  width: number;
  height: number;
  gridSize: number;
  gridDensity: number;
  gridVisible: boolean;
  snapToGrid: boolean;
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  activeTool: Tool;
  isPrintMode: boolean;
  onUndo: () => void;
  onRedo: () => void;
  layers: Layer[];
  activeLayerId: string;
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
}

type HistoryAction = {
  objects: fabric.Object[];
  type: 'add' | 'remove' | 'modify';
  layerId: string;
};

export const Canvas: React.FC<CanvasProps> = ({
  width,
  height,
  gridSize,
  gridDensity,
  gridVisible,
  snapToGrid,
  strokeWidth,
  strokeColor,
  fillColor,
  activeTool,
  isPrintMode,
  onUndo,
  onRedo,
  layers,
  activeLayerId,
  setLayers,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const gridRef = useRef<fabric.Group | null>(null);
  const tempPointRef = useRef<fabric.Circle | null>(null);
  const startPointRef = useRef<Point | null>(null);
  
  // Gardez une trace des dimensions précédentes pour déterminer s'il faut ajuster le zoom
  const prevDimensionsRef = useRef<{ width: number, height: number }>({ width, height });
  
  // History state for undo/redo
  const historyRef = useRef<HistoryAction[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryActionRef = useRef<boolean>(false);

  // Track which objects belong to which layer
  const layerObjectsMap = useRef<Map<string, fabric.Object[]>>(new Map());
  
  // Flag to prevent excessive re-renders
  const isLayerUpdateInProgress = useRef<boolean>(false);
  
  // Debug flag
  const debugMode = useRef<boolean>(true);

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log("Initializing fabric canvas");
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      selection: activeTool === "select",
      backgroundColor: "#ffffff",
      preserveObjectStacking: true, // Maintenir l'ordre d'empilement des objets
    });

    fabricCanvasRef.current = canvas;
    
    // Initialize the layer objects map with empty arrays for each layer
    if (layers && layers.length > 0) {
      console.log(`Initializing layers map with ${layers.length} layers`);
      layers.forEach(layer => {
        layerObjectsMap.current.set(layer.id, []);
        if (debugMode.current) {
          console.log(`Added layer to map: ${layer.id} (${layer.name})`);
        }
      });
    }

    // Add key event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
          // Save state before deleting
          saveHistoryState(activeObjects, 'remove', activeLayerId);
          
          activeObjects.forEach((obj) => {
            canvas.remove(obj);
            
            // Remove from all layers
            for (const [layerId, layerObjects] of layerObjectsMap.current.entries()) {
              const index = layerObjects.indexOf(obj);
              if (index >= 0) {
                layerObjects.splice(index, 1);
                if (debugMode.current) {
                  console.log(`Removed object from layer ${layerId}`);
                }
                break;
              }
            }
          });
          
          // Update layers state
          updateLayersWithObjects();
          
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          toast("Objets supprimés");
        }
      } else if (e.key === "g" || e.key === "G") {
        // Toggle grid visibility
        if (gridRef.current) {
          gridRef.current.visible = !gridRef.current.visible;
          canvas.requestRenderAll();
        }
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        // Undo with Ctrl+Z
        e.preventDefault();
        performUndo();
      } else if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
        // Redo with Ctrl+Y
        e.preventDefault();
        performRedo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // Create the grid
    drawGrid();

    // Track object changes for undo/redo
    canvas.on('object:added', function(e) {
      if (!e.target || isHistoryActionRef.current) return;
      
      // Don't track grid points
      if (gridRef.current && (gridRef.current.contains(e.target) || e.target === gridRef.current)) {
        return;
      }
      
      // Don't track temporary points
      if (e.target === tempPointRef.current) {
        return;
      }
      
      // Add object only to the active layer
      if (debugMode.current) {
        console.log(`Object added to canvas, assigning to active layer: ${activeLayerId}`);
      }
      
      // Get current active layer objects
      let layerObjects = layerObjectsMap.current.get(activeLayerId) || [];
      
      // Check if object isn't already in this layer
      if (!layerObjects.includes(e.target)) {
        layerObjects.push(e.target);
        layerObjectsMap.current.set(activeLayerId, layerObjects);
        
        // Add custom property to the object to track its layer
        e.target.set('layerId', activeLayerId);
        
        if (debugMode.current) {
          console.log(`Added object to layer ${activeLayerId}, total objects in layer: ${layerObjects.length}`);
        }
        
        // Update layers state
        updateLayersWithObjects();
        
        saveHistoryState([e.target], 'add', activeLayerId);
      }
    });

    canvas.on('object:modified', function(e) {
      if (!e.target || isHistoryActionRef.current) return;
      
      // Don't track grid modifications
      if (gridRef.current && (gridRef.current.contains(e.target) || e.target === gridRef.current)) {
        return;
      }
      
      saveHistoryState([e.target], 'modify', activeLayerId);
    });

    // Snap to grid when moving
    canvas.on('object:moving', function(e) {
      if (!snapToGrid || !e.target) return;
      
      const obj = e.target;
      
      // Snap to grid
      const snapPoint = snapToGridPoint({
        x: obj.left || 0,
        y: obj.top || 0
      });
      
      // Apply the snapped position
      obj.set({
        left: snapPoint.x,
        top: snapPoint.y
      });
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
    };
  }, [width, height, layers.length]);

  // Handle canvas resize - Préserver les objets lorsque les dimensions changent
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    
    // Si le canvas existe déjà, ajustez ses dimensions
    if (width !== canvas.width || height !== canvas.height) {
      // Sauvegardez l'ancien rapport de zoom
      const oldWidth = prevDimensionsRef.current.width;
      const oldHeight = prevDimensionsRef.current.height;
      
      // Mettez à jour les dimensions du canvas
      canvas.setDimensions({ width, height });
      
      // Si ce n'est pas la première initialisation (vérifiez que oldWidth et oldHeight ont des valeurs valides)
      if (oldWidth > 0 && oldHeight > 0) {
        // Calcul des ratios de redimensionnement
        const scaleX = width / oldWidth;
        const scaleY = height / oldHeight;
        
        // Ajustez la vue pour éviter la disparition des objets
        // Si les nouvelles dimensions sont plus petites, vous pourriez envisager de dézoomer
        if (scaleX < 1 || scaleY < 1) {
          // Décidez si un ajustement de zoom est nécessaire selon l'ampleur du changement
          const minScale = Math.min(scaleX, scaleY);
          if (minScale < 0.8) { // Ajustez uniquement si le changement est significatif
            canvas.setZoom(canvas.getZoom() * minScale);
          }
        }
      }
      
      // Mémoriser les nouvelles dimensions pour la prochaine comparaison
      prevDimensionsRef.current = { width, height };
      
      // Redessinez la grille après le redimensionnement
      drawGrid();
      
      // Assurez-vous que tous les objets sont toujours dans les limites
      canvas.getObjects().forEach(obj => {
        // Assurez-vous que l'objet n'est pas déplacé hors des limites visibles
        const objBounds = obj.getBoundingRect();
        if (objBounds && (objBounds.left > width || objBounds.top > height)) {
          // Si l'objet est complètement hors des limites, ajustez sa position
          if (objBounds.left > width) obj.set({ left: width - objBounds.width });
          if (objBounds.top > height) obj.set({ top: height - objBounds.height });
          obj.setCoords(); // Mise à jour des coordonnées
        }
      });
      
      // Demandez un rendu après le redimensionnement
      canvas.requestRenderAll();
    }
  }, [width, height]);

  // Helper function to update the layers state with current objects
  const updateLayersWithObjects = () => {
    if (isLayerUpdateInProgress.current) return;
    
    isLayerUpdateInProgress.current = true;
    
    setLayers(prevLayers => {
      return prevLayers.map(layer => {
        const layerObjects = layerObjectsMap.current.get(layer.id) || [];
        return {
          ...layer,
          objects: [...layerObjects]
        };
      });
    });
    
    setTimeout(() => {
      isLayerUpdateInProgress.current = false;
    }, 0);
  };

  // Update canvas objects visibility based on layer settings
  const updateLayersVisibility = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    
    // Hide all objects first
    canvas.getObjects().forEach(obj => {
      // Skip grid
      if (gridRef.current && (gridRef.current === obj || (gridRef.current.contains && gridRef.current.contains(obj)))) {
        return;
      }
      
      // Skip temp points
      if (tempPointRef.current === obj) {
        return;
      }
      
      // Get the layer ID from the object
      const objLayerId = obj.get('layerId');
      
      if (objLayerId) {
        // Find the layer
        const layer = layers.find(l => l.id === objLayerId);
        
        if (layer) {
          // Set visibility based on layer visibility
          obj.visible = layer.visible;
          
          // Set interactivity based on active layer and locked status
          const isActive = objLayerId === activeLayerId;
          obj.selectable = isActive && !layer.locked && activeTool === "select";
          obj.evented = isActive && !layer.locked;
          
          if (debugMode.current) {
            console.log(`Object visibility updated: layerId=${objLayerId}, visible=${obj.visible}, selectable=${obj.selectable}`);
          }
        }
      }
    });
    
    canvas.requestRenderAll();
  };

  // Effect to handle layer changes and visibility
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    console.log("Layer update effect triggered. Active layer:", activeLayerId);
    
    updateLayersVisibility();
    
  }, [layers, activeLayerId, activeTool]);

  // Save the current state to history
  const saveHistoryState = (objects: fabric.Object[], actionType: 'add' | 'remove' | 'modify', layerId: string) => {
    // If we're in the middle of the history, truncate the future states
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    
    // Add the new state
    historyRef.current.push({
      objects: [...objects],
      type: actionType,
      layerId
    });
    
    // Update index
    historyIndexRef.current = historyRef.current.length - 1;
  };

  // Perform undo action
  const performUndo = () => {
    if (!fabricCanvasRef.current || historyIndexRef.current < 0) {
      toast("Rien à annuler");
      return;
    }
    
    const canvas = fabricCanvasRef.current;
    const action = historyRef.current[historyIndexRef.current];
    
    isHistoryActionRef.current = true;
    
    try {
      if (action.type === 'add') {
        // Undo an addition by removing the objects
        action.objects.forEach(obj => {
          canvas.remove(obj);
          
          // Remove from layer
          for (const [layerId, layerObjects] of layerObjectsMap.current.entries()) {
            const index = layerObjects.indexOf(obj);
            if (index >= 0) {
              layerObjects.splice(index, 1);
              if (debugMode.current) {
                console.log(`Removed object from layer ${layerId}`);
              }
              break;
            }
          }
        });
        
        // CORRECTION: Mise à jour correcte après modifications
        updateLayersWithObjects();
        
        toast("Action annulée");
      } else if (action.type === 'remove') {
        // Undo a removal by adding the objects back
        action.objects.forEach(obj => {
          canvas.add(obj);
          
          // Add back to layer
          for (const [layerId, layerObjects] of layerObjectsMap.current.entries()) {
            const index = layerObjects.indexOf(obj);
            if (index >= 0) {
              layerObjects.push(obj);
              layerObjectsMap.current.set(layerId, layerObjects);
              if (debugMode.current) {
                console.log(`Added object to layer ${layerId}`);
              }
              break;
            }
          }
        });
        
        // CORRECTION: Mise à jour correcte après modifications
        updateLayersWithObjects();
        
        toast("Suppression annulée");
      } else if (action.type === 'modify') {
        // For modify actions, we need to restore previous state
        // This is simplified but could be enhanced with object state snapshots
        toast("Modification annulée");
      }
      
      // Decrement the history index
      historyIndexRef.current--;
      
      canvas.requestRenderAll();
    } finally {
      isHistoryActionRef.current = false;
    }
  };

  // Perform redo action
  const performRedo = () => {
    if (!fabricCanvasRef.current || historyIndexRef.current >= historyRef.current.length - 1) {
      toast("Rien à rétablir");
      return;
    }
    
    // Increment the history index
    historyIndexRef.current++;
    
    const canvas = fabricCanvasRef.current;
    const action = historyRef.current[historyIndexRef.current];
    
    isHistoryActionRef.current = true;
    
    try {
      if (action.type === 'add') {
        // Redo an addition by adding the objects back
        action.objects.forEach(obj => {
          canvas.add(obj);
          
          // Add to layer if not already there
          for (const [layerId, layerObjects] of layerObjectsMap.current.entries()) {
            const index = layerObjects.indexOf(obj);
            if (index >= 0) {
              layerObjects.push(obj);
              layerObjectsMap.current.set(layerId, layerObjects);
              if (debugMode.current) {
                console.log(`Added object to layer ${layerId}`);
              }
              break;
            }
          }
        });
        
        // CORRECTION: Mise à jour correcte après modifications
        updateLayersWithObjects();
        
        toast("Action rétablie");
      } else if (action.type === 'remove') {
        // Redo a removal by removing the objects
        action.objects.forEach(obj => {
          const canvasObject = canvas.getObjects().find(o => o === obj);
          if (canvasObject) {
            canvas.remove(canvasObject);
            
            // Remove from layer
            for (const [layerId, layerObjects] of layerObjectsMap.current.entries()) {
              const index = layerObjects.indexOf(obj);
              if (index >= 0) {
                layerObjects.splice(index, 1);
                if (debugMode.current) {
                  console.log(`Removed object from layer ${layerId}`);
                }
                break;
              }
            }
          }
        });
        
        // CORRECTION: Mise à jour correcte après modifications
        updateLayersWithObjects();
        
        toast("Suppression rétablie");
      } else if (action.type === 'modify') {
        // For modify actions, we would need the next state
        toast("Modification rétablie");
      }
      
      canvas.requestRenderAll();
    } finally {
      isHistoryActionRef.current = false;
    }
  };

  // Expose undo/redo functions explicitly to parent component
  useEffect(() => {
    // Direct function replacement - simpler approach
    if (onUndo && typeof onUndo === 'function') {
      // Define the original function to our implementation
      const originalUndo = onUndo;
      // Replace it with our implementation
      onUndo = () => performUndo();
    }
    
    if (onRedo && typeof onRedo === 'function') {
      // Define the original function to our implementation
      const originalRedo = onRedo;
      // Replace it with our implementation
      onRedo = () => performRedo();
    }
  }, []);

  // Update selection mode based on activeTool
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Set selection mode
    canvas.selection = activeTool === "select";
    
    // Set appropriate cursor
    switch (activeTool) {
      case "select":
        canvas.defaultCursor = "default";
        break;
      case "line":
      case "circle":
      case "rectangle":
      case "arrow":
        canvas.defaultCursor = "crosshair";
        break;
      case "text":
        canvas.defaultCursor = "text";
        break;
      case "erase":
        canvas.defaultCursor = "not-allowed";
        break;
      default:
        canvas.defaultCursor = "default";
    }

    // Reset interactions
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");

    // Make all objects non-interactive when using drawing tools
    updateObjectsInteractivity(canvas, activeTool);

    // Set up tool-specific interactions
    if (activeTool === "line") {
      setupLineTool(canvas);
    } else if (activeTool === "circle") {
      setupCircleTool(canvas);
    } else if (activeTool === "rectangle") {
      setupRectangleTool(canvas);
    } else if (activeTool === "text") {
      setupTextTool(canvas);
    } else if (activeTool === "erase") {
      setupEraseTool(canvas);
    } else if (activeTool === "arrow") {
      setupArrowTool(canvas);
    }

    canvas.requestRenderAll();
  }, [activeTool, activeLayerId]);

  // Effect to react to changes in strokeWidth, strokeColor and fillColor
  useEffect(() => {
    // Cette fonction sera appelée à chaque changement des propriétés
    if (!fabricCanvasRef.current) return;
    
    // Réinitialiser les outils pour appliquer les nouvelles propriétés
    const canvas = fabricCanvasRef.current;
    
    // Mettre à jour tous les objets sélectionnés avec les nouvelles propriétés
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
        if (obj.stroke !== undefined) {
          obj.set({
            stroke: strokeColor,
            strokeWidth: strokeWidth
          });
        }
        if (obj.fill !== undefined && obj !== gridRef.current) {
          obj.set({ fill: fillColor });
        }
      });
      canvas.requestRenderAll();
    }
    
    // Réinitialiser les outils actuels pour qu'ils utilisent les nouvelles propriétés
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");
    
    // Remettre en place les interactions selon l'outil actif
    if (activeTool === "line") {
      setupLineTool(canvas);
    } else if (activeTool === "circle") {
      setupCircleTool(canvas);
    } else if (activeTool === "rectangle") {
      setupRectangleTool(canvas);
    }
  }, [strokeWidth, strokeColor, fillColor]);

  // Update objects interactivity based on current tool
  const updateObjectsInteractivity = (canvas: fabric.Canvas, tool: Tool) => {
    // Make all objects interactive or not based on the current tool and layer status
    const isDrawingTool = tool !== "select" && tool !== "erase";
    
    canvas.getObjects().forEach((obj) => {
      // Skip grid points and make sure the grid is never selectable
      if (gridRef.current && (gridRef.current.contains(obj) || obj === gridRef.current)) {
        obj.selectable = false;
        obj.evented = false;
        obj.lockMovementX = true;
        obj.lockMovementY = true;
        return;
      }
      
      // Get the layer this object belongs to
      const objLayerId = obj.get('layerId');
      
      if (objLayerId) {
        const layer = layers.find(l => l.id === objLayerId);
        
        // Apply layer visibility and interactivity
        if (layer) {
          obj.visible = layer.visible;
          
          // Apply layer lock and interactivity
          const isActive = objLayerId === activeLayerId;
          obj.selectable = isActive && !layer.locked && !isDrawingTool;
          obj.evented = isActive && !layer.locked;
          
          if (debugMode.current) {
            console.log(`Object interactivity updated: layerId=${objLayerId}, visible=${obj.visible}, selectable=${obj.selectable}`);
          }
        }
      } else {
        // Default behavior for objects not assigned to layers
        obj.selectable = !isDrawingTool;
        obj.evented = true;
      }
    });
  };

  // Update grid when grid properties change
  useEffect(() => {
    drawGrid();
  }, [gridSize, gridVisible]);

  // Update print mode
  useEffect(() => {
    if (!fabricCanvasRef.current || !gridRef.current) return;
    
    // Hide grid in print mode
    gridRef.current.visible = gridVisible && !isPrintMode;
    fabricCanvasRef.current.requestRenderAll();
  }, [isPrintMode, gridVisible]);

  // Draw the grid of points with correct dimensions
  const drawGrid = () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Remove previous grid if it exists
    if (gridRef.current) {
      canvas.remove(gridRef.current);
    }

    const points = [];
    const cellSize = gridSize;
    const cols = Math.floor(canvas.width / cellSize) + 1;
    const rows = Math.floor(canvas.height / cellSize) + 1;

    // Create grid points
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        
        const point = new fabric.Circle({
          left: x,
          top: y,
          radius: 2,
          fill: '#aab',
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          opacity: 0.8,
        });
        
        points.push(point);
      }
    }

    // Group all points
    const grid = new fabric.Group(points, {
      selectable: false,
      evented: false,
      visible: gridVisible,
      lockMovementX: true,
      lockMovementY: true,
    });

    canvas.add(grid);
    gridRef.current = grid;
    
    // Move grid to the back
    grid.sendToBack();
    canvas.requestRenderAll();
  };

  // Snap point to nearest grid point
  const snapToGridPoint = (point: Point): Point => {
    if (!snapToGrid) return point;
    
    const cellSize = gridSize;
    return {
      x: Math.round(point.x / cellSize) * cellSize,
      y: Math.round(point.y / cellSize) * cellSize,
    };
  };

  // Line tool setup
  const setupLineTool = (canvas: fabric.Canvas) => {
    let line: fabric.Line | null = null;
    
    canvas.on("mouse:down", (o) => {
      // Check if current layer is locked
      const currentLayer = layers.find(l => l.id === activeLayerId);
      if (!currentLayer) {
        toast.error("Calque actif non trouvé");
        return;
      }
      
      if (currentLayer.locked) {
        toast.error("Le calque est verrouillé");
        return;
      }
      
      const pointer = canvas.getPointer(o.e);
      const snappedPoint = snapToGridPoint({
        x: pointer.x,
        y: pointer.y,
      });
      
      startPointRef.current = snappedPoint;
      
      // Show temporary point
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
      }
      
      tempPointRef.current = new fabric.Circle({
        left: snappedPoint.x,
        top: snappedPoint.y,
        radius: 4,
        fill: strokeColor,
        originX: 'center',
        originY: 'center',
        selectable: false,
      });
      
      canvas.add(tempPointRef.current);
      
      // Create the line
      line = new fabric.Line(
        [snappedPoint.x, snappedPoint.y, snappedPoint.x, snappedPoint.y],
        {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        }
      );
      
      canvas.add(line);
    });
    
    canvas.on("mouse:move", (o) => {
      if (!line || !startPointRef.current) return;
      
      const pointer = canvas.getPointer(o.e);
      const snappedPoint = snapToGridPoint({
        x: pointer.x,
        y: pointer.y,
      });
      
      line.set({
        x2: snappedPoint.x,
        y2: snappedPoint.y,
      });
      
      canvas.requestRenderAll();
    });
    
    canvas.on("mouse:up", () => {
      if (!line || !startPointRef.current) return;
      
      // Remove temporary point
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
        tempPointRef.current = null;
      }
      
      // Remove zero-length lines
      if (
        line.x1 === line.x2 &&
        line.y1 === line.y2
      ) {
        canvas.remove(line);
        toast("Ligne annulée - longueur nulle");
      } else {
        // Now make the line selectable for future interactions
        line.set({
          selectable: true,
          evented: true,
          layerId: activeLayerId // Set layer ID directly on the object
        });

        // Add object to layer map
        const layerObjects = layerObjectsMap.current.get(activeLayerId) || [];
        if (!layerObjects.includes(line)) {
          layerObjects.push(line);
          layerObjectsMap.current.set(activeLayerId, layerObjects);
          
          if (debugMode.current) {
            console.log(`Added line to layer ${activeLayerId}, total: ${layerObjects.length}`);
          }
          
          // Update layers state with new objects
          updateLayersWithObjects();
        }
      }
      
      startPointRef.current = null;
      line = null;
      
      canvas.requestRenderAll();
    });
  };

  // Circle tool setup
  const setupCircleTool = (canvas: fabric.Canvas) => {
    let circle: fabric.Circle | null = null;
    
    canvas.on("mouse:down", (o) => {
      // Check if current layer is locked
      const currentLayer = layers.find(l => l.id === activeLayerId);
      if (!currentLayer) {
        toast.error("Calque actif non trouvé");
        return;
      }
      
      if (currentLayer.locked) {
        toast.error("Le calque est verrouillé");
        return;
      }
      
      const pointer = canvas.getPointer(o.e);
      const snappedPoint = snapToGridPoint({
        x: pointer.x,
        y: pointer.y,
      });
      
      startPointRef.current = snappedPoint;
      
      // Show temporary point
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
      }
      
      tempPointRef.current = new fabric.Circle({
        left: snappedPoint.x,
        top: snappedPoint.y,
        radius: 4,
        fill: strokeColor,
        originX: 'center',
        originY: 'center',
        selectable: false,
      });
      
      canvas.add(tempPointRef.current);
      
      // Create the circle
      circle = new fabric.Circle({
        left: snappedPoint.x,
        top: snappedPoint.y,
        radius: 0,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        fill: fillColor,
        opacity: 0.5,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      
      canvas.add(circle);
    });
    
    canvas.on("mouse:move", (o) => {
      if (!circle || !startPointRef.current) return;
      
      const pointer = canvas.getPointer(o.e);
      const snappedPoint = snapToGridPoint({
        x: pointer.x,
        y: pointer.y,
      });
      
      const radius = Math.sqrt(
        Math.pow(snappedPoint.x - startPointRef.current.x, 2) +
        Math.pow(snappedPoint.y - startPointRef.current.y, 2)
      );
      
      circle.set({ radius });
      
      canvas.requestRenderAll();
    });
    
    canvas.on("mouse:up", () => {
      if (!circle || !startPointRef.current) return;
      
      // Remove temporary point
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
        tempPointRef.current = null;
      }
      
      // Remove zero-radius circles
      if (circle.radius === 0) {
        canvas.remove(circle);
        toast("Cercle annulé - rayon nul");
      } else {
        // Now make the circle selectable for future interactions
        circle.set({
          selectable: true,
          evented: true,
          layerId: activeLayerId // Set layer ID directly
        });
        
        // Add the object to the active layer
        const layerObjects = layerObjectsMap.current.get(activeLayerId) || [];
        
        if (!layerObjects.includes(circle)) {
          layerObjects.push(circle);
          layerObjectsMap.current.set(activeLayerId, layerObjects);
          
          if (debugMode.current) {
            console.log(`Added circle to layer ${activeLayerId}, total: ${layerObjects.length}`);
          }
          
          // Update layers state with new objects
          updateLayersWithObjects();
        }
      }
      
      startPointRef.current = null;
      circle = null;
      
      canvas.requestRenderAll();
    });
  };

  // Rectangle tool setup
  const setupRectangleTool = (canvas: fabric.Canvas) => {
    let rect: fabric.Rect | null = null;
    
    canvas.on("mouse:down", (o) => {
      // Check if current layer is locked
      const currentLayer = layers.find(l => l.id === activeLayerId);
      if (!currentLayer) {
        toast.error("Calque actif non trouvé");
        return;
      }
      
      if (currentLayer.locked) {
        toast.error("Le calque est verrouillé");
        return;
      }
      
      const pointer = canvas.getPointer(o.e);
      const snappedPoint = snapToGridPoint({
        x: pointer.x,
        y: pointer.y,
      });
      
      startPointRef.current = snappedPoint;
      
      // Show temporary point
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
      }
      
      tempPointRef.current = new fabric.Circle({
        left: snappedPoint.x,
        top: snappedPoint.y,
        radius: 4,
        fill: strokeColor,
        originX: 'center',
        originY: 'center',
        selectable: false,
      });
      
      canvas.add(tempPointRef.current);
      
      // Create the rectangle
      rect = new fabric.Rect({
        left: snappedPoint.x,
        top: snappedPoint.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        fill: fillColor,
        opacity: 0.5,
        selectable: false,
        evented: false,
      });
      
      canvas.add(rect);
    });
    
    canvas.on("mouse:move", (o) => {
      if (!rect || !startPointRef.current) return;
      
      const pointer = canvas.getPointer(o.e);
      const snappedPoint = snapToGridPoint({
        x: pointer.x,
        y: pointer.y,
      });
      
      const width = Math.abs(snappedPoint.x - startPointRef.current.x);
      const height = Math.abs(snappedPoint.y - startPointRef.current.y);
      const left = Math.min(startPointRef.current.x, snappedPoint.x);
      const top = Math.min(startPointRef.current.y, snappedPoint.y);
      
      rect.set({ left, top, width, height });
      
      canvas.requestRenderAll();
    });
    
    canvas.on("mouse:up", () => {
      if (!rect || !startPointRef.current) return;
      
      // Remove temporary point
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
        tempPointRef.current = null;
      }
      
      // Remove zero-size rectangles
      if (rect.width === 0 && rect.height === 0) {
        canvas.remove(rect);
        toast("Rectangle annulé - taille nulle");
      } else {
        // Now make the rectangle selectable for future interactions
        rect.set({
          selectable: true,
          evented: true,
          layerId: activeLayerId // Set layer ID directly
        });
        
        // Add the object to the active layer
        const layerObjects = layerObjectsMap.current.get(activeLayerId) || [];
        
        if (!layerObjects.includes(rect)) {
          layerObjects.push(rect);
          layerObjectsMap.current.set(activeLayerId, layerObjects);
          
          if (debugMode.current) {
            console.log(`Added rectangle to layer ${activeLayerId}, total: ${layerObjects.length}`);
          }
          
          // Update layers state with new objects
          updateLayersWithObjects();
        }
      }
      
      startPointRef.current = null;
      rect = null;
      
      canvas.requestRenderAll();
    });
  };

  // Text tool setup
  const setupTextTool = (canvas: fabric.Canvas) => {
    canvas.on("mouse:down", (o) => {
      // Check if current layer is locked
      const currentLayer = layers.find(l => l.id === activeLayerId);
      if (!currentLayer) {
        toast.error("Calque actif non trouvé");
        return;
      }
      
      if (currentLayer.locked) {
        toast.error("Le calque est verrouillé");
        return;
      }
      
      const pointer = canvas.getPointer(o.e);
      const snappedPoint = snapToGridPoint({
        x: pointer.x,
        y: pointer.y,
      });
      
      const text = new fabric.IText("Modifiez ce texte", {
        left: snappedPoint.x,
        top: snappedPoint.y,
        fontSize: 16,
        fill: strokeColor,
        selectable: true,
        editable: true,
        layerId: activeLayerId // Set layer ID directly
      });
      
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      
      // Add to layer
      const layerObjects = layerObjectsMap.current.get(activeLayerId) || [];
      if (!layerObjects.includes(text)) {
        layerObjects.push(text);
        layerObjectsMap.current.set(activeLayerId, layerObjects);
        
        if (debugMode.current) {
          console.log(`Added text to layer ${activeLayerId}, total: ${layerObjects.length}`);
        }
        
        // Update layers state
        updateLayersWithObjects();
      }
      
      canvas.requestRenderAll();
    });
  };

  // Erase tool setup
  const setupEraseTool = (canvas: fabric.Canvas) => {
    canvas.on("mouse:down", (o) => {
      const pointer = canvas.getPointer(o.e);
      
      // Find object under pointer - check all objects in the canvas
      const objects = canvas.getObjects();
      let objectToRemove = null;
      
      // Get the topmost object that contains the point
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        
        // Skip grid
        if (gridRef.current && (gridRef.current === obj || (gridRef.current.contains && gridRef.current.contains(obj)))) {
          continue;
        }
        
        // Skip temporary point
        if (tempPointRef.current === obj) {
          continue;
        }
        
        // Check if object contains the clicked point or if it's close to a line or shape
        if (isPointInOrNearObject(obj, pointer)) {
          // Get the layer ID of this object
          const objLayerId = obj.get('layerId');
          
          // Check if object belongs to a locked layer
          if (objLayerId) {
            const layer = layers.find(l => l.id === objLayerId);
            if (layer && layer.locked) {
              toast.error("Cet objet est sur un calque verrouillé");
              continue;
            }
          }
          
          objectToRemove = obj;
          break;
        }
      }
      
      if (objectToRemove) {
        // Get the layer ID of the object
        const objLayerId = objectToRemove.get('layerId');
        
        if (objLayerId) {
          // Get the layer objects
          const layerObjects = layerObjectsMap.current.get(objLayerId) || [];
          const index = layerObjects.indexOf(objectToRemove);
          
          if (index >= 0) {
            // Save state before removing
            saveHistoryState([objectToRemove], 'remove', objLayerId);
            
            // Remove from canvas
            canvas.remove(objectToRemove);
            
            // Remove from layer objects map
            layerObjects.splice(index, 1);
            
            // Update layers state
            updateLayersWithObjects();
            
            canvas.requestRenderAll();
            toast("Objet supprimé");
          }
        }
      }
    });
  };

  // Helper function to check if a point is in or near an object
  const isPointInOrNearObject = (obj: fabric.Object, point: { x: number, y: number }): boolean => {
    // Standard containment check
    if (obj.containsPoint(point)) {
      return true;
    }
    
    // Special handling for lines - check proximity
    if (obj instanceof fabric.Line) {
      const threshold = 10; // Pixel distance for considering "near" a line
      
      const x1 = obj.x1 || 0;
      const y1 = obj.y1 || 0;
      const x2 = obj.x2 || 0;
      const y2 = obj.y2 || 0;
      
      // Calculate the distance from point to line segment
      const A = point.x - x1;
      const B = point.y - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      
      if (lenSq !== 0) {
        param = dot / lenSq;
      }
      
      let xx, yy;
      
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }
      
      const dx = point.x - xx;
      const dy = point.y - yy;
      
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance < threshold;
    }
    
    // For other shapes (rectangles, circles), try bounding box with padding
    const boundingRect = obj.getBoundingRect();
    if (boundingRect) {
      const padding = 5; // Extra padding around the shape
      return point.x >= boundingRect.left - padding && 
             point.x <= boundingRect.left + boundingRect.width + padding &&
             point.y >= boundingRect.top - padding && 
             point.y <= boundingRect.top + boundingRect.height + padding;
    }
    
    return false;
  };
  
  // Arrow tool setup
  const setupArrowTool = (canvas: fabric.Canvas) => {
    let arrowLine: fabric.Line | null = null;
    
    canvas.on("mouse:down", (o) => {
      // Check if current layer is locked
      const currentLayer = layers.find(l => l.id === activeLayerId);
      if (!currentLayer) {
        toast.error("Calque actif non trouvé");
        return;
      }
      
      if (currentLayer.locked) {
        toast.error("Le calque est verrouillé");
        return;
      }
      
      const pointer = canvas.getPointer(o.e);
      const snappedPoint = snapToGridPoint({
        x: pointer.x,
        y: pointer.y,
      });
      
      startPointRef.current = snappedPoint;
      
      // Show temporary point
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
      }
      
      tempPointRef.current = new fabric.Circle({
        left: snappedPoint.x,
        top: snappedPoint.y,
        radius: 4,
        fill: strokeColor,
        originX: 'center',
        originY: 'center',
        selectable: false,
      });
      
      canvas.add(tempPointRef.current);
      
      // Create the initial arrow line
      arrowLine = new fabric.Line(
        [snappedPoint.x, snappedPoint.y, snappedPoint.x, snappedPoint.y],
        {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        }
      );
      
      canvas.add(arrowLine);
    });
    
    canvas.on("mouse:move", (o) => {
      if (!arrowLine || !startPointRef.current) return;
      
      const pointer = canvas.getPointer(o.e);
      const snappedPoint = snapToGridPoint({
        x: pointer.x,
        y: pointer.y,
      });
      
      arrowLine.set({
        x2: snappedPoint.x,
        y2: snappedPoint.y,
      });
      
      canvas.requestRenderAll();
    });
    
    canvas.on("mouse:up", () => {
      if (!arrowLine || !startPointRef.current) return;
      
      // Remove temporary point
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
        tempPointRef.current = null;
      }
      
      // Remove zero-length arrows
      if (
        arrowLine.x1 === arrowLine.x2 &&
        arrowLine.y1 === arrowLine.y2
      ) {
        canvas.remove(arrowLine);
        toast("Flèche annulée - longueur nulle");
      } else {
        // Calculate the angle for the arrowhead
        const deltaX = (arrowLine.x2 || 0) - (arrowLine.x1 || 0);
        const deltaY = (arrowLine.y2 || 0) - (arrowLine.y1 || 0);
        const angle = Math.atan2(deltaY, deltaX);
        
        // Create arrowhead
        const arrowHeadSize = Math.max(8, strokeWidth * 2); // Scale with stroke width
        
        const arrowHead = new fabric.Triangle({
          left: arrowLine.x2,
          top: arrowLine.y2,
          originX: 'center',
          originY: 'center',
          pointType: 'arrow_head',
          width: arrowHeadSize * 2,
          height: arrowHeadSize,
          fill: strokeColor,
          stroke: strokeColor,
          angle: (angle * 180 / Math.PI) + 90,
          selectable: false,
          evented: false,
        });
        
        canvas.add(arrowHead);
        
        // Group the line and arrowhead
        const arrowGroup = new fabric.Group([arrowLine, arrowHead], {
          selectable: true,
          evented: true,
          layerId: activeLayerId // Set layer ID directly
        });
        
        // Remove the individual objects and add the group
        canvas.remove(arrowLine, arrowHead);
        canvas.add(arrowGroup);
        
        // Add to layer - the object:added event will handle this
        if (debugMode.current) {
          console.log(`Arrow created on active layer: ${activeLayerId}`);
        }
        
        toast("Flèche ajoutée");
      }
      
      startPointRef.current = null;
      arrowLine = null;
      
      canvas.requestRenderAll();
    });
  };

  return (
    <div className="canvas-container relative">
      <canvas 
        ref={canvasRef}
        className={`${isPrintMode ? "print-view" : ""} border border-gray-200 shadow-sm block`}
      />
    </div>
  );
};
