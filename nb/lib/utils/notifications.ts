
import { formatDistanceToNow } from "date-fns";

export interface Notification {
  id: string;
  type: string;
  message: string;
  actor_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string | null;
    media: any | null;
  } | null;
  project?: {
    id: string;
    slug: string | null;
  } | null;
}

export interface NotificationGroup {
  id: string; // ID of the latest notification in the group
  type: string;
  notifications: Notification[];
  latest_at: string;
  is_read: boolean;
  actors: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }[];
  post?: {
    id: string;
    content: string | null;
    media: any | null;
  } | null;
}

export function groupNotifications(notifications: Notification[]): NotificationGroup[] {
  if (!notifications.length) return [];

  const groups: NotificationGroup[] = [];
  let currentGroup: NotificationGroup | null = null;

  notifications.forEach((notification) => {
    const isGroupable = ["like", "follow", "repost"].includes(notification.type);
    
    // Check if we can add to current group
    if (
      currentGroup &&
      isGroupable &&
      currentGroup.type === notification.type &&
      currentGroup.post?.id === notification.post?.id && // Same post
      notification.type !== "follow" // Follows usually group by type only, but logic differs slightly
    ) {
      // Add to group
      currentGroup.notifications.push(notification);
      if (notification.actor && !currentGroup.actors.find(a => a.username === notification.actor?.username)) {
        currentGroup.actors.push(notification.actor);
      }
      // Group is unread if any item is unread (usually the latest one determines it)
      if (!notification.is_read) currentGroup.is_read = false; 
    } 
    // Special case for follows: Group consecutive follows
    else if (
        currentGroup &&
        notification.type === "follow" &&
        currentGroup.type === "follow"
    ) {
        currentGroup.notifications.push(notification);
        if (notification.actor && !currentGroup.actors.find(a => a.username === notification.actor?.username)) {
            currentGroup.actors.push(notification.actor);
        }
        if (!notification.is_read) currentGroup.is_read = false;
    }
    else {
      // Start new group
      if (currentGroup) {
        groups.push(currentGroup);
      }
      
      currentGroup = {
        id: notification.id,
        type: notification.type,
        notifications: [notification],
        latest_at: notification.created_at,
        is_read: notification.is_read,
        actors: notification.actor ? [notification.actor] : [],
        post: notification.post,
      };
    }
  });

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

export function formatNotificationTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true }).replace("about ", "");
}
