import { useState, useCallback, useEffect } from 'react';
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
    
    // Create a new layer without changing visibility of existing layers
    const newLayer: Layer = {
      id: newLayerId,
      name: newLayerName,
      visible: true,
      locked: false,
      objects: [] // Initialize with empty objects array
    };
    
    // Important: We need to preserve the exact objects references in the existing layers
    setLayers(prevLayers => {
      // Deep log of the layer content to debug
      console.log("Adding new layer. Current layers objects count:", prevLayers.map(l => ({
        id: l.id,
        name: l.name,
        objectCount: l.objects?.length || 0
      })));
      
      // We need to create a new array but keep the existing layer objects references intact
      return [...prevLayers, newLayer];
    });
    
    // Update the active layer id AFTER setting layers to ensure the state is updated correctly
    setTimeout(() => {
      setActiveLayerId(newLayerId);
      console.log("Active layer changed to:", newLayerId);
    }, 10);
    
    toast(`Nouveau calque: ${newLayer.name}`);
  }, [generateUniqueLayerName]);

  const removeLayer = useCallback((layerId: string) => {
    // Don't allow removing the last layer
    if (layers.length <= 1) {
      toast.error("Impossible de supprimer le dernier calque");
      return;
    }
    
    const updatedLayers = layers.filter(layer => layer.id !== layerId);
    setLayers(updatedLayers);
    
    // If active layer was removed, select another one
    if (activeLayerId === layerId) {
      setActiveLayerId(updatedLayers[0].id);
    }
    
    toast("Calque supprimé");
  }, [layers, activeLayerId]);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prevLayers => prevLayers.map(layer => {
      if (layer.id === layerId) {
        const newVisibility = !layer.visible;
        console.log(`Toggling visibility for layer ${layer.name} (${layer.id}) to ${newVisibility}`);
        return {
          ...layer,
          visible: newVisibility
        };
      }
      return layer;
    }));
    
    const targetLayer = layers.find(layer => layer.id === layerId);
    toast(`Calque ${targetLayer?.name} ${targetLayer?.visible ? "masqué" : "visible"}`);
  }, [layers]);

  const toggleLayerLock = useCallback((layerId: string) => {
    setLayers(prevLayers => prevLayers.map(layer => {
      if (layer.id === layerId) {
        const newLockState = !layer.locked;
        console.log(`Toggling lock for layer ${layer.name} (${layer.id}) to ${newLockState}`);
        return {
          ...layer,
          locked: newLockState
        };
      }
      return layer;
    }));
    
    const targetLayer = layers.find(layer => layer.id === layerId);
    toast(`Calque ${targetLayer?.name} ${targetLayer?.locked ? "déverrouillé" : "verrouillé"}`);
  }, [layers]);

  // Start editing a layer name
  const startEditLayerName = useCallback((layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditLayerName(currentName);
  }, []);

  // Save edited layer name
  const saveLayerName = useCallback(() => {
    if (!editingLayerId || editLayerName.trim() === "") {
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
      }
    }

    renameLayer(editingLayerId, finalName);
    setEditingLayerId(null);
    setEditLayerName("");
  }, [editingLayerId, editLayerName, layers, generateUniqueLayerName]);

  const renameLayer = useCallback((layerId: string, newName: string) => {
    setLayers(prevLayers => prevLayers.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          name: newName
        };
      }
      return layer;
    }));
    
    toast(`Calque renommé en: ${newName}`);
  }, []);

  // Debugging effects
  useEffect(() => {
    console.log("Active layer changed to:", activeLayerId);
    console.log("Current layers:", layers);
  }, [activeLayerId, layers]);

  // Add a useEffect to track layer object changes
  useEffect(() => {
    console.log("Layers state updated - objects per layer:",
      layers.map(layer => ({
        id: layer.id, 
        name: layer.name,
        objectCount: layer.objects?.length || 0,
        visible: layer.visible,
        locked: layer.locked
      }))
    );
  }, [layers]);

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
    setEditLayerName
  };
};
