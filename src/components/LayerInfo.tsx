
import React from 'react';
import { Eye, EyeOff, Lock, Unlock } from "lucide-react";

interface LayerInfoProps {
  name: string;
  visible: boolean;
  locked: boolean;
  objectCount: number;
}

export const LayerInfo: React.FC<LayerInfoProps> = ({
  name,
  visible,
  locked,
  objectCount
}) => {
  return (
    <div className="flex items-center">
      {visible ?
        <Eye className="h-4 w-4 mr-2" /> :
        <EyeOff className="h-4 w-4 mr-2 text-gray-400" />
      }
      {locked ?
        <Lock className="h-4 w-4 mr-2" /> :
        <Unlock className="h-4 w-4 mr-2 text-gray-400" />
      }
      <span>{name}</span>
      <span className="ml-2 text-xs text-gray-400">
        ({objectCount || 0})
      </span>
    </div>
  );
};
