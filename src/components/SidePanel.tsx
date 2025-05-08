
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

interface SidePanelProps {
  gridSize: number;
  setGridSize: (size: number) => void;
  gridDensity: number;
  setGridDensity: (density: number) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  gridSize,
  setGridSize,
  gridDensity,
  setGridDensity,
  strokeWidth,
  setStrokeWidth,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
}) => {
  return (
    <div className="w-64 border-r p-4 space-y-6 bg-white h-full">
      <div>
        <h3 className="text-sm font-semibold mb-2">Paramètres de la grille</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="grid-size">Taille de la grille</Label>
              <span className="text-xs text-muted-foreground">{gridSize}px</span>
            </div>
            <Slider
              id="grid-size"
              min={10}
              max={50}
              step={5}
              value={[gridSize]}
              onValueChange={(value) => setGridSize(value[0])}
            />
          </div>
          
          {/* La densité de la grille a été supprimée ici */}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold mb-2">Propriétés du trait</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="stroke-width">Épaisseur du trait</Label>
              <span className="text-xs text-muted-foreground">{strokeWidth}px</span>
            </div>
            <Slider
              id="stroke-width"
              min={1}
              max={10}
              step={1}
              value={[strokeWidth]}
              onValueChange={(value) => setStrokeWidth(value[0])}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stroke-color">Couleur du trait</Label>
            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded border" 
                style={{ backgroundColor: strokeColor }}
              />
              <Input
                id="stroke-color"
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-full h-8"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold mb-2">Propriétés du remplissage</h3>
        <div className="space-y-2">
          <Label htmlFor="fill-color">Couleur de remplissage</Label>
          <div className="flex gap-2">
            <div 
              className="w-8 h-8 rounded border" 
              style={{ backgroundColor: fillColor }}
            />
            <Input
              id="fill-color"
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="w-full h-8"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Note: Le remplissage sera visible uniquement dans l'éditeur, pas en mode impression
          </p>
        </div>
      </div>
    </div>
  );
};
