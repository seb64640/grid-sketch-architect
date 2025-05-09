
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export const useGridSettings = () => {
  // Grid settings
  const [gridVisible, setGridVisible] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [gridDensity, setGridDensity] = useState(20);
  
  const toggleGridVisibility = useCallback(() => {
    setGridVisible(!gridVisible);
    toast(gridVisible ? "Grille masquée" : "Grille visible");
  }, [gridVisible]);

  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid(!snapToGrid);
    toast(snapToGrid ? "Alignement désactivé" : "Alignement activé");
  }, [snapToGrid]);

  return {
    gridVisible,
    setGridVisible,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    setGridSize,
    gridDensity,
    setGridDensity,
    toggleGridVisibility,
    toggleSnapToGrid
  };
};
