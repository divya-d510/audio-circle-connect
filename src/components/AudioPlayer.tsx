
import React, { useState, useEffect } from 'react';
import { Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioWaveAnimation from '@/components/AudioWaveAnimation';

interface AudioPlayerProps {
  onLeave: () => void;
  broadcaster: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ onLeave, broadcaster }) => {
  const [volume, setVolume] = useState(0.8);
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    // Find all audio elements and set their volume
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.volume = newVolume;
    });
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-audio-primary text-white p-4 flex items-center justify-between z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Volume2 size={20} />
          <AudioWaveAnimation isActive={true} className="h-5" />
        </div>
        <div>
          <p className="text-sm font-medium">Listening to {broadcaster}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 mr-2">
          <span className="text-xs">Volume</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <Button 
          onClick={onLeave}
          variant="ghost"
          className="border border-white/30 hover:bg-white/20 text-white"
          size="sm"
        >
          <X size={16} className="mr-1" /> Leave
        </Button>
      </div>
    </div>
  );
};

export default AudioPlayer;
