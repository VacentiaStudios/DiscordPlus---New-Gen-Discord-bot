import type { AutomodFilter, AutomodSettings } from '@discordplus/shared';
import { tr } from '../../locales/tr';
import {
  blockedHost,
  countMentions,
  findInviteCodes,
  findLinkHosts,
  isMostlyCaps,
  letterCase,
} from './detectors';
import type { ProfanityMatcher } from './words';

/** Filters that look at a single message's text (and so also apply to edits). */
export type ContentFilter = Exclude<AutomodFilter, 'spam' | 'duplicates'>;
export const CONTENT_FILTERS: readonly ContentFilter[] = [
  'invites',
  'links',
  'profanity',
  'mentions',
  'caps',
];

export interface ContentHit {
  filter: ContentFilter;
  /** What matched, for the moderators: an invite, a host, a word, a count. */
  detail: string;
}

export interface ContentContext {
  guildId: string;
  vanityCode: string | null;
  profanity(settings: AutomodSettings['profanity']): ProfanityMatcher;
  inviteGuildId(code: string): Promise<string | null | undefined>;
}

async function foreignInvite(
  content: string,
  settings: AutomodSettings['invites'],
  context: ContentContext,
): Promise<string | null> {
  for (const code of findInviteCodes(content)) {
    if (!settings.allowOwnInvites) return code;
    if (context.vanityCode && code.toLowerCase() === context.vanityCode.toLowerCase()) continue;
    const guildId = await context.inviteGuildId(code);
    // undefined: Discord could not be asked; let the message through.
    if (guildId !== undefined && guildId !== context.guildId) return code;
  }
  return null;
}

/** The first content filter a message breaks, checked in a fixed order. */
export async function checkContent(
  content: string,
  settings: AutomodSettings,
  context: ContentContext,
): Promise<ContentHit | null> {
  if (!content) return null;
  if (settings.invites.enabled) {
    const code = await foreignInvite(content, settings.invites, context);
    if (code) return { filter: 'invites', detail: `discord.gg/${code}` };
  }
  if (settings.links.enabled) {
    const host = blockedHost(findLinkHosts(content), settings.links);
    if (host) return { filter: 'links', detail: host };
  }
  if (settings.profanity.enabled) {
    const word = context.profanity(settings.profanity).find(content);
    if (word) return { filter: 'profanity', detail: word };
  }
  if (settings.mentions.enabled) {
    const count = countMentions(content);
    if (count >= settings.mentions.maxMentions) {
      return { filter: 'mentions', detail: tr.automod.details.mentions(count) };
    }
  }
  if (settings.caps.enabled && isMostlyCaps(content, settings.caps)) {
    const { upper, lower } = letterCase(content);
    return {
      filter: 'caps',
      detail: tr.automod.details.caps(Math.round((upper * 100) / (upper + lower))),
    };
  }
  return null;
}
