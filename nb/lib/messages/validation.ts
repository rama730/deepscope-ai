/**
 * Server-side message validation utilities
 */

export interface MessageValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate message before sending
 */
export function validateMessage(data: {
  content: string;
  conversation_id: string;
  sender_id: string;
  recipient_id?: string;
  message_type?: string;
  attachments?: Array<{ size: number; type: string; name: string }>;
}): MessageValidationResult {
  const errors: string[] = [];

  // Content validation
  if (!data.content || data.content.trim().length === 0) {
    errors.push('Message content is required');
  } else if (data.content.length > 10000) {
    errors.push('Message content exceeds maximum length of 10,000 characters');
  }

  // Conversation ID validation
  if (!data.conversation_id || typeof data.conversation_id !== 'string') {
    errors.push('Invalid conversation ID');
  }

  // Sender ID validation
  if (!data.sender_id || typeof data.sender_id !== 'string') {
    errors.push('Invalid sender ID');
  }

  // Message type validation
  const validMessageTypes = ['text', 'image', 'file', 'audio', 'video', 'project_application'];
  if (data.message_type && !validMessageTypes.includes(data.message_type)) {
    errors.push(`Invalid message type. Must be one of: ${validMessageTypes.join(', ')}`);
  }

  // Attachment validation
  if (data.attachments && data.attachments.length > 0) {
    if (data.attachments.length > 5) {
      errors.push('Maximum 5 attachments allowed per message');
    }

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypePrefixes = ['image/', 'video/', 'audio/', 'application/pdf', 'text/'];

    for (const attachment of data.attachments) {
      if (attachment.size > maxFileSize) {
        errors.push(`File "${attachment.name}" exceeds maximum size of 10MB`);
      }

      const isAllowedType = allowedTypePrefixes.some(prefix => attachment.type.startsWith(prefix));
      if (!isAllowedType) {
        errors.push(`File type "${attachment.type}" is not allowed`);
      }

      // Check for dangerous file extensions
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar'];
      const fileExt = attachment.name.toLowerCase().substring(attachment.name.lastIndexOf('.'));
      if (dangerousExtensions.includes(fileExt)) {
        errors.push(`File type "${fileExt}" is not allowed for security reasons`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  // Size check
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB` };
  }

  // Type check - allow common file types
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/flac',
    // Video
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'video/avi', 'video/mov', 'video/ogg'
  ];

  // Check if file type matches allowed types (support wildcard matching for video/*, audio/*, image/*)
  const isAllowed = allowedMimeTypes.some(allowedType => {
    if (allowedType.includes('*')) {
      const baseType = allowedType.split('/')[0];
      return file.type.startsWith(baseType + '/');
    }
    return file.type === allowedType;
  }) || 
  // Also allow common type prefixes
  file.type.startsWith('image/') ||
  file.type.startsWith('video/') ||
  file.type.startsWith('audio/') ||
  file.type === 'application/pdf' ||
  file.type.startsWith('text/');

  if (!isAllowed) {
    return { valid: false, error: `File type "${file.type}" is not allowed` };
  }

  // Filename check
  const dangerousPatterns = [/\.\./, /[<>:"|?*]/];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(file.name)) {
      return { valid: false, error: 'Invalid filename' };
    }
  }

  // Extension check
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar', '.sh'];
  const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (dangerousExtensions.includes(fileExt)) {
    return { valid: false, error: `File extension "${fileExt}" is not allowed for security reasons` };
  }

  return { valid: true };
}
