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
  
  const userId = useState(() => uuidv4())[0];
  const username = useState(() => `User-${userId.substring(0, 5)}`)[0];
  
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
      console.log(`Got stream from broadcaster: ${broadcasterId}`);
      const audioElement = new Audio();
      audioElement.srcObject = stream;
      audioElement.autoplay = true;
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
        roomId: broadcast.room_id
      }));
      
      for (const contact of contactsData) {
        const { data: listeners } = await supabase
          .from('listeners')
          .select('*')
          .eq('broadcaster_id', contact.id);
        
        if (listeners && listeners.length > 0) {
          contact.listeners = listeners.map((listener: ListenerRecord) => ({
            id: listener.user_id,
            name: listener.username
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
          name: listener.username
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
  
  useEffect(() => {
    fetchActiveBroadcasts();
    
    const broadcastsChannel = supabase
      .channel('broadcasts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'broadcasts'
      }, () => {
        fetchActiveBroadcasts();
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
  }, [fetchActiveBroadcasts, fetchCurrentBroadcastListeners, isBroadcasting]);
  
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
      if (isListening || isBroadcasting) {
        if (isListening && currentBroadcaster === contactId) {
          toast({
            title: "Already listening",
            description: `You are already listening to ${contactName}`,
          });
          return false;
        } else if (isListening) {
          await leaveBroadcast();
        } else {
          toast({
            title: "Cannot join",
            description: "You cannot listen while broadcasting",
            variant: "destructive",
          });
          return false;
        }
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
  }, [currentBroadcaster, initializeWebRTC, isBroadcasting, isListening]);
  
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
  
  const currentUser: Contact = {
    id: userId,
    name: username,
    isBroadcasting,
    listeners: []
  };
  
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
  }, [audioContext, currentBroadcaster, initializeWebRTC, isBroadcasting, isListening]);
  
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
