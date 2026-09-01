/**
 * Messaging Service - Barrel Export
 * 
 * This file maintains backward compatibility by re-exporting all modules
 * under the original `MessagingService` namespace.
 */

// Export types
export * from "./types";

// Import modules
import { MessagesService } from "./messages";
import { ConversationsService } from "./conversations";
import { PresenceService } from "./presence";
import { ReactionsService } from "./reactions";

// Export individual services for granular imports
export { MessagesService, ConversationsService, PresenceService, ReactionsService };

// Backward-compatible combined service
export const MessagingService = {
  // Messages
  getMessages: MessagesService.getMessages.bind(MessagesService),
  sendMessage: MessagesService.sendMessage.bind(MessagesService),
  sendMessageWithAttachments: MessagesService.sendMessageWithAttachments.bind(MessagesService),
  editMessage: MessagesService.editMessage.bind(MessagesService),
  deleteMessage: MessagesService.deleteMessage.bind(MessagesService),
  getMessageAttachments: MessagesService.getMessageAttachments.bind(MessagesService),
  getMessageAttachmentsBatch: MessagesService.getMessageAttachmentsBatch.bind(MessagesService),
  forwardMessage: MessagesService.forwardMessage.bind(MessagesService),
  searchMessages: MessagesService.searchMessages.bind(MessagesService),
  subscribeToMessages: MessagesService.subscribeToMessages.bind(MessagesService),
  markMessageAsRead: MessagesService.markMessageAsRead.bind(MessagesService),

  // Conversations
  getProjectConversation: ConversationsService.getProjectConversation.bind(ConversationsService),
  getUserConversations: ConversationsService.getUserConversations.bind(ConversationsService),
  searchConversations: ConversationsService.searchConversations.bind(ConversationsService),
  createDirectConversation: ConversationsService.createDirectConversation.bind(ConversationsService),
  getOrCreateDirectConversation: ConversationsService.getOrCreateDirectConversation.bind(ConversationsService),
  getConnectedUsers: ConversationsService.getConnectedUsers.bind(ConversationsService),
  searchUsers: ConversationsService.searchUsers.bind(ConversationsService),
  joinConversation: ConversationsService.joinConversation.bind(ConversationsService),
  resolveProjectId: ConversationsService.resolveProjectId.bind(ConversationsService),
  markConversationRead: ConversationsService.markConversationRead.bind(ConversationsService),
  createGroupConversation: ConversationsService.createGroupConversation.bind(ConversationsService),
  addGroupMember: ConversationsService.addGroupMember.bind(ConversationsService),
  removeGroupMember: ConversationsService.removeGroupMember.bind(ConversationsService),
  updateGroupSettings: ConversationsService.updateGroupSettings.bind(ConversationsService),
  getGroupMembers: ConversationsService.getGroupMembers.bind(ConversationsService),

  // Presence
  getSenderProfile: PresenceService.getSenderProfile.bind(PresenceService),
  setTyping: PresenceService.setTyping.bind(PresenceService),
  subscribeToTyping: PresenceService.subscribeToTyping.bind(PresenceService),
  updatePresence: PresenceService.updatePresence.bind(PresenceService),
  getUserProfile: PresenceService.getUserProfile.bind(PresenceService),
  getUserProfilesBatch: PresenceService.getUserProfilesBatch.bind(PresenceService),
  subscribeToPresence: PresenceService.subscribeToPresence.bind(PresenceService),
  subscribeToGlobalPresence: PresenceService.subscribeToGlobalPresence.bind(PresenceService),
  subscribeToGlobalTyping: PresenceService.subscribeToGlobalTyping.bind(PresenceService),
  getReadReceipts: PresenceService.getReadReceipts.bind(PresenceService),
  subscribeToReadReceipts: PresenceService.subscribeToReadReceipts.bind(PresenceService),

  // Reactions
  toggleReaction: ReactionsService.toggleReaction.bind(ReactionsService),
  getReactions: ReactionsService.getReactions.bind(ReactionsService),
  subscribeToReactions: ReactionsService.subscribeToReactions.bind(ReactionsService),
};
