import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import type { Tool } from "./ToolBar";
import { toast } from "sonner";
import type { Layer } from "../hooks/useLayerManager";

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
  updateLayerObjects: (layerId: string, objects: any[]) => void;
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
  updateLayerObjects,
}) => {
  // Référence pour le conteneur de canvas
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Références pour chaque calque canvas et leur contexte Fabric
  const layerCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const fabricCanvasesRef = useRef<Map<string, fabric.Canvas>>(new Map());
  
  // Canvas de grille séparé
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridFabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const gridRef = useRef<fabric.Group | null>(null);
  
  // Références pour le dessin
  const tempPointRef = useRef<fabric.Circle | null>(null);
  const startPointRef = useRef<Point | null>(null);
  
  // Gardez une trace des dimensions précédentes pour déterminer s'il faut ajuster le zoom
  const prevDimensionsRef = useRef<{ width: number, height: number }>({ width, height });
  
  // History state for undo/redo
  const historyRef = useRef<HistoryAction[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryActionRef = useRef<boolean>(false);
  
  // Debug flag
  const debugMode = useRef<boolean>(true);
  
  // Référence pour suivre si les événements sont configurés
  const eventsConfiguredRef = useRef<Set<string>>(new Set());

  // Gestion de l'état des objets actuellement en cours de dessin
  const [currentDrawingObjects, setCurrentDrawingObjects] = useState<{
    layerId: string;
    object: fabric.Object | null;
  }>({
    layerId: '',
    object: null,
  });

  // Initialize canvas layers
  useEffect(() => {
    // Créer le canvas de grille
    if (gridCanvasRef.current && !gridFabricCanvasRef.current) {
      const gridCanvas = new fabric.Canvas(gridCanvasRef.current, {
        width,
        height,
        selection: false,
        backgroundColor: "transparent",
        renderOnAddRemove: false,
      });
      gridFabricCanvasRef.current = gridCanvas;
      drawGrid();
    }
    
    return () => {
      // Nettoyer le canvas de grille
      if (gridFabricCanvasRef.current) {
        gridFabricCanvasRef.current.dispose();
      }
    };
  }, []);

  // Créer ou mettre à jour les canvas pour chaque calque
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    
    console.log(`Initializing ${layers.length} canvas layers`);
    
    // Supprimer les canvas des calques qui n'existent plus
    const existingLayerIds = new Set(layers.map(layer => layer.id));
    const canvasesToRemove: string[] = [];
    
    fabricCanvasesRef.current.forEach((canvas, layerId) => {
      if (!existingLayerIds.has(layerId)) {
        console.log(`Removing canvas for deleted layer ${layerId}`);
        canvas.dispose();
        canvasesToRemove.push(layerId);
        
        // Supprimer aussi l'élément canvas du DOM
        const canvasElement = layerCanvasRefs.current.get(layerId);
        if (canvasElement && canvasElement.parentNode) {
          canvasElement.parentNode.removeChild(canvasElement);
        }
        
        // Supprimer l'entrée de eventsConfigured pour ce calque
        eventsConfiguredRef.current.delete(layerId);
      }
    });
    
    canvasesToRemove.forEach(id => {
      fabricCanvasesRef.current.delete(id);
      layerCanvasRefs.current.delete(id);
    });
    
    // Créer ou configurer les canvas pour chaque calque
    layers.forEach((layer, index) => {
      const existingCanvas = fabricCanvasesRef.current.get(layer.id);
      
      if (existingCanvas) {
        // Mettre à jour le canvas existant
        console.log(`Updating canvas for layer ${layer.id} (${layer.name})`);
        existingCanvas.selection = layer.id === activeLayerId && activeTool === "select" && !layer.locked;
        
        // Mettre à jour la visibilité du canvas
        const canvasElement = layerCanvasRefs.current.get(layer.id);
        if (canvasElement) {
          canvasElement.style.display = layer.visible ? 'block' : 'none';
          // Important: Don't disable pointer events on active layer that isn't locked
          canvasElement.style.pointerEvents = layer.id === activeLayerId && !layer.locked ? 'auto' : 'none';
          canvasElement.style.zIndex = `${index + 1}`;
        }
      } else {
        // Créer un nouveau canvas pour ce calque
        console.log(`Creating new canvas for layer ${layer.id} (${layer.name})`);
        
        // Créer l'élément canvas
        const canvasElement = document.createElement('canvas');
        canvasElement.width = width;
        canvasElement.height = height;
        canvasElement.style.position = 'absolute';
        canvasElement.style.top = '0';
        canvasElement.style.left = '0';
        canvasElement.style.pointerEvents = layer.id === activeLayerId && !layer.locked ? 'auto' : 'none';
        canvasElement.style.display = layer.visible ? 'block' : 'none';
        canvasElement.style.zIndex = `${index + 1}`;
        canvasElement.id = `canvas-layer-${layer.id}`;
        canvasElement.dataset.layerId = layer.id;
        
        // Ajouter l'élément canvas au conteneur
        canvasContainerRef.current.appendChild(canvasElement);
        
        // Créer une instance Fabric pour ce canvas
        const fabricCanvas = new fabric.Canvas(canvasElement, {
          width,
          height,
          selection: layer.id === activeLayerId && activeTool === "select" && !layer.locked,
          backgroundColor: "transparent",
          renderOnAddRemove: true,
          preserveObjectStacking: true,
          isDrawingMode: false,
        });
        
        // Stocker les références
        layerCanvasRefs.current.set(layer.id, canvasElement);
        fabricCanvasesRef.current.set(layer.id, fabricCanvas);
        
        // Restaurer les objets du calque si présents
        if (layer.objects && layer.objects.length > 0) {
          console.log(`Restoring ${layer.objects.length} objects for layer ${layer.id}`);
          try {
            layer.objects.forEach(obj => {
              if (obj && typeof obj.set === 'function') {
                // C'est un objet Fabric valide, l'ajouter au canvas
                fabricCanvas.add(obj);
              }
            });
            fabricCanvas.requestRenderAll();
          } catch (error) {
            console.error(`Error restoring objects for layer ${layer.id}:`, error);
          }
        }
      }
    });
    
    // Configurer les événements pour le calque actif après que tous les canvas sont créés
    const activeFabricCanvas = fabricCanvasesRef.current.get(activeLayerId);
    if (activeFabricCanvas) {
      console.log(`Setting up events for active layer ${activeLayerId}`);
      setupCanvasEvents(activeFabricCanvas, activeLayerId);
    }
    
    // Mettre à jour l'ordre d'empilement z-index
    layers.forEach((layer, index) => {
      const canvas = layerCanvasRefs.current.get(layer.id);
      if (canvas) {
        canvas.style.zIndex = `${index + 1}`;
      }
    });
    
    // Mettre la grille au-dessus de tout si visible
    if (gridCanvasRef.current) {
      gridCanvasRef.current.style.zIndex = `${layers.length + 1}`;
      gridCanvasRef.current.style.display = gridVisible && !isPrintMode ? 'block' : 'none';
    }
  }, [layers, activeLayerId, width, height]);

  // Configurer les événements spécifiques à l'outil actif sur le canvas du calque actif
  useEffect(() => {
    // Désactiver tous les événements sur tous les canvas d'abord
    fabricCanvasesRef.current.forEach((canvas, layerId) => {
      canvas.off('mouse:down');
      canvas.off('mouse:move');
      canvas.off('mouse:up');
      
      const canvasElement = layerCanvasRefs.current.get(layerId);
      if (canvasElement) {
        canvasElement.style.pointerEvents = 'none';
      }
      
      canvas.selection = false;
      // Réinitialiser aussi l'indicateur d'événements configurés
      eventsConfiguredRef.current.delete(layerId);
    });
    
    const activeFabricCanvas = fabricCanvasesRef.current.get(activeLayerId);
    if (!activeFabricCanvas) {
      console.log(`No canvas found for active layer ${activeLayerId}`);
      return;
    }
    
    // Obtenir les informations sur le calque actif
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) {
      console.error(`Active layer ${activeLayerId} not found in layers array`);
      return;
    }
    
    // Activer les interactions sur le calque actif s'il n'est pas verrouillé
    const canvasElement = layerCanvasRefs.current.get(activeLayerId);
    if (canvasElement) {
      // Activer les interactions seulement si le calque n'est pas verrouillé
      canvasElement.style.pointerEvents = activeLayer.locked ? 'none' : 'auto';
    }
    
    // Mettre à jour le mode de sélection
    activeFabricCanvas.selection = activeTool === "select" && !activeLayer.locked;
    
    // Configurer les événements pour le calque actif
    if (!activeLayer.locked) {
      setupCanvasEvents(activeFabricCanvas, activeLayerId);
      console.log(`Updated canvas events for active layer ${activeLayerId} with tool ${activeTool}. Layer locked: ${activeLayer.locked}`);
    } else {
      console.log(`Layer ${activeLayerId} is locked, no events set up`);
    }
  }, [activeTool, activeLayerId, strokeColor, strokeWidth, fillColor, snapToGrid, layers]);

  // Mettre à jour la visibilité des calques
  useEffect(() => {
    layers.forEach(layer => {
      const canvasElement = layerCanvasRefs.current.get(layer.id);
      if (canvasElement) {
        canvasElement.style.display = layer.visible ? 'block' : 'none';
        
        // Force aussi la mise à jour des pointer-events pour s'assurer qu'ils sont correctement configurés
        if (layer.id === activeLayerId) {
          canvasElement.style.pointerEvents = layer.locked ? 'none' : 'auto';
        } else {
          canvasElement.style.pointerEvents = 'none';
        }
      }
    });
    
    // Mettre à jour la visibilité de la grille
    if (gridCanvasRef.current) {
      gridCanvasRef.current.style.display = gridVisible && !isPrintMode ? 'block' : 'none';
    }
  }, [layers, gridVisible, isPrintMode]);

  // Mettre à jour les dimensions de tous les canvas lors du redimensionnement
  useEffect(() => {
    if (width === prevDimensionsRef.current.width && height === prevDimensionsRef.current.height) {
      return;
    }
    
    console.log(`Resizing all canvases to ${width}x${height}`);
    
    // Mettre à jour les dimensions de tous les canvas
    fabricCanvasesRef.current.forEach((canvas, layerId) => {
      canvas.setDimensions({ width, height });
    });
    
    // Mettre à jour le canvas de grille
    if (gridFabricCanvasRef.current) {
      gridFabricCanvasRef.current.setDimensions({ width, height });
      drawGrid();
    }
    
    prevDimensionsRef.current = { width, height };
  }, [width, height]);

  // Configurer les événements clavier globaux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "delete":
        case "backspace":
          deleteSelectedObjects();
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            performUndo();
          }
          break;
        case "y":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            performRedo();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeLayerId]);

  // Configurer les événements spécifiques pour un canvas
  const setupCanvasEvents = (canvas: fabric.Canvas, layerId: string) => {
    // Vérifier si le calque est verrouillé
    const currentLayer = layers.find(l => l.id === layerId);
    if (!currentLayer) {
      console.error(`Layer ${layerId} not found when setting up events`);
      return;
    }
    
    if (currentLayer.locked) {
      console.log(`Layer ${layerId} is locked, disabling interactions`);
      canvas.selection = false;
      canvas.defaultCursor = "not-allowed";
      
      // Désactiver tous les événements
      canvas.off('mouse:down');
      canvas.off('mouse:move');
      canvas.off('mouse:up');
      
      // Marquer comme configuré même s'il est verrouillé
      eventsConfiguredRef.current.add(layerId);
      return;
    }
    
    // Vérifier si les événements sont déjà configurés pour ce calque et cet outil
    const eventKey = `${layerId}-${activeTool}`;
    if (eventsConfiguredRef.current.has(eventKey)) {
      console.log(`Events already configured for ${layerId} with tool ${activeTool}`);
      return;
    }
    
    // Réinitialiser tous les événements
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    
    // Définir le curseur approprié
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
    
    // Configurer les interactions selon l'outil actif
    if (activeTool === "line") {
      setupLineTool(canvas, layerId);
    } else if (activeTool === "circle") {
      setupCircleTool(canvas, layerId);
    } else if (activeTool === "rectangle") {
      setupRectangleTool(canvas, layerId);
    } else if (activeTool === "text") {
      setupTextTool(canvas, layerId);
    } else if (activeTool === "erase") {
      setupEraseTool(canvas, layerId);
    } else if (activeTool === "arrow") {
      setupArrowTool(canvas, layerId);
    } else if (activeTool === "select") {
      // Événements supplémentaires pour le mode sélection
      canvas.on('object:added', function(e) {
        if (!e.target || isHistoryActionRef.current) return;
        
        // Ajouter l'ID du calque à l'objet
        e.target.set('layerId', layerId);
        
        console.log(`Object added to layer ${layerId}`);
        saveHistoryState([e.target], 'add', layerId);
        
        // Mettre à jour la liste d'objets du calque
        const layerObjects = canvas.getObjects().filter(obj => obj !== tempPointRef.current);
        updateLayerObjects(layerId, layerObjects);
      });
      
      canvas.on('object:modified', function(e) {
        if (!e.target || isHistoryActionRef.current) return;
        
        console.log(`Object modified in layer ${layerId}`);
        saveHistoryState([e.target], 'modify', layerId);
        
        // Mettre à jour la liste d'objets du calque
        const layerObjects = canvas.getObjects().filter(obj => obj !== tempPointRef.current);
        updateLayerObjects(layerId, layerObjects);
      });
      
      // Appliquer le snap to grid en mode select
      if (snapToGrid) {
        canvas.on('object:moving', function(e) {
          if (!e.target) return;
          
          const obj = e.target;
          
          // Appliquer le snap
          const snapPoint = snapToGridPoint({
            x: obj.left || 0,
            y: obj.top || 0
          });
          
          obj.set({
            left: snapPoint.x,
            top: snapPoint.y
          });
        });
      }
    }
    
    // Marquer les événements comme configurés pour ce calque et cet outil
    eventsConfiguredRef.current.add(eventKey);
    
    // Log des événements configurés
    console.log(`Events set up for layer ${layerId} with tool ${activeTool}`);
  };

  // Dessiner la grille sur son propre canvas
  const drawGrid = () => {
    if (!gridFabricCanvasRef.current) return;
    
    const canvas = gridFabricCanvasRef.current;
    
    // Supprimer la grille précédente
    if (gridRef.current) {
      canvas.remove(gridRef.current);
    }

    const points = [];
    const cellSize = gridSize;
    const cols = Math.floor(width / cellSize) + 1;
    const rows = Math.floor(height / cellSize) + 1;

    // Créer les points de la grille
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

    // Regrouper tous les points
    const grid = new fabric.Group(points, {
      selectable: false,
      evented: false,
      visible: gridVisible,
      lockMovementX: true,
      lockMovementY: true,
    });

    canvas.add(grid);
    gridRef.current = grid;
    canvas.requestRenderAll();
  };

  // Snap to grid
  const snapToGridPoint = (point: Point): Point => {
    if (!snapToGrid) return point;
    
    const cellSize = gridSize;
    return {
      x: Math.round(point.x / cellSize) * cellSize,
      y: Math.round(point.y / cellSize) * cellSize,
    };
  };

  // Supprimer les objets sélectionnés du calque actif
  const deleteSelectedObjects = () => {
    const canvas = fabricCanvasesRef.current.get(activeLayerId);
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;
    
    // Vérifier si le calque est verrouillé
    const activeLayer = layers.find(layer => layer.id === activeLayerId);
    if (activeLayer?.locked) {
      toast.error("Le calque est verrouillé");
      return;
    }
    
    // Sauvegarder l'état avant suppression
    saveHistoryState(activeObjects, 'remove', activeLayerId);
    
    // Supprimer les objets
    canvas.discardActiveObject();
    activeObjects.forEach(obj => {
      canvas.remove(obj);
    });
    
    // Mettre à jour la liste d'objets du calque
    const layerObjects = canvas.getObjects().filter(obj => obj !== tempPointRef.current);
    updateLayerObjects(activeLayerId, layerObjects);
    
    canvas.requestRenderAll();
    toast("Objets supprimés");
  };
  
  // Historique: sauvegarder l'état
  const saveHistoryState = (objects: fabric.Object[], actionType: 'add' | 'remove' | 'modify', layerId: string) => {
    // Si nous sommes au milieu de l'historique, tronquer les états futurs
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    
    // Ajouter le nouvel état
    historyRef.current.push({
      objects: [...objects],
      type: actionType,
      layerId
    });
    
    // Mettre à jour l'index
    historyIndexRef.current = historyRef.current.length - 1;
  };

  // Undo
  const performUndo = () => {
    if (historyIndexRef.current < 0) {
      toast("Rien à annuler");
      return;
    }
    
    const action = historyRef.current[historyIndexRef.current];
    const canvas = fabricCanvasesRef.current.get(action.layerId);
    
    if (!canvas) {
      console.error(`Canvas not found for layer ${action.layerId}`);
      historyIndexRef.current--;
      return;
    }
    
    isHistoryActionRef.current = true;
    
    try {
      if (action.type === 'add') {
        // Annuler un ajout en supprimant les objets
        action.objects.forEach(obj => {
          canvas.remove(obj);
        });
        
        toast("Action annulée");
      } else if (action.type === 'remove') {
        // Annuler une suppression en ajoutant les objets
        action.objects.forEach(obj => {
          canvas.add(obj);
        });
        
        toast("Suppression annulée");
      } else if (action.type === 'modify') {
        // Pour les modifications, il faudrait stocker l'état précédent des objets
        toast("Modification annulée");
      }
      
      // Décrémenter l'index d'historique
      historyIndexRef.current--;
      
      // Mettre à jour la liste d'objets du calque
      const layerObjects = canvas.getObjects().filter(obj => obj !== tempPointRef.current);
      updateLayerObjects(action.layerId, layerObjects);
      
      canvas.requestRenderAll();
    } finally {
      isHistoryActionRef.current = false;
    }
  };

  // Redo
  const performRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      toast("Rien à rétablir");
      return;
    }
    
    // Incrémenter l'index d'historique
    historyIndexRef.current++;
    
    const action = historyRef.current[historyIndexRef.current];
    const canvas = fabricCanvasesRef.current.get(action.layerId);
    
    if (!canvas) {
      console.error(`Canvas not found for layer ${action.layerId}`);
      return;
    }
    
    isHistoryActionRef.current = true;
    
    try {
      if (action.type === 'add') {
        // Rétablir un ajout en ajoutant les objets
        action.objects.forEach(obj => {
          canvas.add(obj);
        });
        
        toast("Action rétablie");
      } else if (action.type === 'remove') {
        // Rétablir une suppression en supprimant les objets
        action.objects.forEach(obj => {
          canvas.remove(obj);
        });
        
        toast("Suppression rétablie");
      } else if (action.type === 'modify') {
        // Pour les modifications, il faudrait restaurer l'état suivant
        toast("Modification rétablie");
      }
      
      // Mettre à jour la liste d'objets du calque
      const layerObjects = canvas.getObjects().filter(obj => obj !== tempPointRef.current);
      updateLayerObjects(action.layerId, layerObjects);
      
      canvas.requestRenderAll();
    } finally {
      isHistoryActionRef.current = false;
    }
  };

  // Exposer les fonctions d'annulation/rétablissement au composant parent
  useEffect(() => {
    if (onUndo && typeof onUndo === 'function') {
      onUndo = () => performUndo();
    }
    
    if (onRedo && typeof onRedo === 'function') {
      onRedo = () => performRedo();
    }
  }, []);

  // Outil Ligne
  const setupLineTool = (canvas: fabric.Canvas, layerId: string) => {
    let line: fabric.Line | null = null;
    
    canvas.on("mouse:down", (o) => {
      // Vérifier si le calque est verrouillé
      const currentLayer = layers.find(l => l.id === layerId);
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
      
      // Afficher un point temporaire
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
      
      // Créer la ligne
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
      console.log("Line tool: Started drawing line");
      
      // Mettre à jour l'objet en cours de dessin
      setCurrentDrawingObjects({
        layerId,
        object: line
      });
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
      
      // Supprimer le point temporaire
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
        tempPointRef.current = null;
      }
      
      // Supprimer les lignes de longueur nulle
      if (line.x1 === line.x2 && line.y1 === line.y2) {
        canvas.remove(line);
        toast("Ligne annulée - longueur nulle");
      } else {
        // Rendre la ligne interactive
        line.set({
          selectable: true,
          evented: true,
          layerId: layerId
        });
        
        console.log("Line tool: Finished drawing line");
        
        // Mettre à jour la liste d'objets du calque - IMPORTANT POUR LA PERSISTANCE
        const layerObjects = canvas.getObjects().filter(obj => obj !== tempPointRef.current);
        updateLayerObjects(layerId, layerObjects);
        
        // Ajouter l'action à l'historique
        saveHistoryState([line], 'add', layerId);
      }
      
      startPointRef.current = null;
      setCurrentDrawingObjects({ layerId: '', object: null });
      
      canvas.requestRenderAll();
    });
  };

  // Outil Cercle
  const setupCircleTool = (canvas: fabric.Canvas, layerId: string) => {
    let circle: fabric.Circle | null = null;
    
    canvas.on("mouse:down", (o) => {
      // Vérifier si le calque est verrouillé
      const currentLayer = layers.find(l => l.id === layerId);
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
      
      // Afficher un point temporaire
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
      
      // Créer le cercle
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
      console.log("Circle tool: Started drawing circle");
      
      // Mettre à jour l'objet en cours de dessin
      setCurrentDrawingObjects({
        layerId,
        object: circle
      });
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
      
      // Supprimer le point temporaire
      if (tempPointRef.current) {
        canvas.remove(tempPointRef.current);
        tempPointRef.current = null;
      }
      
      // Supprimer les cercles de rayon nul
      if (circle.radius === 0) {
        canvas.remove(circle);
        toast("Cercle annulé - rayon nul");
      } else {
        // Rendre le cercle interactif
        circle.set({
          selectable: true,
          event
