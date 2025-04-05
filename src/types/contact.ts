
export interface Listener {
  id: string;
  name: string;
}

export interface Contact {
  id: string;
  name: string;
  isBroadcasting: boolean;
  listeners?: Listener[];
}
