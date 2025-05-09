
import React from 'react';
import { Layer } from '../hooks/useLayerManager';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Layers } from "lucide-react";
import { LayerItem } from './LayerItem';

interface LayerManagerProps {
  layers: Layer[];
  activeLayerId: string;
  editingLayerId: string | null;
  editLayerName: string;
  setActiveLayerId: (id: string) => void;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  startEditLayerName: (id: string, currentName: string) => void;
  saveLayerName: () => void;
  setEditLayerName: (name: string) => void;
  setEditingLayerId: (id: string | null) => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  layers,
  activeLayerId,
  editingLayerId,
  editLayerName,
  setActiveLayerId,
  addLayer,
  removeLayer,
  toggleLayerVisibility,
  toggleLayerLock,
  startEditLayerName,
  saveLayerName,
  setEditLayerName,
  setEditingLayerId
}) => {
  const handleAddLayer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (process.env.NODE_ENV === 'development') {
      console.log("Ajout d'un nouveau calque depuis l'interface");
    }
    addLayer();
  };

  const activeLayer = layers.find(layer => layer.id === activeLayerId);

  if (process.env.NODE_ENV === 'development') {
    console.log("LayerManager rendu avec le calque actif :", activeLayer?.name);
  }

  return (
    <div className="mb-2 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            <Layers className="mr-2 h-4 w-4" />
            <span>{activeLayer?.name || "Calque"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[280px] bg-white z-50">
            {layers.length === 0 ? (
              <DropdownMenuItem disabled>Aucun calque disponible</DropdownMenuItem>
            ) : (
              layers.map((layer) => (
                <LayerItem
                  key={layer.id}
                  layer={layer}
                  isActive={layer.id === activeLayerId}
                  isEditing={layer.id === editingLayerId}
                  editLayerName={editLayerName}
                  onLayerSelect={setActiveLayerId}
                  onSaveLayerName={saveLayerName}
                  onEditLayerName={setEditLayerName}
                  onCancelEdit={() => {
                    setEditLayerName("");
                    setEditingLayerId(null);
                  }}
                  startEditLayerName={startEditLayerName}
                  toggleLayerVisibility={toggleLayerVisibility}
                  toggleLayerLock={toggleLayerLock}
                  removeLayer={removeLayer}
                />
              ))
            )}
            <DropdownMenuItem onClick={handleAddLayer} className="text-green-600 p-2">
              + Nouveau calque
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
