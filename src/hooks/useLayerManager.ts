
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: any[]; // Fabric.js objects
}

export const useLayerManager = () => {
  // Layers management - Initialize with a default layer
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: "layer-1",
      name: "Calque 1",
      visible: true,
      locked: false,
      objects: []
    }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>("layer-1");
  
  // Layer being edited state
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editLayerName, setEditLayerName] = useState("");
  
  // Reference to track if we're currently updating layers to avoid loops
  const isUpdatingRef = useRef(false);

  // Helper function to generate unique layer name
  const generateUniqueLayerName = useCallback(() => {
    // Get all existing layer numbers from names like "Calque X"
    const existingNumbers = layers.map(layer => {
      const match = layer.name.match(/Calque\s+(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    });

    // Find the highest number
    const highestNumber = Math.max(...existingNumbers, 0);
    
    // Return the next number in sequence
    return `Calque ${highestNumber + 1}`;
  }, [layers]);

  // Layer management functions
  const addLayer = useCallback(() => {
    const newLayerId = `layer-${Date.now()}`; // Using timestamp to ensure unique IDs
    const newLayerName = generateUniqueLayerName();
    
    // Create a new layer
    const newLayer: Layer = {
      id: newLayerId,
      name: newLayerName,
      visible: true,
      locked: false,
      objects: [] // Initialize with empty objects array
    };
    
    // Add the layer directly
    setLayers(prevLayers => {
      const updatedLayers = [...prevLayers, newLayer];
      console.log("Layers after adding new layer:", JSON.stringify(updatedLayers.map(l => l.id)));
      return updatedLayers;
    });

    // Set as active layer
    setActiveLayerId(newLayerId);
    
    console.log("New layer added:", newLayerId, newLayerName);
    toast(`Nouveau calque: ${newLayerName}`);
    
    return newLayerId; // Return the ID for immediate use if needed
  }, [generateUniqueLayerName]);

  const removeLayer = useCallback((layerId: string) => {
    // Don't allow removing the last layer
    if (layers.length <= 1) {
      toast.error("Impossible de supprimer le dernier calque");
      return;
    }
    
    setLayers(prevLayers => {
      const updatedLayers = prevLayers.filter(layer => layer.id !== layerId);
      console.log("Layers after removal:", JSON.stringify(updatedLayers.map(l => l.id)));
      return updatedLayers;
    });
    
    // If active layer was removed, select another one
    setActiveLayerId(prev => {
      if (prev === layerId) {
        // Find first available layer
        const firstAvailableLayer = layers.find(l => l.id !== layerId);
        const newActiveId = firstAvailableLayer?.id || layers[0].id;
        console.log("Active layer was removed, new active layer:", newActiveId);
        return newActiveId;
      }
      return prev;
    });
    
    const targetLayer = layers.find(layer => layer.id === layerId);
    toast(`Calque ${targetLayer?.name || ''} supprimé`);
  }, [layers]);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    const targetLayer = layers.find(layer => layer.id === layerId);
    const newVisibility = targetLayer ? !targetLayer.visible : true;
    
    console.log(`Toggling visibility for layer ${layerId} to ${newVisibility}`, 
      targetLayer ? `(${targetLayer.name})` : '(layer not found)');
    
    setLayers(prevLayers => {
      const updatedLayers = prevLayers.map(layer => {
        if (layer.id === layerId) {
          return {
            ...layer,
            visible: newVisibility
          };
        }
        return layer;
      });
      
      console.log("Layers after visibility toggle:", 
        JSON.stringify(updatedLayers.map(l => ({id: l.id, visible: l.visible}))));
      
      return updatedLayers;
    });
    
    if (targetLayer) {
      toast(`Calque ${targetLayer.name} ${newVisibility ? "visible" : "masqué"}`);
    }
  }, [layers]);

  const toggleLayerLock = useCallback((layerId: string) => {
    const targetLayer = layers.find(layer => layer.id === layerId);
    const newLockState = targetLayer ? !targetLayer.locked : false;
    
    console.log(`Toggling lock for layer ${layerId} to ${newLockState}`, 
      targetLayer ? `(${targetLayer.name})` : '(layer not found)');
    
    setLayers(prevLayers => {
      const updatedLayers = prevLayers.map(layer => {
        if (layer.id === layerId) {
          return {
            ...layer,
            locked: newLockState
          };
        }
        return layer;
      });
      
      console.log("Layers after lock toggle:", 
        JSON.stringify(updatedLayers.map(l => ({id: l.id, locked: l.locked}))));
      
      return updatedLayers;
    });
    
    if (targetLayer) {
      toast(`Calque ${targetLayer.name} ${newLockState ? "verrouillé" : "déverrouillé"}`);
    }
  }, [layers]);

  // Start editing a layer name
  const startEditLayerName = useCallback((layerId: string, currentName: string) => {
    console.log(`Starting edit of layer name: ${layerId} (${currentName})`);
    setEditingLayerId(layerId);
    setEditLayerName(currentName);
  }, []);

  // Save edited layer name
  const saveLayerName = useCallback(() => {
    if (!editingLayerId || editLayerName.trim() === "") {
      console.log("Cannot save layer name: no editing ID or empty name");
      setEditingLayerId(null);
      return;
    }

    // Ensure the name is unique if it's in the format "Calque X"
    let finalName = editLayerName.trim();
    const isDefaultFormat = /^Calque\s+\d+$/i.test(finalName);
    
    if (isDefaultFormat) {
      // If it's using the default "Calque X" format, ensure uniqueness
      let nameIsUnique = layers.every(layer => 
        layer.id === editingLayerId || layer.name !== finalName
      );
      
      if (!nameIsUnique) {
        // If not unique, generate a new unique name
        finalName = generateUniqueLayerName();
        console.log(`Name not unique, generated new name: ${finalName}`);
      }
    }

    console.log(`Saving layer name for ${editingLayerId}: ${finalName}`);
    renameLayer(editingLayerId, finalName);
    setEditingLayerId(null);
    setEditLayerName("");
  }, [editingLayerId, editLayerName, layers, generateUniqueLayerName]);

  const renameLayer = useCallback((layerId: string, newName: string) => {
    setLayers(prevLayers => {
      const updatedLayers = prevLayers.map(layer => {
        if (layer.id === layerId) {
          return {
            ...layer,
            name: newName
          };
        }
        return layer;
      });
      
      console.log("Layers after rename:", 
        JSON.stringify(updatedLayers.map(l => ({id: l.id, name: l.name}))));
      
      return updatedLayers;
    });
    
    toast(`Calque renommé en: ${newName}`);
  }, []);

  // Debugging effects
  useEffect(() => {
    console.log("Active layer changed to:", activeLayerId);
    console.log("Current layers:", JSON.stringify(layers.map(l => ({
      id: l.id,
      name: l.name,
      objectCount: l.objects?.length || 0,
      visible: l.visible
    }))));
  }, [activeLayerId, layers]);

  // Update layer objects with safety checks
  const updateLayerObjects = useCallback((layerId: string, objects: any[]) => {
    // Prevent recursive updates
    if (isUpdatingRef.current) {
      console.log("Preventing recursive update of layer objects");
      return;
    }
    
    // Find the layer to update
    const layerExists = layers.some(layer => layer.id === layerId);
    if (!layerExists) {
      console.warn(`Attempted to update objects for non-existent layer: ${layerId}`);
      return;
    }
    
    console.log(`Updating objects for layer ${layerId}, count: ${objects.length}`);
    
    isUpdatingRef.current = true;
    
    setLayers(prevLayers => {
      const updatedLayers = prevLayers.map(layer => {
        if (layer.id === layerId) {
          return {
            ...layer,
            objects: [...objects] // Create a new array to ensure proper state update
          };
        }
        return layer;
      });
      
      // Log the update for debugging
      const updatedLayer = updatedLayers.find(l => l.id === layerId);
      console.log(`Layer ${layerId} updated, objects count now: ${updatedLayer?.objects.length || 0}`);
      
      return updatedLayers;
    });
    
    // Allow updates again after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 10);
  }, [layers]);

  // Get a specific layer by ID
  const getLayerById = useCallback((layerId: string) => {
    return layers.find(layer => layer.id === layerId);
  }, [layers]);

  // Get currently active layer
  const getActiveLayer = useCallback(() => {
    return layers.find(layer => layer.id === activeLayerId);
  }, [layers, activeLayerId]);

  return {
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    editingLayerId,
    editLayerName,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    startEditLayerName,
    saveLayerName,
    setEditLayerName,
    updateLayerObjects,
    getLayerById,
    getActiveLayer
  };
};
