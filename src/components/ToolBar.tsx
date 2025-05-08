
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Move,
  Square,
  Trash2,
  MoveHorizontal,
  CircleDashed,
  SquareDashed,
  ArrowUpRight,
  Grid3X3,
  Paintbrush
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export type Tool = 
  | "select" 
  | "line" 
  | "circle" 
  | "rectangle" 
  | "text" 
  | "erase" 
  | "move" 
  | "grid"
  | "arrow";

interface ToolBarProps {
  activeTool: Tool;
  gridVisible: boolean;
  snapToGrid: boolean;
  setActiveTool: (tool: Tool) => void;
  toggleGridVisibility: () => void;
  toggleSnapToGrid: () => void;
  clearCanvas: () => void;
  printMode: () => void;
  undoAction: () => void;
  redoAction: () => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  activeTool,
  gridVisible,
  setActiveTool,
  toggleGridVisibility,
  clearCanvas,
  printMode,
  gridSize,
  setGridSize,
  strokeColor,
  setStrokeColor,
  // Les paramètres snapToGrid, toggleSnapToGrid, undoAction, redoAction sont toujours
  // reçus mais ne seront plus utilisés dans l'interface
}) => {
  return (
    <div className="p-2 bg-white border-b flex items-center gap-1 flex-wrap">
      <Button
        size="sm"
        variant={activeTool === "select" ? "default" : "outline"}
        onClick={() => setActiveTool("select")}
        className="h-9 w-9 p-0"
        title="Sélectionner (V)"
      >
        <Move size={18} />
      </Button>
      
      <Button
        size="sm"
        variant={activeTool === "line" ? "default" : "outline"}
        onClick={() => setActiveTool("line")}
        className="h-9 w-9 p-0"
        title="Ligne (L)"
      >
        <MoveHorizontal size={18} />
      </Button>
      
      <Button
        size="sm"
        variant={activeTool === "arrow" ? "default" : "outline"}
        onClick={() => setActiveTool("arrow")}
        className="h-9 w-9 p-0"
        title="Flèche (F)"
      >
        <ArrowUpRight size={18} />
      </Button>
      
      <Button
        size="sm"
        variant={activeTool === "circle" ? "default" : "outline"}
        onClick={() => setActiveTool("circle")}
        className="h-9 w-9 p-0"
        title="Cercle (C)"
      >
        <Circle size={18} />
      </Button>
      
      <Button
        size="sm"
        variant={activeTool === "rectangle" ? "default" : "outline"}
        onClick={() => setActiveTool("rectangle")}
        className="h-9 w-9 p-0"
        title="Rectangle (R)"
      >
        <Square size={18} />
      </Button>
      
      <Button
        size="sm"
        variant={activeTool === "text" ? "default" : "outline"}
        onClick={() => setActiveTool("text")}
        className="h-9"
        title="Texte (T)"
      >
        Text
      </Button>
      
      <Button
        size="sm"
        variant={activeTool === "erase" ? "default" : "outline"}
        onClick={() => setActiveTool("erase")}
        className="h-9 w-9 p-0"
        title="Effacer (E)"
      >
        <Trash2 size={18} />
      </Button>
      
      <Separator orientation="vertical" className="mx-2 h-8" />
      
      {/* Popover pour les paramètres de la grille */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={gridVisible ? "default" : "outline"}
            onClick={toggleGridVisibility}
            className="h-9 w-9 p-0"
            title="Afficher/Masquer la grille (G)"
          >
            <SquareDashed size={18} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-2">
            <Label htmlFor="grid-size">Taille de la grille: {gridSize}px</Label>
            <Slider
              id="grid-size"
              min={10}
              max={50}
              step={5}
              value={[gridSize]}
              onValueChange={(value) => setGridSize(value[0])}
              className="w-full"
            />
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Popover pour la couleur du trait */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0 relative"
            title="Couleur du trait"
          >
            <Paintbrush size={18} />
            <div 
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border"
              style={{ backgroundColor: strokeColor }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <Input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-full h-8"
          />
        </PopoverContent>
      </Popover>
      
      <Separator orientation="vertical" className="mx-2 h-8" />
      
      <Button
        size="sm"
        variant="outline"
        onClick={clearCanvas}
        className="h-9"
        title="Effacer tout"
      >
        Effacer
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={printMode}
        className="h-9"
        title="Vue impression"
      >
        Imprimer
      </Button>
    </div>
  );
};
