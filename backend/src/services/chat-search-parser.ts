/**
 * Chat Search Parser (Phase 2H)
 *
 * Extracts enterprise search filter tokens from raw query strings:
 * - from:<user_name_or_email_or_id>
 * - has:file
 * - has:task
 * - has:mention
 * - before:<YYYY-MM-DD>
 * - after:<YYYY-MM-DD>
 * - in:<channel_or_conv_id_or_title>
 *
 * Retains remaining clean text as free-text search term.
 */

export interface ParsedChatSearchQuery {
  rawQuery: string;
  cleanText: string;
  from?: string;
  hasFile?: boolean;
  hasTask?: boolean;
  hasMention?: boolean;
  before?: string;
  after?: string;
  channel?: string;
}

export class ChatSearchParser {
  /**
   * Parse a raw user search query string into structured filter criteria and free-text
   */
  static parse(raw: string): ParsedChatSearchQuery {
    if (!raw || typeof raw !== 'string') {
      return { rawQuery: '', cleanText: '' };
    }

    const input = raw.trim();
    let clean = input;

    let from: string | undefined;
    let hasFile: boolean | undefined;
    let hasTask: boolean | undefined;
    let hasMention: boolean | undefined;
    let before: string | undefined;
    let after: string | undefined;
    let channel: string | undefined;

    // 1. Match from:token (quotes or continuous string)
    const fromMatch = clean.match(/(?:^|\s)from:(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
    if (fromMatch) {
      from = fromMatch[1] || fromMatch[2] || fromMatch[3];
      clean = clean.replace(fromMatch[0], ' ');
    }

    // 2. Match has:file
    if (/(?:^|\s)has:file(?:\s|$)/i.test(clean)) {
      hasFile = true;
      clean = clean.replace(/(?:^|\s)has:file(?:\s|$)/i, ' ');
    }

    // 3. Match has:task
    if (/(?:^|\s)has:task(?:\s|$)/i.test(clean)) {
      hasTask = true;
      clean = clean.replace(/(?:^|\s)has:task(?:\s|$)/i, ' ');
    }

    // 4. Match has:mention
    if (/(?:^|\s)has:mention(?:\s|$)/i.test(clean)) {
      hasMention = true;
      clean = clean.replace(/(?:^|\s)has:mention(?:\s|$)/i, ' ');
    }

    // 5. Match before:YYYY-MM-DD (or date string)
    const beforeMatch = clean.match(/(?:^|\s)before:(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
    if (beforeMatch) {
      before = beforeMatch[1] || beforeMatch[2] || beforeMatch[3];
      clean = clean.replace(beforeMatch[0], ' ');
    }

    // 6. Match after:YYYY-MM-DD (or date string)
    const afterMatch = clean.match(/(?:^|\s)after:(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
    if (afterMatch) {
      after = afterMatch[1] || afterMatch[2] || afterMatch[3];
      clean = clean.replace(afterMatch[0], ' ');
    }

    // 7. Match in:channel (quotes or continuous string)
    const inMatch = clean.match(/(?:^|\s)in:(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
    if (inMatch) {
      channel = inMatch[1] || inMatch[2] || inMatch[3];
      clean = clean.replace(inMatch[0], ' ');
    }

    // Clean up residual whitespace
    const cleanText = clean.replace(/\s+/g, ' ').trim();

    return {
      rawQuery: input,
      cleanText,
      from,
      hasFile,
      hasTask,
      hasMention,
      before,
      after,
      channel,
    };
  }
}
