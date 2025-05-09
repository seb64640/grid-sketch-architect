
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
    <div className="flex items-center w-full pointer-events-auto">
      {visible ?
        <Eye className="h-4 w-4 mr-2 pointer-events-none" /> :
        <EyeOff className="h-4 w-4 mr-2 text-gray-400 pointer-events-none" />
      }
      {locked ?
        <Lock className="h-4 w-4 mr-2 pointer-events-none" /> :
        <Unlock className="h-4 w-4 mr-2 text-gray-400 pointer-events-none" />
      }
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
      <span className="ml-2 text-xs text-gray-400">
        ({objectCount || 0})
      </span>
    </div>
  );
};
