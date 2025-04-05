
import { supabase } from "@/integrations/supabase/client";
import { WebRTCSignal, Room } from "@/types/supabase";
import { v4 as uuidv4 } from "uuid";

// STUN and TURN servers configuration for NAT traversal
const iceServers = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
      ],
    },
    // Add TURN servers in production for better connectivity
    // {
    //   urls: ['turn:your-turn-server.com:443'],
    //   username: 'username',
    //   credential: 'credential',
    // },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCService {
  private userId: string;
  private username: string;
  private roomId: string;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private onListenerConnectedCallback: ((listenerId: string) => void) | null = null;
  private onListenerDisconnectedCallback: ((listenerId: string) => void) | null = null;
  private onBroadcasterStreamCallback: ((broadcasterId: string, stream: MediaStream) => void) | null = null;

  constructor(userId: string, username: string) {
    this.userId = userId;
    this.username = username;
    this.roomId = '';
  }

  // Set callback functions
  public setOnListenerConnected(callback: (listenerId: string) => void): void {
    this.onListenerConnectedCallback = callback;
  }

  public setOnListenerDisconnected(callback: (listenerId: string) => void): void {
    this.onListenerDisconnectedCallback = callback;
  }

  public setOnBroadcasterStream(callback: (broadcasterId: string, stream: MediaStream) => void): void {
    this.onBroadcasterStreamCallback = callback;
  }

  // Initialize broadcasting - get user's microphone access and set up room
  public async startBroadcasting(): Promise<MediaStream | null> {
    try {
      // Create a room or get existing one
      const roomId = await this.getOrCreateRoom();
      this.roomId = roomId;

      // Get audio stream from user's microphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Register as broadcaster in Supabase
      await supabase.from('broadcasts').upsert({
        user_id: this.userId,
        username: this.username,
        room_id: this.roomId,
        active: true,
      });

      // Set up listener for incoming connection requests
      await this.setupSignalingListener();

      return this.localStream;
    } catch (error) {
      console.error('Error starting broadcast:', error);
      return null;
    }
  }

  // Stop broadcasting and clean up connections
  public async stopBroadcasting(): Promise<void> {
    try {
      // Stop all peer connections
      this.peerConnections.forEach((pc) => {
        pc.close();
      });
      this.peerConnections.clear();

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Update broadcast status in Supabase
      if (this.roomId) {
        await supabase
          .from('broadcasts')
          .update({ active: false })
          .eq('user_id', this.userId)
          .eq('room_id', this.roomId);
      }
    } catch (error) {
      console.error('Error stopping broadcast:', error);
    }
  }

  // Join a broadcaster's stream
  public async joinBroadcast(broadcasterId: string, roomId: string): Promise<void> {
    try {
      this.roomId = roomId;
      
      // Create peer connection for this broadcaster
      const peerConnection = new RTCPeerConnection(iceServers);
      this.peerConnections.set(broadcasterId, peerConnection);
      
      // Set up event handlers for the peer connection
      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.remoteStreams.set(broadcasterId, event.streams[0]);
          if (this.onBroadcasterStreamCallback) {
            this.onBroadcasterStreamCallback(broadcasterId, event.streams[0]);
          }
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal(broadcasterId, 'ice-candidate', event.candidate);
        }
      };

      // Register as listener in Supabase
      await supabase.from('listeners').upsert({
        user_id: this.userId,
        username: this.username,
        broadcaster_id: broadcasterId,
        room_id: this.roomId,
      });

      // Send offer to broadcaster
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      this.sendSignal(broadcasterId, 'offer', { sdp: offer.sdp, type: offer.type });

      // Set up signaling listener
      await this.setupSignalingListener();

    } catch (error) {
      console.error('Error joining broadcast:', error);
    }
  }

  // Leave a broadcaster's stream
  public async leaveBroadcast(broadcasterId: string): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(broadcasterId);
      if (peerConnection) {
        peerConnection.close();
        this.peerConnections.delete(broadcasterId);
      }

      const remoteStream = this.remoteStreams.get(broadcasterId);
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        this.remoteStreams.delete(broadcasterId);
      }

      // Remove from listeners table in Supabase
      if (this.roomId) {
        await supabase
          .from('listeners')
          .delete()
          .eq('user_id', this.userId)
          .eq('broadcaster_id', broadcasterId)
          .eq('room_id', this.roomId);
      }
    } catch (error) {
      console.error('Error leaving broadcast:', error);
    }
  }

  // Get the audio stream for a broadcaster
  public getBroadcasterStream(broadcasterId: string): MediaStream | undefined {
    return this.remoteStreams.get(broadcasterId);
  }

  // Create or get a room for broadcasting
  private async getOrCreateRoom(): Promise<string> {
    // Check if user already has a room
    const { data: existingRooms } = await supabase
      .from('broadcasts')
      .select('room_id')
      .eq('user_id', this.userId)
      .eq('active', true);
    
    if (existingRooms && existingRooms.length > 0) {
      return existingRooms[0].room_id;
    }
    
    // Create a new room
    const { data: newRoom } = await supabase
      .from('rooms')
      .insert({ name: `${this.username}'s Room` })
      .select()
      .single();
    
    return newRoom.id;
  }

  // Set up WebRTC signaling listener
  private async setupSignalingListener(): Promise<void> {
    const channel = supabase
      .channel(`webrtc-signals-${this.userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `receiver_id=eq.${this.userId}`
      }, (payload) => {
        this.handleSignalingMessage(payload.new as WebRTCSignal);
      })
      .subscribe();
  }

  // Send a WebRTC signal through Supabase
  private async sendSignal(receiverId: string, type: string, data: any): Promise<void> {
    await supabase.from('webrtc_signals').insert({
      room_id: this.roomId,
      sender_id: this.userId,
      receiver_id: receiverId,
      type,
      data,
    });
  }

  // Handle incoming WebRTC signals
  private async handleSignalingMessage(signal: WebRTCSignal): Promise<void> {
    const { sender_id, type, data } = signal;
    
    try {
      // Get or create peer connection for this sender
      let peerConnection = this.peerConnections.get(sender_id);
      if (!peerConnection) {
        peerConnection = new RTCPeerConnection(iceServers);
        this.peerConnections.set(sender_id, peerConnection);
        
        // Add local stream tracks to the connection if we're broadcasting
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
            this.localStream && peerConnection.addTrack(track, this.localStream);
          });
        }
        
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            this.sendSignal(sender_id, 'ice-candidate', event.candidate);
          }
        };
        
        peerConnection.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            this.remoteStreams.set(sender_id, event.streams[0]);
            if (this.onBroadcasterStreamCallback) {
              this.onBroadcasterStreamCallback(sender_id, event.streams[0]);
            }
          }
        };
      }
      
      // Process the signaling message based on its type
      switch (type) {
        case 'offer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          this.sendSignal(sender_id, 'answer', { sdp: answer.sdp, type: answer.type });
          
          // Notify when a listener connects
          if (this.onListenerConnectedCallback) {
            this.onListenerConnectedCallback(sender_id);
          }
          break;
          
        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
          break;
          
        case 'ice-candidate':
          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
          break;
          
        default:
          console.warn('Unknown signal type:', type);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  }
}

// Singleton instance for the application
let webRTCServiceInstance: WebRTCService | null = null;

export const getWebRTCService = (userId: string, username: string): WebRTCService => {
  if (!webRTCServiceInstance) {
    webRTCServiceInstance = new WebRTCService(userId, username);
  }
  return webRTCServiceInstance;
};

export const resetWebRTCService = () => {
  webRTCServiceInstance = null;
};
