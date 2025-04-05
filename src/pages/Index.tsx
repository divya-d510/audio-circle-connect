
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ContactsList from '@/components/ContactsList';
import { useAudioBroadcast } from '@/hooks/useAudioBroadcast';
import { mockContacts, mockCurrentUser } from '@/data/mockContacts';
import { Contact } from '@/types/contact';

const Index = () => {
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [currentUser, setCurrentUser] = useState<Contact>(mockCurrentUser);
  const { 
    isBroadcasting, 
    isListening, 
    toggleBroadcast, 
    joinBroadcast,
    leaveBroadcast
  } = useAudioBroadcast();

  // Update the current user's broadcasting status when it changes
  useEffect(() => {
    setCurrentUser(prevUser => ({
      ...prevUser,
      isBroadcasting
    }));
  }, [isBroadcasting]);

  // Handle joining a contact's broadcast
  const handleJoin = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      joinBroadcast(contactId, contact.name);
      
      // Add current user to the listeners of the broadcasting contact
      setContacts(prevContacts => 
        prevContacts.map(c => {
          if (c.id === contactId) {
            return {
              ...c,
              listeners: [
                ...(c.listeners || []),
                { id: currentUser.id, name: currentUser.name }
              ]
            };
          }
          return c;
        })
      );
    }
  };

  // Handle toggle broadcast for current user
  const handleBroadcast = () => {
    toggleBroadcast();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <ContactsList 
          contacts={contacts}
          currentUser={currentUser}
          onJoin={handleJoin}
          onBroadcast={handleBroadcast}
          isBroadcasting={isBroadcasting}
        />
      </main>
      
      {isListening && (
        <div className="fixed bottom-0 left-0 right-0 bg-audio-primary text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse-audio"></div>
            </div>
            <span>Listening to broadcast</span>
          </div>
          <button 
            onClick={leaveBroadcast}
            className="px-3 py-1 bg-white text-audio-primary rounded-md text-sm"
          >
            Leave
          </button>
        </div>
      )}
    </div>
  );
};

export default Index;
