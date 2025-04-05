
interface Database {
  public: {
    Tables: {
      broadcasts: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          room_id: string;
          active: boolean;
          started_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          room_id: string;
          active?: boolean;
          started_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          room_id?: string;
          active?: boolean;
          started_at?: string;
        };
      };
      listeners: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          broadcaster_id: string;
          room_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          broadcaster_id: string;
          room_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          broadcaster_id?: string;
          room_id?: string;
          joined_at?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      webrtc_signals: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string;
          receiver_id: string | null;
          type: string;
          data: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id: string;
          receiver_id?: string | null;
          type: string;
          data: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_id?: string;
          receiver_id?: string | null;
          type?: string;
          data?: any;
          created_at?: string;
        };
      };
    };
  };
}

export {};
