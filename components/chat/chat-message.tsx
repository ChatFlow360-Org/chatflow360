import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/format";
import type { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isVisitor = message.senderType === "visitor";

  return (
    <div className={cn("flex", isVisitor ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isVisitor
            ? "rounded-bl-md bg-muted dark:bg-muted/80 text-foreground"
            : "rounded-br-md bg-cta/10 dark:bg-cta/20 text-foreground"
        )}
      >
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {message.senderName}
        </p>
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
