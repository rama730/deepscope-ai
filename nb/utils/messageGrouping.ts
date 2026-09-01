/**
 * Advanced message grouping utilities for better conversation flow
 */

interface BaseMessage {
  id: string;
  sender_id: string;
  created_at: string;
  message_type?: string;
}

export type GroupedMessage<T extends BaseMessage = BaseMessage> = T & {
  isGrouped: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  showSenderName: boolean;
  groupId: string;
  groupSize: number;
};

interface MessageGroupingOptions {
  maxGroupTimeGap: number; // Maximum time gap in milliseconds to group messages
  maxGroupSize: number; // Maximum number of messages in a group
  groupSystemMessages: boolean; // Whether to group system messages
  alwaysShowTimestamp: boolean; // Whether to always show timestamps
}

const DEFAULT_OPTIONS: MessageGroupingOptions = {
  maxGroupTimeGap: 5 * 60 * 1000, // 5 minutes
  maxGroupSize: 10,
  groupSystemMessages: false,
  alwaysShowTimestamp: false
};

/**
 * Groups consecutive messages from the same sender within a time window
 */
export function groupMessages<T extends BaseMessage>(
  messages: T[],
  options: Partial<MessageGroupingOptions> = {}
): GroupedMessage<T>[] {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (messages.length === 0) return [];

  const grouped: GroupedMessage<T>[] = [];
  let currentGroupId = generateGroupId();
  let currentGroupSize = 0;

  messages.forEach((message, index) => {
    const prevMessage = messages[index - 1];
    const nextMessage = messages[index + 1];

    // Determine if this message should be grouped with the previous one
    const shouldGroup = shouldGroupWithPrevious(message, prevMessage, config);

    // Start new group if not grouping with previous
    if (!shouldGroup) {
      currentGroupId = generateGroupId();
      currentGroupSize = 1;
    } else {
      currentGroupSize++;
    }

    // Determine if this message should be grouped with the next one
    const willGroupWithNext = shouldGroupWithNext(message, nextMessage, config, currentGroupSize);

    // Determine display properties
    const isGrouped = shouldGroup || willGroupWithNext;
    const isFirstInGroup = !shouldGroup;
    const isLastInGroup = !willGroupWithNext;
    const showAvatar = isLastInGroup; // Show avatar on last message in group
    const showTimestamp = isLastInGroup || config.alwaysShowTimestamp;
    const showSenderName = isFirstInGroup;

    const groupedMessage: GroupedMessage<T> = {
      ...message,
      isGrouped,
      isFirstInGroup,
      isLastInGroup,
      showAvatar,
      showTimestamp,
      showSenderName,
      groupId: currentGroupId,
      groupSize: currentGroupSize
    };

    grouped.push(groupedMessage);
  });

  return grouped;
}

/**
 * Check if a message should be grouped with the previous message
 */
function shouldGroupWithPrevious<T extends BaseMessage>(
  message: T,
  prevMessage: T | undefined,
  config: MessageGroupingOptions
): boolean {
  if (!prevMessage) return false;

  // Don't group different senders
  if (message.sender_id !== prevMessage.sender_id) return false;

  // Don't group if time gap is too large
  const timeDiff = new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime();
  if (timeDiff > config.maxGroupTimeGap) return false;

  // Don't group system messages unless explicitly allowed
  if (!config.groupSystemMessages) {
    const isSystemMessage = message.message_type && message.message_type !== 'text';
    const isPrevSystemMessage = prevMessage.message_type && prevMessage.message_type !== 'text';
    if (isSystemMessage || isPrevSystemMessage) return false;
  }

  return true;
}

/**
 * Check if a message should be grouped with the next message
 */
function shouldGroupWithNext<T extends BaseMessage>(
  message: T,
  nextMessage: T | undefined,
  config: MessageGroupingOptions,
  currentGroupSize: number
): boolean {
  if (!nextMessage) return false;

  // Don't exceed max group size
  if (currentGroupSize >= config.maxGroupSize) return false;

  // Don't group different senders
  if (message.sender_id !== nextMessage.sender_id) return false;

  // Don't group if time gap is too large
  const timeDiff = new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime();
  if (timeDiff > config.maxGroupTimeGap) return false;

  // Don't group system messages unless explicitly allowed
  if (!config.groupSystemMessages) {
    const isSystemMessage = message.message_type && message.message_type !== 'text';
    const isNextSystemMessage = nextMessage.message_type && nextMessage.message_type !== 'text';
    if (isSystemMessage || isNextSystemMessage) return false;
  }

  return true;
}

/**
 * Generate a unique group ID
 */
function generateGroupId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate optimal grouping parameters based on screen size and user preferences
 */
export function getOptimalGroupingOptions(
  isMobile: boolean,
  isTablet: boolean,
  userPreferences?: Partial<MessageGroupingOptions>
): MessageGroupingOptions {
  let baseOptions = { ...DEFAULT_OPTIONS };

  // Adjust for mobile devices
  if (isMobile) {
    baseOptions.maxGroupTimeGap = 3 * 60 * 1000; // 3 minutes on mobile
    baseOptions.maxGroupSize = 8; // Smaller groups on mobile
  }

  // Adjust for tablets
  if (isTablet) {
    baseOptions.maxGroupTimeGap = 4 * 60 * 1000; // 4 minutes on tablet
    baseOptions.maxGroupSize = 9;
  }

  // Apply user preferences
  return { ...baseOptions, ...userPreferences };
}

/**
 * Group messages by conversation for bulk operations
 */
export function groupMessagesByConversation<T extends BaseMessage & { conversation_id: string }>(
  messages: T[]
): Record<string, T[]> {
  return messages.reduce((groups, message) => {
    const conversationId = message.conversation_id;
    if (!groups[conversationId]) {
      groups[conversationId] = [];
    }
    groups[conversationId].push(message);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Group messages by date for date separators
 */
export function groupMessagesByDate<T extends BaseMessage>(
  messages: T[]
): Array<{ date: string; messages: T[] }> {
  const groups: Array<{ date: string; messages: T[] }> = [];
  let currentDate = '';
  let currentGroup: T[] = [];

  messages.forEach((message) => {
    const messageDate = new Date(message.created_at).toDateString();

    if (messageDate !== currentDate) {
      // Save previous group if it exists
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, messages: currentGroup });
      }

      // Start new group
      currentDate = messageDate;
      currentGroup = [message];
    } else {
      currentGroup.push(message);
    }
  });

  // Add final group
  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, messages: currentGroup });
  }

  return groups;
}

/**
 * Smart timestamp display based on grouping and time gaps
 */
export function getSmartTimestamp(
  message: BaseMessage,
  prevMessage?: BaseMessage,
  nextMessage?: BaseMessage,
  options: { alwaysShow?: boolean; format?: 'relative' | 'absolute' | 'smart' } = {}
): string | null {
  const { alwaysShow = false, format = 'smart' } = options;

  const messageTime = new Date(message.created_at);
  const now = new Date();

  // Always show if requested
  if (alwaysShow) {
    return formatTimestamp(messageTime, format);
  }

  // Show if it's the last message
  if (!nextMessage) {
    return formatTimestamp(messageTime, format);
  }

  // Show if there's a significant time gap to next message
  if (nextMessage) {
    const timeDiff = new Date(nextMessage.created_at).getTime() - messageTime.getTime();
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      return formatTimestamp(messageTime, format);
    }
  }

  // Show if sender changes
  if (nextMessage && nextMessage.sender_id !== message.sender_id) {
    return formatTimestamp(messageTime, format);
  }

  return null;
}

/**
 * Format timestamp based on format type
 */
function formatTimestamp(date: Date, format: 'relative' | 'absolute' | 'smart'): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  switch (format) {
    case 'relative':
      if (diffInSeconds < 60) return 'just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays === 1) return 'yesterday';
      return `${diffInDays}d ago`;

    case 'absolute':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    case 'smart':
    default:
      // Smart format: relative for recent, absolute for older
      if (diffInMinutes < 60) {
        return diffInSeconds < 60 ? 'just now' : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffInDays === 1) {
        return `yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        return date.toLocaleDateString();
      }
  }
}
