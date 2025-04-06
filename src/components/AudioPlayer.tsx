
import React, { useState, useEffect } from 'react';
import { Volume2, X, Volume1, Volume } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioWaveAnimation from '@/components/AudioWaveAnimation';

interface AudioPlayerProps {
  onLeave: () => void;
  broadcaster: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ onLeave, broadcaster }) => {
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    updateAudioVolume(newVolume, muted);
  };
  
  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    updateAudioVolume(volume, newMuted);
  };
  
  const increaseVolume = () => {
    const newVolume = Math.min(1, volume + 0.1);
    setVolume(newVolume);
    updateAudioVolume(newVolume, muted);
  };
  
  const decreaseVolume = () => {
    const newVolume = Math.max(0, volume - 0.1);
    setVolume(newVolume);
    updateAudioVolume(newVolume, muted);
  };
  
  const updateAudioVolume = (vol: number, isMuted: boolean) => {
    // Find all audio elements and set their volume
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.volume = vol;
      audio.muted = isMuted;
    });
  };
  
  // Ensure volume settings are applied when component mounts
  useEffect(() => {
    updateAudioVolume(volume, muted);
  }, []);
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-audio-primary text-white p-4 flex items-center justify-between z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Volume2 size={20} />
          <AudioWaveAnimation isActive={!muted} className="h-5" />
        </div>
        <div>
          <p className="text-sm font-medium">Listening to {broadcaster}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 mr-2">
          <Button 
            onClick={toggleMute} 
            variant="ghost"
            size="icon" 
            className="h-8 w-8 rounded-full hover:bg-white/20"
          >
            {muted ? <Volume2 size={16} /> : <Volume2 size={16} />}
          </Button>
          
          <Button
            onClick={decreaseVolume}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-white/20"
          >
            <Volume size={16} />
          </Button>
          
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer"
          />
          
          <Button
            onClick={increaseVolume}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-white/20"
          >
            <Volume2 size={16} />
          </Button>
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
