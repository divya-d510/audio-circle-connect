
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

      // Get audio stream from user's microphone with optimized audio settings
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false,
      });

      // Register as broadcaster in Supabase
      try {
        await supabase.from('broadcasts').upsert({
          user_id: this.userId,
          username: this.username,
          room_id: this.roomId,
          active: true,
        });
      } catch (error) {
        console.error('Error registering as broadcaster:', error);
        throw new Error('Failed to register as broadcaster');
      }

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
        try {
          await supabase
            .from('broadcasts')
            .update({ active: false })
            .eq('user_id', this.userId)
            .eq('room_id', this.roomId);
        } catch (error) {
          console.error('Error updating broadcast status:', error);
        }
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
        console.log("Received track from broadcaster:", event);
        if (event.streams && event.streams[0]) {
          this.remoteStreams.set(broadcasterId, event.streams[0]);
          console.log("Setting remote stream with tracks:", event.streams[0].getTracks().length);
          if (this.onBroadcasterStreamCallback) {
            this.onBroadcasterStreamCallback(broadcasterId, event.streams[0]);
          }
        } else {
          console.warn("Received track event but no streams available");
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal(broadcasterId, 'ice-candidate', event.candidate);
        }
      };
      
      // Log connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log("Connection state change:", peerConnection.connectionState);
      };
      
      peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state change:", peerConnection.iceConnectionState);
      };

      // Register as listener in Supabase
      try {
        await supabase.from('listeners').upsert({
          user_id: this.userId,
          username: this.username,
          broadcaster_id: broadcasterId,
          room_id: this.roomId,
        });
      } catch (error) {
        console.error('Error registering as listener:', error);
        throw new Error('Failed to register as listener');
      }

      // Send offer to broadcaster
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      this.sendSignal(broadcasterId, 'offer', { sdp: offer.sdp, type: offer.type });

      // Set up signaling listener
      await this.setupSignalingListener();

    } catch (error) {
      console.error('Error joining broadcast:', error);
      throw error;
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
        try {
          await supabase
            .from('listeners')
            .delete()
            .eq('user_id', this.userId)
            .eq('broadcaster_id', broadcasterId);
        } catch (error) {
          console.error('Error removing listener record:', error);
        }
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
    try {
      // Check if user already has a room
      try {
        const { data: existingRooms } = await supabase
          .from('broadcasts')
          .select('room_id')
          .eq('user_id', this.userId)
          .eq('active', true);
        
        if (existingRooms && existingRooms.length > 0 && existingRooms[0].room_id) {
          return existingRooms[0].room_id;
        }
      } catch (error) {
        console.error('Error checking for existing rooms:', error);
      }
      
      // Create a new room
      try {
        const { data: newRoom, error } = await supabase
          .from('rooms')
          .insert({ name: `${this.username}'s Room` })
          .select()
          .single();
        
        if (error || !newRoom) {
          throw new Error('Failed to create room');
        }
        
        return newRoom.id;
      } catch (error) {
        console.error('Error creating new room:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error getting or creating room:', error);
      throw error;
    }
  }

  // Set up WebRTC signaling listener
  private async setupSignalingListener(): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error setting up signaling listener:', error);
    }
  }

  // Send a WebRTC signal through Supabase
  private async sendSignal(receiverId: string, type: string, data: any): Promise<void> {
    try {
      await supabase.from('webrtc_signals').insert({
        room_id: this.roomId,
        sender_id: this.userId,
        receiver_id: receiverId,
        type,
        data,
      });
    } catch (error) {
      console.error('Error sending signal:', error);
    }
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
            if (this.localStream) {
              console.log("Adding local track to peer connection:", track.kind);
              peerConnection.addTrack(track, this.localStream);
            }
          });
        }
        
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            this.sendSignal(sender_id, 'ice-candidate', event.candidate);
          }
        };
        
        peerConnection.ontrack = (event) => {
          console.log("Received track in signal handler:", event);
          if (event.streams && event.streams[0]) {
            this.remoteStreams.set(sender_id, event.streams[0]);
            if (this.onBroadcasterStreamCallback) {
              this.onBroadcasterStreamCallback(sender_id, event.streams[0]);
            }
          }
        };
        
        // Log connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log("Connection state change:", peerConnection.connectionState);
        };
        
        peerConnection.oniceconnectionstatechange = () => {
          console.log("ICE connection state change:", peerConnection.iceConnectionState);
        };
      }
      
      // Process the signaling message based on its type
      switch (type) {
        case 'offer':
          console.log("Processing offer from:", sender_id);
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
          console.log("Processing answer from:", sender_id);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
          break;
          
        case 'ice-candidate':
          console.log("Processing ICE candidate from:", sender_id);
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
