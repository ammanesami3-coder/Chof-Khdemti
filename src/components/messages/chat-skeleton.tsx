import { Skeleton } from '@/components/ui/skeleton';

function IncomingBubble({ wide = false }: { wide?: boolean }) {
  return (
    <div className="mt-2 flex items-end gap-2 justify-start">
      <Skeleton className="h-7 w-7 shrink-0 rounded-full self-end" />
      <Skeleton className={`h-10 rounded-2xl rounded-es-sm ${wide ? 'w-52' : 'w-36'}`} />
    </div>
  );
}

function OutgoingBubble({ wide = false }: { wide?: boolean }) {
  return (
    <div className="mt-2 flex items-end justify-end">
      <Skeleton className={`h-10 rounded-2xl rounded-ee-sm ${wide ? 'w-52' : 'w-40'}`} />
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden px-4 py-4">
        <IncomingBubble />
        <IncomingBubble wide />
        <OutgoingBubble wide />
        <OutgoingBubble />
        <IncomingBubble wide />
        <OutgoingBubble wide />
        <IncomingBubble />
        <OutgoingBubble />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
