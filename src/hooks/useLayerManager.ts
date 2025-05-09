
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
  const isUpdatingRef = useRef<boolean>(false);

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
    
    // Create a new layer with empty objects array
    const newLayer: Layer = {
      id: newLayerId,
      name: newLayerName,
      visible: true,
      locked: false,
      objects: [] 
    };
    
    // Add the layer and set it as active
    setLayers(prevLayers => {
      console.log("Adding new layer. Previous layers:", prevLayers.length, "New layer ID:", newLayerId);
      return [...prevLayers, newLayer];
    });
    setActiveLayerId(newLayerId);
    
    console.log("New layer added:", newLayerId, newLayerName);
    toast(`Nouveau calque: ${newLayerName}`);
    
    return newLayerId;
  }, [generateUniqueLayerName]);

  const removeLayer = useCallback((layerId: string) => {
    // Don't allow removing the last layer
    if (layers.length <= 1) {
      toast.error("Impossible de supprimer le dernier calque");
      return;
    }
    
    // Find another layer to activate if the current one is being removed
    let newActiveId = activeLayerId;
    if (activeLayerId === layerId) {
      const remainingLayers = layers.filter(l => l.id !== layerId);
      newActiveId = remainingLayers[0]?.id || "";
    }
    
    // Update the active layer first if needed
    if (newActiveId !== activeLayerId) {
      setActiveLayerId(newActiveId);
    }
    
    // Then remove the layer
    setLayers(prevLayers => {
      const filtered = prevLayers.filter(layer => layer.id !== layerId);
      console.log(`Removing layer ${layerId}. Layers count: before=${prevLayers.length}, after=${filtered.length}`);
      return filtered;
    });
    
    const targetLayer = layers.find(layer => layer.id === layerId);
    toast(`Calque ${targetLayer?.name || ''} supprimé`);
  }, [layers, activeLayerId]);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    const targetLayer = layers.find(layer => layer.id === layerId);
    if (!targetLayer) {
      console.error(`Layer not found: ${layerId}`);
      return;
    }
    
    const newVisibility = !targetLayer.visible;
    console.log(`Toggling visibility for layer ${layerId} to ${newVisibility} (${targetLayer.name})`);
    
    setLayers(prevLayers => prevLayers.map(layer => 
      layer.id === layerId ? { ...layer, visible: newVisibility } : layer
    ));
    
    toast(`Calque ${targetLayer.name} ${newVisibility ? "visible" : "masqué"}`);
  }, [layers]);

  const toggleLayerLock = useCallback((layerId: string) => {
    const targetLayer = layers.find(layer => layer.id === layerId);
    if (!targetLayer) {
      console.error(`Layer not found: ${layerId}`);
      return;
    }
    
    const newLockState = !targetLayer.locked;
    console.log(`Toggling lock for layer ${layerId} to ${newLockState} (${targetLayer.name})`);
    
    // Si le calque est le calque actif et qu'on le verrouille, mettons en évidence la contrainte
    if (layerId === activeLayerId && newLockState) {
      toast.warning(`Attention: Calque actif ${targetLayer.name} verrouillé - vous ne pourrez pas dessiner dessus`);
    } else {
      toast(`Calque ${targetLayer.name} ${newLockState ? "verrouillé" : "déverrouillé"}`);
    }
    
    setLayers(prevLayers => prevLayers.map(layer => 
      layer.id === layerId ? { ...layer, locked: newLockState } : layer
    ));
  }, [layers, activeLayerId]);

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
    
    setLayers(prevLayers => prevLayers.map(layer => 
      layer.id === editingLayerId ? { ...layer, name: finalName } : layer
    ));
    
    toast(`Calque renommé en: ${finalName}`);
    setEditingLayerId(null);
    setEditLayerName("");
  }, [editingLayerId, editLayerName, layers, generateUniqueLayerName]);

  // Nouvelle version améliorée pour update les objets d'un calque avec une meilleure gestion des erreurs
  const updateLayerObjects = useCallback((layerId: string, objects: any[]) => {
    // Avoid cascade updates
    if (isUpdatingRef.current) {
      console.log("Skipping recursive updateLayerObjects call");
      return;
    }

    isUpdatingRef.current = true;
    
    console.log(`Updating objects for layer ${layerId}, count: ${objects.length}`);
    
    // Vérification de base pour les objets
    if (!Array.isArray(objects)) {
      console.error("updateLayerObjects called with non-array objects parameter");
      isUpdatingRef.current = false;
      return;
    }
    
    // S'assurer que tous les objets sont définis et qu'ils ont un set ou sont de simples objets JSON
    const validObjects = objects.filter(obj => obj !== null && obj !== undefined);
    
    if (validObjects.length !== objects.length) {
      console.warn(`Filtered out ${objects.length - validObjects.length} invalid objects`);
    }
    
    setLayers(prevLayers => {
      try {
        // Find the layer to update
        const layerIndex = prevLayers.findIndex(layer => layer.id === layerId);
        
        // Si le calque n'existe pas, retournez l'état inchangé
        if (layerIndex === -1) {
          console.error(`Attempted to update objects for non-existent layer: ${layerId}`);
          return prevLayers;
        }
        
        // Create a deep copy of the layers array
        const updatedLayers = [...prevLayers];
        
        // Update objects of the specific layer - Utiliser une copie des objets pour éviter les références partagées
        updatedLayers[layerIndex] = {
          ...updatedLayers[layerIndex],
          objects: [...validObjects]  // Utiliser les objets filtrés valides
        };
        
        console.log(`Layer ${layerId} updated, objects count now: ${validObjects.length}`);
        console.log(`Total layers after update: ${updatedLayers.length}`);
        
        // IMPORTANT: Return a new reference of the entire array
        return updatedLayers;
      } catch (error) {
        console.error("Error in updateLayerObjects:", error);
        return prevLayers;
      }
    });

    // Reset flag after update, with a short timeout pour laisser le rendu se terminer
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 50);
  }, []);

  // Get a specific layer by ID
  const getLayerById = useCallback((layerId: string) => {
    return layers.find(layer => layer.id === layerId);
  }, [layers]);

  // Get currently active layer
  const getActiveLayer = useCallback(() => {
    return layers.find(layer => layer.id === activeLayerId);
  }, [layers, activeLayerId]);
  
  // Log state changes for debugging
  useEffect(() => {
    console.log("Active layer changed to:", activeLayerId);
    console.log("Current layers:", layers.map(l => ({
      id: l.id,
      name: l.name,
      objectCount: l.objects?.length || 0,
      visible: l.visible,
      locked: l.locked
    })));
  }, [activeLayerId, layers]);

  // Expose an explicitly named method to check if a layer is locked or not
  const isLayerLocked = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    return layer?.locked || false;
  }, [layers]);

  // Expose an explicitly named method to check if active layer is locked
  const isActiveLayerLocked = useCallback(() => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    return activeLayer?.locked || false;
  }, [layers, activeLayerId]);

  return {
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    editingLayerId,
    setEditingLayerId,
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
    getActiveLayer,
    isLayerLocked,
    isActiveLayerLocked
  };
};

