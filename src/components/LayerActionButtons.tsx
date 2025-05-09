
import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Edit, Trash } from "lucide-react";

interface LayerActionButtonsProps {
  layerId: string;
  visible: boolean;
  locked: boolean;
  onEdit: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemove: (id: string) => void;
  layerName: string;
}

export const LayerActionButtons: React.FC<LayerActionButtonsProps> = ({
  layerId,
  visible,
  locked,
  onEdit,
  onToggleVisibility,
  onToggleLock,
  onRemove,
  layerName
}) => {
  const withStopPropagation = (handler: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler();
  };

  return (
    <div className="ml-2 space-x-1">
      <button
        onClick={withStopPropagation(() => onEdit(layerId, layerName))}
        className="text-xs px-1 py-0.5 hover:bg-gray-100 rounded"
        title="Renommer"
        aria-label="Renommer le calque"
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        onClick={withStopPropagation(() => onToggleVisibility(layerId))}
        className="text-xs px-1 py-0.5 hover:bg-gray-100 rounded"
        title={visible ? 'Masquer' : 'Afficher'}
        aria-label={visible ? 'Masquer le calque' : 'Afficher le calque'}
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button
        onClick={withStopPropagation(() => onToggleLock(layerId))}
        className="text-xs px-1 py-0.5 hover:bg-gray-100 rounded"
        title={locked ? 'Déverrouiller' : 'Verrouiller'}
        aria-label={locked ? 'Déverrouiller le calque' : 'Verrouiller le calque'}
      >
        {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      </button>
      <button
        onClick={withStopPropagation(() => onRemove(layerId))}
        className="text-xs text-red-500 px-1 py-0.5 hover:bg-red-50 rounded"
        title="Supprimer"
        aria-label="Supprimer le calque"
      >
        <Trash className="h-4 w-4" />
      </button>
    </div>
  );
};
