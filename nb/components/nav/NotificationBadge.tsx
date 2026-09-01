"use client";

interface NotificationBadgeProps {
    count: number;
    className?: string;
}

export default function NotificationBadge({ count, className = "" }: NotificationBadgeProps) {
    if (count === 0) return null;

    return (
        <div className={`flex items-center justify-center ${className}`}>
            {count > 0 && count < 10 && (
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                    <div className="relative bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {count}
                    </div>
                </div>
            )}
            {count >= 10 && (
                <div className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                    {count > 99 ? '99+' : count}
                </div>
            )}
        </div>
    );
}
