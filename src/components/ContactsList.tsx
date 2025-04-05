
import React from 'react';
import { Contact } from '@/types/contact';
import ContactCard from '@/components/ContactCard';

interface ContactsListProps {
  contacts: Contact[];
  currentUser: Contact;
  onJoin: (contactId: string) => void;
  onBroadcast: () => void;
  isBroadcasting: boolean;
}

const ContactsList: React.FC<ContactsListProps> = ({ 
  contacts, 
  currentUser, 
  onJoin, 
  onBroadcast,
  isBroadcasting
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Current user */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span> You
        </h2>
        <ContactCard 
          contact={currentUser} 
          isCurrentUser={true}
          onBroadcast={onBroadcast}
          isBroadcasting={isBroadcasting}
        />
      </div>
      
      {/* Other contacts */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Contacts ({contacts.length})</h2>
        <div className="space-y-3">
          {contacts.length > 0 ? (
            contacts.map((contact) => (
              <ContactCard 
                key={contact.id} 
                contact={contact}
                onJoin={onJoin}
              />
            ))
          ) : (
            <div className="text-center text-muted-foreground py-12 bg-muted/30 rounded-lg border border-dashed">
              <p>No contacts available</p>
              <p className="text-xs mt-1">Connect to start listening</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactsList;
