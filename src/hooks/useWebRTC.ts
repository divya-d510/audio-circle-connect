
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { WebRTCService, getWebRTCService, resetWebRTCService } from '@/services/webRTCService';
import { toast } from "@/components/ui/use-toast";
import { Contact, Listener } from '@/types/contact';
import { Broadcast, ListenerRecord } from '@/types/supabase';

export function useWebRTC() {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentBroadcaster, setCurrentBroadcaster] = useState<string | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // Generate a mock phone number for demo purposes
  const generatePhoneNumber = () => {
    return `+1${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 9000 + 1000)}`;
  };
  
  const userId = useState(() => uuidv4())[0];
  const username = useState(() => `User-${userId.substring(0, 5)}`)[0];
  const phoneNumber = useState(() => generatePhoneNumber())[0];
  
  const initializeWebRTC = useCallback((): WebRTCService => {
    const service = getWebRTCService(userId, username);
    
    service.setOnListenerConnected((listenerId) => {
      console.log(`Listener connected: ${listenerId}`);
      fetchCurrentBroadcastListeners();
    });
    
    service.setOnListenerDisconnected((listenerId) => {
      console.log(`Listener disconnected: ${listenerId}`);
      fetchCurrentBroadcastListeners();
    });
    
    service.setOnBroadcasterStream((broadcasterId, stream) => {
      console.log(`Got stream from broadcaster: ${broadcasterId}`, stream);
      
      // Create audio element and play it
      const audioElement = new Audio();
      audioElement.srcObject = stream;
      audioElement.autoplay = true;
      
      // Make sure audio is unmuted and volume is up
      audioElement.muted = false;
      audioElement.volume = 1.0;
      
      // Force audio play (sometimes needed on mobile)
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playback started successfully');
          })
          .catch(error => {
            console.error('Audio playback was prevented:', error);
            // Try again after user interaction
            const userInteracted = () => {
              audioElement.play();
              document.removeEventListener('click', userInteracted);
            };
            document.addEventListener('click', userInteracted);
            
            toast({
              title: "Audio playback issue",
              description: "Please click anywhere on the screen to enable audio",
            });
          });
      }
    });
    
    return service;
  }, [userId, username]);
  
  const fetchActiveBroadcasts = useCallback(async () => {
    try {
      const { data: broadcasts } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('active', true);
      
      if (!broadcasts) return [];
      
      const contactsData: Contact[] = broadcasts.map((broadcast: Broadcast) => ({
        id: broadcast.user_id,
        name: broadcast.username,
        isBroadcasting: broadcast.active,
        listeners: [],
        roomId: broadcast.room_id,
        phoneNumber: generatePhoneNumber()
      }));
      
      for (const contact of contactsData) {
        const { data: listeners } = await supabase
          .from('listeners')
          .select('*')
          .eq('broadcaster_id', contact.id);
        
        if (listeners && listeners.length > 0) {
          contact.listeners = listeners.map((listener: ListenerRecord) => ({
            id: listener.user_id,
            name: listener.username,
            phoneNumber: generatePhoneNumber()
          }));
        }
      }
      
      const filteredContacts = contactsData.filter(contact => contact.id !== userId);
      setContacts(filteredContacts);
      return filteredContacts;
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      return [];
    }
  }, [userId]);
  
  const fetchCurrentBroadcastListeners = useCallback(async () => {
    if (!isBroadcasting) return;
    
    try {
      const { data: listeners } = await supabase
        .from('listeners')
        .select('*')
        .eq('broadcaster_id', userId);
      
      if (listeners) {
        const listenersList: Listener[] = listeners.map((listener: ListenerRecord) => ({
          id: listener.user_id,
          name: listener.username,
          phoneNumber: generatePhoneNumber()
        }));
        
        setContacts(prev => {
          const updatedContacts = [...prev];
          return updatedContacts;
        });
      }
    } catch (error) {
      console.error('Error fetching listeners:', error);
    }
  }, [isBroadcasting, userId]);
  
  // Define leaveBroadcast function before it's used in useEffect
  const leaveBroadcast = useCallback(async () => {
    if (!isListening || !currentBroadcaster) return false;
    
    try {
      const webRTC = initializeWebRTC();
      await webRTC.leaveBroadcast(currentBroadcaster);
      
      setIsListening(false);
      setCurrentBroadcaster(null);
      setCurrentRoomId(null);
      
      toast({
        title: "Left broadcast",
        description: "You are no longer listening",
      });
      
      console.log("Left broadcast");
      return true;
    } catch (error) {
      console.error("Error leaving broadcast:", error);
      toast({
        title: "Error",
        description: "Failed to leave broadcast",
        variant: "destructive",
      });
      return false;
    }
  }, [currentBroadcaster, initializeWebRTC, isListening]);
  
  // Set up listeners for broadcast changes
  useEffect(() => {
    fetchActiveBroadcasts();
    
    const broadcastsChannel = supabase
      .channel('broadcasts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'broadcasts'
      }, (payload) => {
        console.log('Broadcast change detected:', payload);
        fetchActiveBroadcasts();
        
        // If a broadcast ends and we're listening to it, automatically leave
        if (isListening && 
            currentBroadcaster && 
            payload.eventType === 'UPDATE' && 
            payload.new && 
            !payload.new.active && 
            payload.new.user_id === currentBroadcaster) {
          leaveBroadcast();
          toast({
            title: "Broadcast ended",
            description: "The broadcaster has ended their stream",
          });
        }
      })
      .subscribe();
      
    const listenersChannel = supabase
      .channel('listeners-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listeners'
      }, () => {
        fetchActiveBroadcasts();
        if (isBroadcasting) {
          fetchCurrentBroadcastListeners();
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(broadcastsChannel);
      supabase.removeChannel(listenersChannel);
    };
  }, [fetchActiveBroadcasts, fetchCurrentBroadcastListeners, isBroadcasting, isListening, currentBroadcaster, leaveBroadcast]);
  
  const startBroadcast = useCallback(async () => {
    try {
      const webRTC = initializeWebRTC();
      const stream = await webRTC.startBroadcasting();
      
      if (stream) {
        setIsBroadcasting(true);
        
        const context = new AudioContext();
        setAudioContext(context);
        
        toast({
          title: "Broadcasting started",
          description: "Your contacts can now join your broadcast",
        });
        
        console.log("Broadcasting started");
        return true;
      } else {
        toast({
          title: "Error",
          description: "Failed to access microphone",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error starting broadcast:", error);
      toast({
        title: "Error",
        description: "Failed to start broadcasting",
        variant: "destructive",
      });
      return false;
    }
  }, [initializeWebRTC]);
  
  const stopBroadcast = useCallback(async () => {
    try {
      const webRTC = initializeWebRTC();
      await webRTC.stopBroadcasting();
      
      setIsBroadcasting(false);
      
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      
      toast({
        title: "Broadcasting stopped",
        description: "Your broadcast has ended",
      });
      
      console.log("Broadcasting stopped");
      return true;
    } catch (error) {
      console.error("Error stopping broadcast:", error);
      toast({
        title: "Error",
        description: "Failed to stop broadcasting",
        variant: "destructive",
      });
      return false;
    }
  }, [audioContext, initializeWebRTC]);
  
  const toggleBroadcast = useCallback(async () => {
    if (isBroadcasting) {
      return await stopBroadcast();
    } else {
      return await startBroadcast();
    }
  }, [isBroadcasting, startBroadcast, stopBroadcast]);
  
  const joinBroadcast = useCallback(async (contactId: string, contactName: string, roomId: string) => {
    try {
      // Prevent joining if already broadcasting
      if (isBroadcasting) {
        toast({
          title: "Cannot join",
          description: "You cannot listen while broadcasting",
          variant: "destructive",
        });
        return false;
      }
      
      // If already listening to someone, leave first
      if (isListening && currentBroadcaster) {
        // If trying to join the same broadcast, do nothing
        if (currentBroadcaster === contactId) {
          toast({
            title: "Already listening",
            description: `You are already listening to ${contactName}`,
          });
          return false;
        }
        
        // Leave current broadcast before joining a new one
        await leaveBroadcast();
      }
      
      const webRTC = initializeWebRTC();
      await webRTC.joinBroadcast(contactId, roomId);
      
      setIsListening(true);
      setCurrentBroadcaster(contactId);
      setCurrentRoomId(roomId);
      
      toast({
        title: "Joined broadcast",
        description: `You are now listening to ${contactName}`,
      });
      
      console.log(`Joined broadcast of contact ${contactId}`);
      return true;
    } catch (error) {
      console.error("Error joining broadcast:", error);
      toast({
        title: "Error",
        description: "Failed to join broadcast",
        variant: "destructive",
      });
      return false;
    }
  }, [currentBroadcaster, initializeWebRTC, isBroadcasting, isListening, leaveBroadcast]);
  
  const currentUser: Contact = {
    id: userId,
    name: username,
    phoneNumber: phoneNumber,
    isBroadcasting,
    listeners: []
  };
  
  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      if (audioContext) {
        audioContext.close();
      }
      
      if (isBroadcasting || isListening) {
        const webRTC = initializeWebRTC();
        if (isBroadcasting) {
          webRTC.stopBroadcasting().catch(console.error);
        }
        if (isListening && currentBroadcaster) {
          webRTC.leaveBroadcast(currentBroadcaster).catch(console.error);
        }
      }
      
      resetWebRTCService();
    };
  }, [audioContext, currentBroadcaster, initializeWebRTC, isBroadcasting, isListening, leaveBroadcast]);
  
  return {
    isBroadcasting,
    isListening,
    currentBroadcaster,
    currentRoomId,
    toggleBroadcast,
    joinBroadcast,
    leaveBroadcast,
    contacts,
    currentUser,
    fetchActiveBroadcasts
  };
}
