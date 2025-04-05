
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Headphones, Mic, MicOff, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Contact } from '@/types/contact';
import AudioWaveAnimation from '@/components/AudioWaveAnimation';
import { Switch } from '@/components/ui/switch';

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
    <div className="w-full mb-3 transition-all">
      <Card className={cn(
        "p-4 transition-all shadow-sm hover:shadow-md",
        isCurrentUser ? "border-2 border-audio-primary bg-audio-light/50 dark:bg-audio-dark/50" : "",
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                contact.isBroadcasting 
                  ? "bg-audio-primary text-white shadow-lg" 
                  : "bg-muted"
              )}>
                {contact.isBroadcasting ? <Mic size={20} /> : <User size={20} />}
              </div>
              {contact.isBroadcasting && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse-audio"></div>
              )}
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-lg">{contact.name}</span>
                {contact.isBroadcasting && <AudioWaveAnimation isActive={true} />}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {contact.isBroadcasting 
                    ? `Broadcasting to ${contact.listeners?.length || 0} listener${contact.listeners?.length !== 1 ? 's' : ''}` 
                    : 'Not broadcasting'}
                </span>
                {contact.phoneNumber && (
                  <span className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Phone size={12} /> {contact.phoneNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {isCurrentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium mr-1">Broadcast</span>
              <Switch 
                checked={isBroadcasting}
                onCheckedChange={onBroadcast}
              />
              <Button 
                onClick={onBroadcast}
                variant={isBroadcasting ? "destructive" : "default"}
                className={isBroadcasting 
                  ? "" 
                  : "bg-audio-primary hover:bg-audio-secondary"}
                size="sm"
              >
                {isBroadcasting ? (
                  <>
                    <MicOff className="mr-1 h-4 w-4" /> Stop
                  </>
                ) : (
                  <>
                    <Mic className="mr-1 h-4 w-4" /> Start
                  </>
                )}
              </Button>
            </div>
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
                  className="rounded-full h-8 w-8 p-0"
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
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Listeners</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {contact.listeners?.map((listener) => (
                <div key={listener.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md">
                  <div className="w-7 h-7 rounded-full bg-audio-light/80 text-audio-primary flex items-center justify-center">
                    <Headphones size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span>{listener.name}</span>
                    {listener.phoneNumber && (
                      <span className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Phone size={10} /> {listener.phoneNumber}
                      </span>
                    )}
                  </div>
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
