
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
        <h3 className="text-sm font-semibold mb-2">Grid Settings</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="grid-size">Grid Size</Label>
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
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="grid-density">Grid Density</Label>
              <span className="text-xs text-muted-foreground">{gridDensity}</span>
            </div>
            <Slider
              id="grid-density"
              min={5}
              max={30}
              step={1}
              value={[gridDensity]}
              onValueChange={(value) => setGridDensity(value[0])}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold mb-2">Stroke Properties</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="stroke-width">Stroke Width</Label>
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
            <Label htmlFor="stroke-color">Stroke Color</Label>
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
        <h3 className="text-sm font-semibold mb-2">Fill Properties</h3>
        <div className="space-y-2">
          <Label htmlFor="fill-color">Fill Color</Label>
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
            Note: Fill will only be visible in the editor, not in print mode
          </p>
        </div>
      </div>
    </div>
  );
};
