import React from "react";
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
      <div className="text-center p-4">
        <h2 className="text-lg font-semibold">Architecte de Croquis sur Grille</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Utilisez les outils dans la barre supérieure pour créer votre dessin technique.
        </p>
      </div>
      
      <Separator />
      
      <div className="text-sm">
        <h3 className="font-medium mb-2">Raccourcis clavier:</h3>
        <ul className="space-y-1">
          <li><span className="font-mono bg-gray-100 px-1">V</span> - Sélection</li>
          <li><span className="font-mono bg-gray-100 px-1">L</span> - Ligne</li>
          <li><span className="font-mono bg-gray-100 px-1">F</span> - Flèche</li>
          <li><span className="font-mono bg-gray-100 px-1">C</span> - Cercle</li>
          <li><span className="font-mono bg-gray-100 px-1">R</span> - Rectangle</li>
          <li><span className="font-mono bg-gray-100 px-1">T</span> - Texte</li>
          <li><span className="font-mono bg-gray-100 px-1">E</span> - Effacer</li>
          <li><span className="font-mono bg-gray-100 px-1">G</span> - Afficher/Masquer grille</li>
        </ul>
      </div>
    </div>
  );
};
