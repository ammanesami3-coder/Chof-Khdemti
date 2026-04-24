import type { Tables } from './database.types';

export type Conversation = Tables<'conversations'>;

export type Message = Tables<'messages'>;

export type ConversationPartner = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  account_type: string;
};

export type ConversationWithPartner = Conversation & {
  partner: ConversationPartner;
  last_message?: Pick<Message, 'content' | 'created_at' | 'sender_id' | 'is_read'>;
  unread_count: number;
};

export type MessageWithSender = Message & {
  sender: Pick<ConversationPartner, 'id' | 'username' | 'full_name' | 'avatar_url'>;
};
