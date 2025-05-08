
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Move,
  Square,
  Text,
  Trash2,
  MoveHorizontal,
  CircleDashed,
  SquareDashed
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export type Tool = 
  | "select" 
  | "line" 
  | "circle" 
  | "rectangle" 
  | "text" 
  | "erase" 
  | "move" 
  | "grid";

interface ToolBarProps {
  activeTool: Tool;
  gridVisible: boolean;
  snapToGrid: boolean;
  setActiveTool: (tool: Tool) => void;
  toggleGridVisibility: () => void;
  toggleSnapToGrid: () => void;
  clearCanvas: () => void;
  printMode: () => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  activeTool,
  gridVisible,
  snapToGrid,
  setActiveTool,
  toggleGridVisibility,
  toggleSnapToGrid,
  clearCanvas,
  printMode,
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
        className="h-9 w-9 p-0"
        title="Texte (T)"
      >
        <Text size={18} />
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
      
      <Button
        size="sm"
        variant={gridVisible ? "default" : "outline"}
        onClick={toggleGridVisibility}
        className="h-9 w-9 p-0"
        title="Afficher/Masquer la grille (G)"
      >
        <SquareDashed size={18} />
      </Button>
      
      <Button
        size="sm"
        variant={snapToGrid ? "default" : "outline"}
        onClick={toggleSnapToGrid}
        className="h-9 w-9 p-0"
        title="Aligner sur la grille (S)"
      >
        <CircleDashed size={18} />
      </Button>
      
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
