
import React from 'react';
import { Layer } from '../hooks/useLayerManager';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Layers, Eye, EyeOff, Lock, Unlock, Edit, Check, Trash } from "lucide-react";

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
  setEditLayerName
}) => {
  const handleAddLayer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Adding new layer");
    addLayer();
  };

  // Get the active layer
  const activeLayer = layers.find(layer => layer.id === activeLayerId);

  return (
    <div className="mb-2 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            <Layers className="mr-2 h-4 w-4" />
            <span>{activeLayer?.name || "Calque"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[280px] bg-white z-50">
            {layers.map((layer) => (
              <DropdownMenuItem
                key={layer.id}
                className={`flex items-center justify-between p-2 ${layer.id === activeLayerId ? 'bg-accent' : ''}`}
                onClick={() => layer.id !== editingLayerId && setActiveLayerId(layer.id)}
              >
                {editingLayerId === layer.id ? (
                  <div className="flex items-center space-x-2 w-full">
                    <Input 
                      value={editLayerName} 
                      onChange={(e) => setEditLayerName(e.target.value)}
                      className="h-8 w-full"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveLayerName();
                        } else if (e.key === 'Escape') {
                          setEditLayerName("");
                          startEditLayerName("", "");
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        saveLayerName();
                      }}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center">
                      {layer.visible ? 
                        <Eye className="h-4 w-4 mr-2" /> : 
                        <EyeOff className="h-4 w-4 mr-2 text-gray-400" />
                      }
                      {layer.locked ? 
                        <Lock className="h-4 w-4 mr-2" /> : 
                        <Unlock className="h-4 w-4 mr-2 text-gray-400" />
                      }
                      <span>{layer.name}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        ({layer.objects?.length || 0})
                      </span>
                    </div>
                    <div className="ml-2 space-x-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditLayerName(layer.id, layer.name);
                        }}
                        className="text-xs px-1 py-0.5 hover:bg-gray-100 rounded"
                        title="Renommer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerVisibility(layer.id);
                        }}
                        className="text-xs px-1 py-0.5 hover:bg-gray-100 rounded"
                        title={layer.visible ? 'Masquer' : 'Afficher'}
                      >
                        {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerLock(layer.id);
                        }}
                        className="text-xs px-1 py-0.5 hover:bg-gray-100 rounded"
                        title={layer.locked ? 'Déverrouiller' : 'Verrouiller'}
                      >
                        {layer.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLayer(layer.id);
                        }}
                        className="text-xs text-red-500 px-1 py-0.5 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={handleAddLayer} className="text-green-600 p-2">
              + Nouveau calque
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
