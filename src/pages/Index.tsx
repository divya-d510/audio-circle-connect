
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ContactsList from '@/components/ContactsList';
import { useWebRTC } from '@/hooks/useWebRTC';
import AudioPlayer from '@/components/AudioPlayer';

const Index = () => {
  const { 
    isBroadcasting, 
    isListening, 
    toggleBroadcast, 
    joinBroadcast,
    leaveBroadcast,
    contacts,
    currentUser
  } = useWebRTC();

  // Handle joining a contact's broadcast
  const handleJoin = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact && contact.roomId) {
      joinBroadcast(contactId, contact.name, contact.roomId);
    } else {
      console.error('Cannot join broadcast: missing roomId');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <ContactsList 
          contacts={contacts}
          currentUser={currentUser}
          onJoin={handleJoin}
          onBroadcast={toggleBroadcast}
          isBroadcasting={isBroadcasting}
        />
      </main>
      
      {isListening && (
        <AudioPlayer 
          onLeave={leaveBroadcast} 
          broadcaster={contacts.find(c => c.id === currentUser.id)?.name || 'Unknown'}
        />
      )}
    </div>
  );
};

export default Index;
