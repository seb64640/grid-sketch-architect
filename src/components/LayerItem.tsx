
import React from 'react';
import { Layer } from '../hooks/useLayerManager';
import { Input } from "./ui/input";
import { Check } from "lucide-react";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import { LayerInfo } from "./LayerInfo";
import { LayerActionButtons } from "./LayerActionButtons";

interface LayerItemProps {
  layer: Layer;
  isActive: boolean;
  isEditing: boolean;
  editLayerName: string;
  onLayerSelect: (id: string) => void;
  onSaveLayerName: () => void;
  onEditLayerName: (name: string) => void;
  onCancelEdit: () => void;
  startEditLayerName: (id: string, currentName: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  removeLayer: (id: string) => void;
}

export const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isActive,
  isEditing,
  editLayerName,
  onLayerSelect,
  onSaveLayerName,
  onEditLayerName,
  onCancelEdit,
  startEditLayerName,
  toggleLayerVisibility,
  toggleLayerLock,
  removeLayer
}) => {
  const withStopPropagation = (handler: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler();
  };

  return (
    <DropdownMenuItem
      key={layer.id}
      className={`flex items-center justify-between p-2 ${isActive ? 'bg-accent font-bold border-l-4 border-primary' : ''}`}
      onClick={() => {
        if (!isEditing) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Définition du calque actif : ${layer.id} (${layer.name})`);
          }
          onLayerSelect(layer.id);
        }
      }}
    >
      {isEditing ? (
        <div className="flex items-center space-x-2 w-full">
          <Input
            value={editLayerName}
            onChange={(e) => onEditLayerName(e.target.value)}
            className="h-8 w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveLayerName();
              } else if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label="Nom du calque"
          />
          <button
            onClick={withStopPropagation(onSaveLayerName)}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Valider le nom du calque"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <LayerInfo
            name={layer.name}
            visible={layer.visible}
            locked={layer.locked}
            objectCount={layer.objects?.length || 0}
          />
          <LayerActionButtons
            layerId={layer.id}
            visible={layer.visible}
            locked={layer.locked}
            onEdit={startEditLayerName}
            onToggleVisibility={toggleLayerVisibility}
            onToggleLock={toggleLayerLock}
            onRemove={removeLayer}
            layerName={layer.name}
          />
        </>
      )}
    </DropdownMenuItem>
  );
};
