// Converts AutoMod settings to editable form state (durations and lists as text) and back.
import {
  actionUsesDuration,
  formatDurationInput,
  parseDuration,
  type AutomodAction,
  type AutomodFilter,
  type AutomodSettings,
} from '@discordplus/shared';
import type { IssueMap } from '@/components/settings/use-save-settings';

export interface FilterForm {
  enabled: boolean;
  action: AutomodAction;
  /** Duration as typed (e.g. "10dk"); only used for timeouts and bans. */
  duration: string;
}

export interface AutomodFormState {
  spam: FilterForm & { maxMessages: string; perSeconds: string };
  duplicates: FilterForm & { maxDuplicates: string; perSeconds: string };
  profanity: FilterForm & { useDefaultList: boolean; words: string; allowedWords: string };
  invites: FilterForm & { allowOwnInvites: boolean };
  links: FilterForm & { mode: 'allowlist' | 'blocklist'; domains: string };
  caps: FilterForm & { minLetters: string; percent: string };
  mentions: FilterForm & { maxMentions: string };
  exemptModerators: boolean;
  exemptRoleIds: string[];
  exemptChannelIds: string[];
  notifyChannel: boolean;
}

/** One entry per line (or comma), trimmed, without duplicates. */
export function parseList(text: string, options: { lowercase?: boolean } = {}): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of text.split(/[\n,]/u)) {
    const item = options.lowercase ? raw.trim().toLowerCase() : raw.trim();
    const key = item.toLocaleLowerCase('tr');
    if (!item || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

function filterForm(
  filter: Pick<FilterForm, 'enabled' | 'action'> & { durationMs: number | null },
) {
  return {
    enabled: filter.enabled,
    action: filter.action,
    duration: filter.durationMs ? formatDurationInput(filter.durationMs) : '',
  };
}

export function toFormState(settings: AutomodSettings): AutomodFormState {
  const { spam, duplicates, profanity, invites, links, caps, mentions } = settings;
  return {
    spam: {
      ...filterForm(spam),
      maxMessages: String(spam.maxMessages),
      perSeconds: String(spam.perSeconds),
    },
    duplicates: {
      ...filterForm(duplicates),
      maxDuplicates: String(duplicates.maxDuplicates),
      perSeconds: String(duplicates.perSeconds),
    },
    profanity: {
      ...filterForm(profanity),
      useDefaultList: profanity.useDefaultList,
      words: profanity.words.join('\n'),
      allowedWords: profanity.allowedWords.join('\n'),
    },
    invites: { ...filterForm(invites), allowOwnInvites: invites.allowOwnInvites },
    links: { ...filterForm(links), mode: links.mode, domains: links.domains.join('\n') },
    caps: {
      ...filterForm(caps),
      minLetters: String(caps.minLetters),
      percent: String(caps.percent),
    },
    mentions: { ...filterForm(mentions), maxMentions: String(mentions.maxMentions) },
    exemptModerators: settings.exemptModerators,
    exemptRoleIds: settings.exemptRoleIds,
    exemptChannelIds: settings.exemptChannelIds,
    notifyChannel: settings.notifyChannel,
  };
}

/** Empty inputs become NaN so the schema reports them instead of silently using 0. */
function number(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

/**
 * The settings the form describes. Durations that cannot be parsed are reported
 * as issues, since the schema would only see them as missing.
 */
export function toSettings(state: AutomodFormState): { value: AutomodSettings; issues: IssueMap } {
  const issues: IssueMap = {};
  const base = (filter: AutomodFilter, form: FilterForm) => {
    let durationMs: number | null = null;
    if (actionUsesDuration(form.action) && form.duration.trim()) {
      durationMs = parseDuration(form.duration);
      if (durationMs === null) issues[`${filter}.durationMs`] = 'Geçersiz süre (ör. 30dk, 2sa, 1g)';
    }
    return { enabled: form.enabled, action: form.action, durationMs };
  };
  const { spam, duplicates, profanity, invites, links, caps, mentions } = state;
  return {
    issues,
    value: {
      spam: {
        ...base('spam', spam),
        maxMessages: number(spam.maxMessages),
        perSeconds: number(spam.perSeconds),
      },
      duplicates: {
        ...base('duplicates', duplicates),
        maxDuplicates: number(duplicates.maxDuplicates),
        perSeconds: number(duplicates.perSeconds),
      },
      profanity: {
        ...base('profanity', profanity),
        useDefaultList: profanity.useDefaultList,
        words: parseList(profanity.words),
        allowedWords: parseList(profanity.allowedWords),
      },
      invites: { ...base('invites', invites), allowOwnInvites: invites.allowOwnInvites },
      links: {
        ...base('links', links),
        mode: links.mode,
        domains: parseList(links.domains, { lowercase: true }),
      },
      caps: {
        ...base('caps', caps),
        minLetters: number(caps.minLetters),
        percent: number(caps.percent),
      },
      mentions: { ...base('mentions', mentions), maxMentions: number(mentions.maxMentions) },
      exemptModerators: state.exemptModerators,
      exemptRoleIds: state.exemptRoleIds,
      exemptChannelIds: state.exemptChannelIds,
      notifyChannel: state.notifyChannel,
    },
  };
}

/** The first problem with a list field, naming the offending entry. */
export function listIssue(
  issues: IssueMap,
  path: string,
  items: readonly string[],
): string | undefined {
  for (const [key, message] of Object.entries(issues)) {
    if (key === path) return message;
    if (!key.startsWith(`${path}.`)) continue;
    const item = items[Number(key.slice(path.length + 1))];
    return item === undefined ? message : `“${item}”: ${message}`;
  }
  return undefined;
}
