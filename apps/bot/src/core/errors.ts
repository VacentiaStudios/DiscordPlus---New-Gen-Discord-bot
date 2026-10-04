import { randomBytes } from 'node:crypto';
import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';
import { format, tr } from '../locales/tr';

/** An error whose message is meant for the user who triggered the interaction. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

const DISCORD_ERROR_MESSAGES: Partial<Record<number, string>> = {
  [RESTJSONErrorCodes.MissingPermissions]: tr.errors.missingPermissions,
  [RESTJSONErrorCodes.MissingAccess]: tr.errors.missingAccess,
  [RESTJSONErrorCodes.UnknownMember]: tr.errors.unknownMember,
  [RESTJSONErrorCodes.UnknownUser]: tr.errors.unknownUser,
  [RESTJSONErrorCodes.UnknownBan]: tr.errors.unknownBan,
  [RESTJSONErrorCodes.UnknownMessage]: tr.errors.unknownMessage,
  [RESTJSONErrorCodes.UnknownChannel]: tr.errors.unknownChannel,
  [RESTJSONErrorCodes.CannotSendMessagesToThisUser]: tr.errors.cannotDm,
};

export interface DescribedError {
  message: string;
  /** False for bugs and unknown failures that should be logged with a reference id. */
  expected: boolean;
  /** Reference shown to the user for unexpected errors. */
  errorId?: string;
}

export function describeError(error: unknown): DescribedError {
  if (error instanceof UserError) return { message: error.message, expected: true };
  if (error instanceof DiscordAPIError && typeof error.code === 'number') {
    const message = DISCORD_ERROR_MESSAGES[error.code];
    if (message) return { message, expected: true };
  }
  const errorId = randomBytes(4).toString('hex');
  return { message: format(tr.errors.unexpected, { id: errorId }), expected: false, errorId };
}

export function isDiscordError(error: unknown, code: RESTJSONErrorCodes): boolean {
  return error instanceof DiscordAPIError && error.code === code;
}
