// Pure message checks used by the AutoMod filters.
import { stripInvisible, visibleText } from './normalize';

const INVITE =
  /(?:https?:\/\/)?(?:www\.)?(?:discord(?:app)?\.com\/invite|discord\.gg)\/([a-z0-9-]{2,32})/giu;

/** Invite codes in a message (discord.gg/…, discord.com/invite/…). */
export function findInviteCodes(content: string): string[] {
  const codes = new Set<string>();
  for (const match of stripInvisible(content).matchAll(INVITE)) codes.add(match[1]!);
  return [...codes];
}

const URL_PATTERN = /https?:\/\/[^\s<>()[\]"']+/giu;

function isInviteUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./u, '');
  return (
    host === 'discord.gg' ||
    ((host === 'discord.com' || host === 'discordapp.com') && url.pathname.startsWith('/invite/'))
  );
}

/** Host names of the links in a message, invites excluded (they have their own filter). */
export function findLinkHosts(content: string): string[] {
  const hosts = new Set<string>();
  for (const [raw] of stripInvisible(content).matchAll(URL_PATTERN)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (isInviteUrl(url)) continue;
    hosts.add(url.hostname.toLowerCase().replace(/\.$/u, ''));
  }
  return [...hosts];
}

/** Whether `host` is `domain` or one of its subdomains. */
export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** The first host that breaks the link policy, if any. */
export function blockedHost(
  hosts: readonly string[],
  policy: { mode: 'allowlist' | 'blocklist'; domains: readonly string[] },
): string | null {
  const listed = (host: string) => policy.domains.some((domain) => hostMatches(host, domain));
  return hosts.find((host) => (policy.mode === 'allowlist' ? !listed(host) : listed(host))) ?? null;
}

/** Upper- and lowercase letters in the visible text (mentions, emoji and links left out). */
export function letterCase(content: string): { upper: number; lower: number } {
  const text = visibleText(content);
  return {
    upper: text.match(/\p{Lu}/gu)?.length ?? 0,
    lower: text.match(/\p{Ll}/gu)?.length ?? 0,
  };
}

/** Whether a message is "shouting": enough letters, and mostly capitals. */
export function isMostlyCaps(
  content: string,
  options: { minLetters: number; percent: number },
): boolean {
  const { upper, lower } = letterCase(content);
  const letters = upper + lower;
  return letters >= options.minLetters && upper * 100 >= options.percent * letters;
}

/** Distinct users and roles mentioned in a message. */
export function countMentions(content: string): number {
  const ids = new Set<string>();
  for (const match of content.matchAll(/<@(!|&)?(\d+)>/gu)) {
    ids.add(`${match[1] === '&' ? 'role' : 'user'}:${match[2]}`);
  }
  return ids.size;
}

export interface BurstEntry {
  messageId: string;
  channelId: string;
  at: number;
}

export type BurstResult =
  { type: 'burst'; entries: BurstEntry[] } | { type: 'cooldown' } | { type: 'ok' };

interface BurstState {
  entries: BurstEntry[];
  cooldownUntil: number;
}

/**
 * Counts messages per key (user, or user + content) in a sliding window. When
 * the limit is reached the whole window is returned once; messages during the
 * following window count as part of the same burst, so the user is punished
 * only once per burst.
 */
export class BurstTracker {
  private readonly state = new Map<string, BurstState>();

  record(key: string, entry: BurstEntry, limit: { max: number; windowMs: number }): BurstResult {
    const state = this.state.get(key) ?? { entries: [], cooldownUntil: 0 };
    this.state.set(key, state);
    if (entry.at < state.cooldownUntil) return { type: 'cooldown' };

    state.entries = state.entries.filter((e) => entry.at - e.at < limit.windowMs);
    state.entries.push(entry);
    if (state.entries.length < limit.max) return { type: 'ok' };

    const entries = state.entries;
    state.entries = [];
    state.cooldownUntil = entry.at + limit.windowMs;
    return { type: 'burst', entries };
  }

  /** Drops keys with nothing recent; call periodically. */
  sweep(now: number, maxWindowMs: number): void {
    for (const [key, state] of this.state) {
      const last = state.entries.at(-1)?.at ?? 0;
      if (state.cooldownUntil <= now && now - last >= maxWindowMs) this.state.delete(key);
    }
  }

  get size(): number {
    return this.state.size;
  }
}
