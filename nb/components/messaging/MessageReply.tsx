"use client";

import { cn } from "@/lib/utils";
import { MessageAttachment } from "@/lib/services/messaging/index";
import { Message } from "@/lib/services/messaging/types";
import { Image, File, Paperclip } from "lucide-react";

interface MessageReplyProps {
    replyTo: Message;
    attachments?: MessageAttachment[];
    onClick?: () => void;
    className?: string;
}

export function MessageReply({ replyTo, attachments = [], onClick, className }: MessageReplyProps) {
    const senderName = (replyTo as any).sender_profile?.full_name ||
        (replyTo as any).sender_profile?.username ||
        (replyTo as any).sender_name ||
        "Unknown User";

    // Filter attachments for images
    const imageAttachments = attachments.filter(att =>
        att.mime_type?.startsWith('image/') || att.file_type === 'image'
    );
    const fileAttachments = attachments.filter(att =>
        !att.mime_type?.startsWith('image/') && att.file_type !== 'image'
    );

    // Show content preview only if it's not the attachment placeholder
    const hasContent = replyTo.content && replyTo.content !== "📎 Attachment";
    const preview = hasContent
        ? (replyTo.content.length > 50
            ? replyTo.content.substring(0, 50) + "..."
            : replyTo.content)
        : null;

    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-start gap-2 p-2 rounded-md border-l-2 border-primary/50 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors",
                className
            )}
        >
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-primary mb-0.5">
                    {senderName}
                </div>
                {preview && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {preview}
                    </div>
                )}
                {/* Show attachments in reply preview */}
                {attachments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {imageAttachments.length > 0 && (
                            <div className="flex items-center gap-1">
                                <Image className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                    {imageAttachments.length} image{imageAttachments.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                        {fileAttachments.length > 0 && (
                            <div className="flex items-center gap-1">
                                <File className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                    {fileAttachments.length} file{fileAttachments.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                        {!preview && attachments.length > 0 && (
                            <div className="flex items-center gap-1">
                                <Paperclip className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Attachment</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
