import { ConversationListSkeleton } from '@/components/messages/conversation-list-skeleton';
import { MessagesHeader } from '@/components/messages/messages-header';

export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <MessagesHeader />
      <ConversationListSkeleton />
    </div>
  );
}
