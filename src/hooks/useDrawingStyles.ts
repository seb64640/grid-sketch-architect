
import { useState } from 'react';

export const useDrawingStyles = () => {
  // Style settings
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("rgba(200, 200, 255, 0.1)");
  
  return {
    strokeWidth,
    setStrokeWidth,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor
  };
};
