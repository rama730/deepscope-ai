export const formatTimeAgo = (date: string | Date | number): string => {
    try {
        const d = new Date(date);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / 1000;
        
        if (isNaN(diff)) return '';

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d`; // Up to 7 days
        
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
        return "";
    }
};

export const formatFullDate = (date: string | Date | number): string => {
    try {
        return new Date(date).toLocaleString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });
    } catch (e) {
        return "";
    }
};
