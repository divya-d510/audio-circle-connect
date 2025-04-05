
export interface Listener {
  id: string;
  name: string;
  phoneNumber?: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber?: string;
  isBroadcasting: boolean;
  listeners?: Listener[];
  roomId?: string;
}
