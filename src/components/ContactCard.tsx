
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Headphones, Mic, MicOff, User, Volume, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Contact } from '@/types/contact';
import AudioWaveAnimation from '@/components/AudioWaveAnimation';

interface ContactCardProps {
  contact: Contact;
  isCurrentUser?: boolean;
  onJoin?: (contactId: string) => void;
  onBroadcast?: () => void;
  isBroadcasting?: boolean;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  isCurrentUser = false,
  onJoin,
  onBroadcast,
  isBroadcasting = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    if (contact.listeners && contact.listeners.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  const hasListeners = contact.listeners && contact.listeners.length > 0;
  
  return (
    <div className="w-full mb-3">
      <Card className={cn(
        "p-3 transition-all",
        isCurrentUser ? "border-2 border-audio-primary bg-audio-light dark:bg-audio-dark" : "",
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={cn(
                "w-10 h-10 rounded-full bg-muted flex items-center justify-center",
                contact.isBroadcasting ? "bg-audio-primary text-white" : ""
              )}>
                {contact.isBroadcasting ? <Mic size={18} /> : <User size={18} />}
              </div>
              {contact.isBroadcasting && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse-audio"></div>
              )}
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{contact.name}</span>
                {contact.isBroadcasting && <AudioWaveAnimation isActive={true} />}
              </div>
              <span className="text-xs text-muted-foreground">
                {contact.isBroadcasting 
                  ? `Broadcasting to ${contact.listeners?.length || 0} listeners` 
                  : 'Not broadcasting'}
              </span>
            </div>
          </div>
          
          {isCurrentUser ? (
            <Button 
              onClick={onBroadcast}
              variant={isBroadcasting ? "destructive" : "default"}
              className={isBroadcasting ? "" : "bg-audio-primary hover:bg-audio-secondary"}
            >
              {isBroadcasting ? (
                <>
                  <MicOff className="mr-1 h-4 w-4" /> Stop
                </>
              ) : (
                <>
                  <Mic className="mr-1 h-4 w-4" /> Broadcast
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {contact.isBroadcasting && (
                <Button 
                  onClick={() => onJoin?.(contact.id)}
                  variant="outline"
                  size="sm"
                  className="bg-audio-light hover:bg-audio-light/80 text-audio-primary border-audio-primary"
                >
                  <Headphones className="mr-1 h-4 w-4" /> Join
                </Button>
              )}
              
              {hasListeners && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleExpand}
                >
                  {isExpanded ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Listeners section */}
        {isExpanded && hasListeners && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Listeners</p>
            <div className="space-y-2">
              {contact.listeners?.map((listener) => (
                <div key={listener.id} className="flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Headphones size={14} />
                  </div>
                  <span>{listener.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ContactCard;
