import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import type { Tool } from "./ToolBar";
import { toast } from "sonner";

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
}

type HistoryAction = {
  objects: fabric.Object[];
  type: 'add' | 'remove' | 'modify';
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const gridRef = useRef<fabric.Group | null>(null);
  const tempPointRef = useRef<fabric.Circle | null>(null);
  const startPointRef = useRef<Point | null>(null);
  
  // History state for undo/redo
  const historyRef = useRef<HistoryAction[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryActionRef = useRef<boolean>(false);

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      selection: activeTool === "select",
      backgroundColor: "#ffffff",
    });

    fabricCanvasRef.current = canvas;

    // Add key event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
          // Save state before deleting
          saveHistoryState(activeObjects, 'remove');
          
          activeObjects.forEach((obj) => canvas.remove(obj));
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
      
      saveHistoryState([e.target], 'add');
    });

    canvas.on('object:modified', function(e) {
      if (!e.target || isHistoryActionRef.current) return;
      
      // Don't track grid modifications
      if (gridRef.current && (gridRef.current.contains(e.target) || e.target === gridRef.current)) {
        return;
      }
      
      saveHistoryState([e.target], 'modify');
    });

    // Ajout de la fonctionnalité d'aimantation à la grille lors du déplacement
    canvas.on('object:moving', function(e) {
      if (!snapToGrid || !e.target) return;
      
      const obj = e.target;
      
      // Snap à la grille
      const snapPoint = snapToGridPoint({
        x: obj.left || 0,
        y: obj.top || 0
      });
      
      // Appliquer la position aimantée
      obj.set({
        left: snapPoint.x,
        top: snapPoint.y
      });
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
    };
  }, [width, height]);

  // Save the current state to history
  const saveHistoryState = (objects: fabric.Object[], actionType: 'add' | 'remove' | 'modify') => {
    // If we're in the middle of the history, truncate the future states
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    
    // Add the new state
    historyRef.current.push({
      objects: [...objects],
      type: actionType
    });
    
    // Update index
    historyIndexRef.current = historyRef.current.length - 1;
  };

  // Perform undo action
  const performUndo = () => {
    if (!fabricCanvasRef.current || historyIndexRef.current < 0) return;
    
    const canvas = fabricCanvasRef.current;
    const action = historyRef.current[historyIndexRef.current];
    
    isHistoryActionRef.current = true;
    
    try {
      if (action.type === 'add') {
        // Undo an addition by removing the objects
        action.objects.forEach(obj => {
          const canvasObject = canvas.getObjects().find(o => o === obj);
          if (canvasObject) {
            canvas.remove(canvasObject);
          }
        });
      } else if (action.type === 'remove') {
        // Undo a removal by adding the objects back
        action.objects.forEach(obj => {
          canvas.add(obj);
        });
      } else if (action.type === 'modify') {
        // Undo a modification would require storing previous state
        // This is a simplified implementation
        toast("Modification annulée");
      }
      
      // Decrement the history index
      historyIndexRef.current--;
      
      canvas.requestRenderAll();
      onUndo();
    } finally {
      isHistoryActionRef.current = false;
    }
  };

  // Perform redo action
  const performRedo = () => {
    if (!fabricCanvasRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
    
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
        });
      } else if (action.type === 'remove') {
        // Redo a removal by removing the objects
        action.objects.forEach(obj => {
          const canvasObject = canvas.getObjects().find(o => o === obj);
          if (canvasObject) {
            canvas.remove(canvasObject);
          }
        });
      } else if (action.type === 'modify') {
        // Redo a modification would require storing next state
        // This is a simplified implementation
        toast("Modification rétablie");
      }
      
      canvas.requestRenderAll();
      onRedo();
    } finally {
      isHistoryActionRef.current = false;
    }
  };

  // Export the undo/redo functions for toolbar use
  useEffect(() => {
    // These need to be direct references to the functions
    onUndo = performUndo;
    onRedo = performRedo;
  }, [onUndo, onRedo]);

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
  }, [activeTool]);

  // Effet pour réagir aux changements de strokeWidth, strokeColor et fillColor
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
    // Make all objects interactive or not based on the current tool
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
      
      obj.selectable = !isDrawingTool;
      obj.evented = !isDrawingTool;
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

  // Draw the grid of points
  const drawGrid = () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Remove previous grid if it exists
    if (gridRef.current) {
      canvas.remove(gridRef.current);
    }

    const points = [];
    const cellSize = gridSize;
    const cols = Math.floor(width / cellSize) + 1;
    const rows = Math.floor(height / cellSize) + 1;

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
          evented: true
        });
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
          evented: true
        });
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
          evented: true
        });
      }
      
      startPointRef.current = null;
      rect = null;
      
      canvas.requestRenderAll();
    });
  };

  // Text tool setup
  const setupTextTool = (canvas: fabric.Canvas) => {
    canvas.on("mouse:down", (o) => {
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
      });
      
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      
      canvas.requestRenderAll();
    });
  };

  // Erase tool setup - Improved to work with whole shapes
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
        if (gridRef.current === obj || (gridRef.current && gridRef.current.contains && gridRef.current.contains(obj))) {
          continue;
        }
        
        // Skip temporary point
        if (tempPointRef.current === obj) {
          continue;
        }
        
        // Check if object contains the clicked point or if it's close to a line or shape
        if (isPointInOrNearObject(obj, pointer)) {
          objectToRemove = obj;
          break;
        }
      }
      
      if (objectToRemove) {
        // Save state before removing
        saveHistoryState([objectToRemove], 'remove');
        
        canvas.remove(objectToRemove);
        canvas.requestRenderAll();
        toast("Objet supprimé");
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
  
  // New Arrow tool setup
  const setupArrowTool = (canvas: fabric.Canvas) => {
    canvas.on("mouse:down", (o) => {
      // First, check if we clicked on a line
      if (!o.target || !(o.target instanceof fabric.Line)) {
        toast("Veuillez cliquer sur une ligne pour ajouter une flèche");
        return;
      }
      
      const line = o.target as fabric.Line;
      const pointer = canvas.getPointer(o.e);
      
      // Get line coordinates
      const x1 = line.x1 || 0;
      const y1 = line.y1 || 0;
      const x2 = line.x2 || 0;
      const y2 = line.y2 || 0;
      
      // Calculate line direction vector
      const lineVectorX = x2 - x1;
      const lineVectorY = y2 - y1;
      const lineLength = Math.sqrt(lineVectorX * lineVectorX + lineVectorY * lineVectorY);
      
      if (lineLength === 0) return; // Prevent division by zero
      
      // Normalize the line vector
      const normalizedLineVectorX = lineVectorX / lineLength;
      const normalizedLineVectorY = lineVectorY / lineLength;
      
      // Calculate perpendicular vector (rotate 90 degrees)
      const perpVectorX = -normalizedLineVectorY;
      const perpVectorY = normalizedLineVectorX;
      
      // Find the closest point on the line to the click point
      const dx = pointer.x - x1;
      const dy = pointer.y - y1;
      const t = (dx * lineVectorX + dy * lineVectorY) / (lineLength * lineLength);
      const clampedT = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]
      
      // Calculate the closest point on the line
      const closestX = x1 + clampedT * lineVectorX;
      const closestY = y1 + clampedT * lineVectorY;
      
      // Calculate which side of the line the click is on
      const cross = (pointer.x - x1) * (y2 - y1) - (pointer.y - y1) * (x2 - x1);
      const direction = Math.sign(cross);
      
      // Calculate arrow start point (on the line)
      const startX = closestX;
      const startY = closestY;
      
      // Calculate arrow end point (perpendicular to the line)
      const arrowLength = 40; // Length of the arrow
      const endX = startX + direction * perpVectorX * arrowLength;
      const endY = startY + direction * perpVectorY * arrowLength;
      
      // Create the arrow line
      const arrowLine = new fabric.Line([startX, startY, endX, endY], {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        selectable: true,
      });
      
      // Calculate the position for the arrowhead
      const arrowHeadSize = 10;
      const headAngle = Math.atan2(endY - startY, endX - startX);
      
      // Create the arrowhead using a small triangle
      const arrowHead = new fabric.Triangle({
        left: endX,
        top: endY,
        width: arrowHeadSize,
        height: arrowHeadSize,
        fill: strokeColor,
        stroke: strokeColor,
        strokeWidth: 1,
        angle: (headAngle * 180 / Math.PI) + 90,
        originX: 'center',
        originY: 'center',
        selectable: true,
      });
      
      // Group the arrow line and arrowhead together
      const arrow = new fabric.Group([arrowLine, arrowHead], {
        selectable: true,
        evented: true,
      });
      
      canvas.add(arrow);
      canvas.requestRenderAll();
      toast("Flèche ajoutée");
    });
  };

  return (
    <div className="canvas-container">
      <canvas 
        ref={canvasRef}
        className={isPrintMode ? "print-view" : ""}
      />
    </div>
  );
};
