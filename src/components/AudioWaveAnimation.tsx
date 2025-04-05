
import React from 'react';
import { cn } from '@/lib/utils';

interface AudioWaveAnimationProps {
  isActive: boolean;
  className?: string;
}

const AudioWaveAnimation = ({ isActive, className }: AudioWaveAnimationProps) => {
  if (!isActive) return null;
  
  return (
    <div className={cn("flex items-center justify-center gap-0.5 h-4", className)}>
      <div className="w-0.5 h-full bg-audio-primary animate-wave-1 rounded-full"></div>
      <div className="w-0.5 h-full bg-audio-primary animate-wave-2 rounded-full"></div>
      <div className="w-0.5 h-full bg-audio-primary animate-wave-3 rounded-full"></div>
      <div className="w-0.5 h-full bg-audio-primary animate-wave-4 rounded-full"></div>
    </div>
  );
};

export default AudioWaveAnimation;
