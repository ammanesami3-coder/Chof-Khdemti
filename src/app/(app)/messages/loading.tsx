import { ConversationListSkeleton } from '@/components/messages/conversation-list-skeleton';

export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="border-b px-4 py-4">
        <div className="text-xl font-bold">الرسائل</div>
      </div>
      <ConversationListSkeleton />
    </div>
  );
}
