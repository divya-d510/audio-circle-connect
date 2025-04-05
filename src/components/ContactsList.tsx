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
    <div className="w-full max-w-md mx-auto p-4">
      {/* Current user */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">You</h2>
        <ContactCard 
          contact={currentUser} 
          isCurrentUser={true}
          onBroadcast={onBroadcast}
          isBroadcasting={isBroadcasting}
        />
      </div>
      
      {/* Other contacts */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Contacts</h2>
        <div className="space-y-1">
          {contacts.length > 0 ? (
            contacts.map((contact) => (
              <ContactCard 
                key={contact.id} 
                contact={contact}
                onJoin={onJoin}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No contacts available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactsList;
