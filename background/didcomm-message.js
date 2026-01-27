/**
 * DIDComm v2 Message Builder
 * 
 * This module ensures all messages follow DIDComm v2 structure:
 * - id: unique message identifier
 * - type: URI identifying the message type (DIDComm protocol)
 * - from: sender DID
 * - to: array of recipient DIDs
 * - created_time: Unix timestamp (seconds)
 * - body: application-specific payload
 * - thid: thread ID for correlating responses/ACKs (optional)
 * 
 * References:
 * - https://identity.foundation/didcomm-messaging/spec/#message-structure
 */

// ============================================================================
// DIDComm Message Type URIs
// ============================================================================

export const DIDCOMM_TYPES = {
  // Standard DIDComm basic message
  BASIC_MESSAGE: 'https://didcomm.org/basicmessage/2.0/message',
  
  // Standard DIDComm acknowledgement (already in use)
  ACK: 'https://didcomm.org/notification/ack/2.0',
  
  // Application-specific: approval workflow
  APPROVAL_REQUEST: 'https://example.org/didcomm/approval-request/1.0',
  APPROVAL_RESPONSE: 'https://example.org/didcomm/approval-response/1.0',
  
  // Application-specific: credential exchange (future)
  CREDENTIAL_OFFER: 'https://example.org/didcomm/credential-offer/1.0',
  CREDENTIAL_REQUEST: 'https://example.org/didcomm/credential-request/1.0',
};

// ============================================================================
// DIDComm Message Builder
// ============================================================================

/**
 * Build a DIDComm v2 compliant plaintext message.
 * 
 * @param {Object} options - Message options
 * @param {string} options.type - DIDComm message type URI (use DIDCOMM_TYPES)
 * @param {string} options.from - Sender DID
 * @param {string|string[]} options.to - Recipient DID(s) - will be normalized to array
 * @param {Object} options.body - Application-specific message body
 * @param {string} [options.thid] - Thread ID (for responses/ACKs referencing original message)
 * @param {string} [options.id] - Message ID (auto-generated if not provided)
 * @returns {Object} DIDComm v2 compliant plaintext message
 * @throws {Error} If required fields are missing or invalid
 */
export function buildDidCommMessage({ type, from, to, body, thid, id }) {
  // Validate required fields
  if (!type || typeof type !== 'string') {
    throw new Error('DIDComm message requires a valid "type" URI');
  }
  if (!from || typeof from !== 'string' || !from.startsWith('did:')) {
    throw new Error('DIDComm message requires a valid "from" DID');
  }
  if (!to) {
    throw new Error('DIDComm message requires a "to" field');
  }
  if (!body || typeof body !== 'object') {
    throw new Error('DIDComm message requires a "body" object');
  }
  
  // Normalize "to" to array (DIDComm v2 requirement)
  const toArray = Array.isArray(to) ? to : [to];
  
  // Validate all recipients are DIDs
  for (const recipient of toArray) {
    if (typeof recipient !== 'string' || !recipient.startsWith('did:')) {
      throw new Error(`Invalid recipient DID: ${recipient}`);
    }
  }
  
  // Build the message
  const message = {
    // Unique message identifier
    id: id || crypto.randomUUID(),
    
    // DIDComm message type URI - defines the protocol/semantics
    type: type,
    
    // Sender's DID
    from: from,
    
    // Recipients' DIDs (always an array per DIDComm v2 spec)
    to: toArray,
    
    // Unix timestamp in seconds (DIDComm v2 uses seconds, not ISO string)
    created_time: Math.floor(Date.now() / 1000),
    
    // Application-specific payload
    body: body,
  };
  
  // Add thread ID if provided (for ACKs, responses, etc.)
  // thid links this message to an existing conversation thread
  if (thid) {
    message.thid = thid;
  }
  
  return message;
}

/**
 * Build an ACK message for a received DIDComm message.
 * 
 * @param {Object} originalMessage - The message being acknowledged
 * @param {string} senderDid - DID of the ACK sender (receiver of original)
 * @returns {Object} DIDComm ACK message
 */
export function buildAckMessage(originalMessage, senderDid) {
  return buildDidCommMessage({
    type: DIDCOMM_TYPES.ACK,
    from: senderDid,
    to: originalMessage.from, // ACK goes back to original sender
    body: {
      status: 'received',
      received_at: Math.floor(Date.now() / 1000),
    },
    // thid references the original message ID to correlate the ACK
    thid: originalMessage.id,
  });
}

/**
 * Build a basic text message.
 * 
 * @param {string} from - Sender DID
 * @param {string} to - Recipient DID
 * @param {string} text - Message text
 * @param {string} [thid] - Optional thread ID for reply
 * @returns {Object} DIDComm basic message
 */
export function buildBasicMessage(from, to, text, thid) {
  return buildDidCommMessage({
    type: DIDCOMM_TYPES.BASIC_MESSAGE,
    from,
    to,
    body: { text },
    thid,
  });
}

/**
 * Build an approval request message.
 * 
 * @param {string} from - Requester DID
 * @param {string} to - Approver DID
 * @param {Object} requestData - Data requiring approval
 * @returns {Object} DIDComm approval request message
 */
export function buildApprovalRequest(from, to, requestData) {
  return buildDidCommMessage({
    type: DIDCOMM_TYPES.APPROVAL_REQUEST,
    from,
    to,
    body: {
      request_type: requestData.type || 'generic',
      request_data: requestData,
    },
  });
}

/**
 * Build an approval response message.
 * 
 * @param {Object} originalRequest - The approval request being responded to
 * @param {string} responderDid - DID of the responder
 * @param {boolean} approved - Whether the request was approved
 * @param {string} [reason] - Optional reason for decision
 * @returns {Object} DIDComm approval response message
 */
export function buildApprovalResponse(originalRequest, responderDid, approved, reason) {
  return buildDidCommMessage({
    type: DIDCOMM_TYPES.APPROVAL_RESPONSE,
    from: responderDid,
    to: originalRequest.from, // Response goes back to requester
    body: {
      approved: approved,
      reason: reason || null,
      responded_at: Math.floor(Date.now() / 1000),
    },
    // thid links response to the original request
    thid: originalRequest.id,
  });
}

// ============================================================================
// Message Validation
// ============================================================================

/**
 * Validate that a message conforms to DIDComm v2 structure.
 * 
 * @param {Object} message - Message to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateDidCommMessage(message) {
  const errors = [];
  
  if (!message || typeof message !== 'object') {
    return { valid: false, errors: ['Message must be an object'] };
  }
  
  // Required fields
  if (!message.id || typeof message.id !== 'string') {
    errors.push('Missing or invalid "id" field');
  }
  
  if (!message.type || typeof message.type !== 'string') {
    errors.push('Missing or invalid "type" field');
  } else if (!message.type.startsWith('https://')) {
    errors.push('"type" should be a URI (https://...)');
  }
  
  if (!message.from || typeof message.from !== 'string') {
    errors.push('Missing or invalid "from" field');
  } else if (!message.from.startsWith('did:')) {
    errors.push('"from" must be a DID');
  }
  
  if (!message.to) {
    errors.push('Missing "to" field');
  } else if (!Array.isArray(message.to)) {
    errors.push('"to" must be an array');
  } else {
    message.to.forEach((recipient, i) => {
      if (!recipient.startsWith('did:')) {
        errors.push(`"to[${i}]" must be a DID`);
      }
    });
  }
  
  if (!message.body || typeof message.body !== 'object') {
    errors.push('Missing or invalid "body" field');
  }
  
  if (message.created_time !== undefined && typeof message.created_time !== 'number') {
    errors.push('"created_time" must be a Unix timestamp (number)');
  }
  
  if (message.thid !== undefined && typeof message.thid !== 'string') {
    errors.push('"thid" must be a string');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a message is an ACK message.
 * 
 * @param {Object} message - DIDComm message
 * @returns {boolean}
 */
export function isAckMessage(message) {
  return message?.type === DIDCOMM_TYPES.ACK;
}

/**
 * Check if a message is an approval request.
 * 
 * @param {Object} message - DIDComm message
 * @returns {boolean}
 */
export function isApprovalRequest(message) {
  return message?.type === DIDCOMM_TYPES.APPROVAL_REQUEST;
}

/**
 * Check if a message is an approval response.
 * 
 * @param {Object} message - DIDComm message
 * @returns {boolean}
 */
export function isApprovalResponse(message) {
  return message?.type === DIDCOMM_TYPES.APPROVAL_RESPONSE;
}

/**
 * Get the primary recipient DID (first in "to" array).
 * 
 * @param {Object} message - DIDComm message
 * @returns {string|null}
 */
export function getPrimaryRecipient(message) {
  if (Array.isArray(message?.to) && message.to.length > 0) {
    return message.to[0];
  }
  return null;
}
