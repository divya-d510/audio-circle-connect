
import { Contact } from '@/types/contact';

export const mockCurrentUser: Contact = {
  id: 'current-user',
  name: 'You',
  isBroadcasting: false,
  listeners: [],
};

export const mockContacts: Contact[] = [
  {
    id: 'contact-1',
    name: 'Alex Johnson',
    isBroadcasting: true,
    listeners: [
      { id: 'listener-1', name: 'Sarah Williams' },
      { id: 'listener-2', name: 'Mike Chen' },
      { id: 'listener-3', name: 'Emma Davis' },
    ],
  },
  {
    id: 'contact-2',
    name: 'Jamie Smith',
    isBroadcasting: false,
    listeners: [],
  },
  {
    id: 'contact-3',
    name: 'Taylor Wilson',
    isBroadcasting: true,
    listeners: [
      { id: 'listener-4', name: 'Chris Moore' },
    ],
  },
  {
    id: 'contact-4',
    name: 'Jordan Lee',
    isBroadcasting: false,
    listeners: [],
  },
  {
    id: 'contact-5',
    name: 'Casey Martinez',
    isBroadcasting: false,
    listeners: [],
  },
  {
    id: 'contact-6',
    name: 'Riley Thompson',
    isBroadcasting: true,
    listeners: [
      { id: 'listener-5', name: 'Alex Brown' },
      { id: 'listener-6', name: 'Sam Green' },
    ],
  },
];
