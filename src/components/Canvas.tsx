
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
}

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const gridRef = useRef<fabric.Group | null>(null);
  const tempPointRef = useRef<fabric.Circle | null>(null);
  const startPointRef = useRef<Point | null>(null);

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
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // Create the grid
    drawGrid();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
    };
  }, [width, height]);

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
    }

    canvas.requestRenderAll();
  }, [activeTool]);

  // Update objects interactivity based on current tool
  const updateObjectsInteractivity = (canvas: fabric.Canvas, tool: Tool) => {
    // Make all objects interactive or not based on the current tool
    const isDrawingTool = tool !== "select" && tool !== "erase";
    
    canvas.getObjects().forEach((obj) => {
      // Skip grid points and make sure the grid is never selectable
      if (gridRef.current && (gridRef.current.contains(obj) || obj === gridRef.current)) {
        obj.selectable = false;
        obj.evented = false;
        return;
      }
      
      obj.selectable = !isDrawingTool;
      obj.evented = !isDrawingTool;
    });
  };

  // Update grid when grid properties change
  useEffect(() => {
    drawGrid();
  }, [gridSize, gridDensity, gridVisible]);

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
          selectable: false, // Make it non-selectable while drawing
          evented: false,    // Prevent events while drawing
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
        toast("Line canceled - zero length");
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
        selectable: false, // Make it non-selectable while drawing
        evented: false,    // Prevent events while drawing
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
        toast("Circle canceled - zero radius");
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
        selectable: false, // Make it non-selectable while drawing
        evented: false,    // Prevent events while drawing
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
        toast("Rectangle canceled - zero size");
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

  // Erase tool setup
  const setupEraseTool = (canvas: fabric.Canvas) => {
    canvas.on("mouse:down", (o) => {
      if (!o.target || o.target === gridRef.current) return;
      
      canvas.remove(o.target);
      canvas.requestRenderAll();
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
