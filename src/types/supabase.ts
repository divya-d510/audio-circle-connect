
export interface Room {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WebRTCSignal {
  id: string;
  room_id: string;
  sender_id: string;
  receiver_id: string | null;
  type: string;
  data: any;
  created_at: string;
}

export interface Broadcast {
  id: string;
  user_id: string;
  username: string;
  room_id: string;
  active: boolean;
  started_at: string;
}

export interface ListenerRecord {
  id: string;
  user_id: string;
  username: string;
  broadcaster_id: string;
  room_id: string;
  joined_at: string;
}

// Extended Contact type that includes WebRTC connection info
export interface WebRTCContact extends Contact {
  peerConnection?: RTCPeerConnection;
  mediaStream?: MediaStream;
}
