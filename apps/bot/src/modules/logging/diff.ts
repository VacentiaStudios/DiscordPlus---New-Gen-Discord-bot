import { PermissionsBitField } from 'discord.js';
import { permissionLabel } from '../../core/permissions';
import { tr } from '../../locales/tr';

const t = tr.logging;

export interface FieldChange {
  label: string;
  before: string;
  after: string;
}

export function diffIds(
  before: readonly string[],
  after: readonly string[],
): { added: string[]; removed: string[] } {
  const old = new Set(before);
  const next = new Set(after);
  return {
    added: after.filter((id) => !old.has(id)),
    removed: before.filter((id) => !next.has(id)),
  };
}

/** Turkish labels of the permissions set in `bits`. */
function flagNames(bits: bigint): string[] {
  return new PermissionsBitField(bits).toArray().map(permissionLabel);
}

/** Turkish names of permissions gained and lost between two bitfields. */
export function permissionChanges(
  before: bigint,
  after: bigint,
): { added: string[]; removed: string[] } {
  return { added: flagNames(after & ~before), removed: flagNames(before & ~after) };
}

export interface OverwriteSnapshot {
  id: string;
  type: 'role' | 'member';
  allow: bigint;
  deny: bigint;
}

export interface OverwriteChange {
  id: string;
  type: 'role' | 'member';
  allowed: string[];
  denied: string[];
  reset: string[];
}

/** Per role/member: which permissions became allowed, denied or reset to inherit. */
export function overwriteChanges(
  before: readonly OverwriteSnapshot[],
  after: readonly OverwriteSnapshot[],
): OverwriteChange[] {
  const empty = (o: Pick<OverwriteSnapshot, 'id' | 'type'>): OverwriteSnapshot => ({
    ...o,
    allow: 0n,
    deny: 0n,
  });
  const ids = new Map<string, Pick<OverwriteSnapshot, 'id' | 'type'>>();
  for (const o of [...before, ...after]) ids.set(o.id, { id: o.id, type: o.type });

  const changes: OverwriteChange[] = [];
  for (const target of ids.values()) {
    const old = before.find((o) => o.id === target.id) ?? empty(target);
    const next = after.find((o) => o.id === target.id) ?? empty(target);
    const allowed = flagNames(next.allow & ~old.allow);
    const denied = flagNames(next.deny & ~old.deny);
    const reset = flagNames((old.allow | old.deny) & ~(next.allow | next.deny));
    if (allowed.length || denied.length || reset.length) {
      changes.push({ id: target.id, type: target.type, allowed, denied, reset });
    }
  }
  return changes;
}

export interface ChannelSnapshot {
  name: string;
  topic: string | null;
  nsfw: boolean;
  rateLimitPerUser: number;
  parentName: string | null;
}

function yesNo(value: boolean): string {
  return value ? t.yes : t.no;
}

function formatSeconds(seconds: number): string {
  return seconds === 0 ? t.off : `${seconds} sn`;
}

export function channelChanges(before: ChannelSnapshot, after: ChannelSnapshot): FieldChange[] {
  const changes: FieldChange[] = [];
  const push = (label: string, a: string, b: string) => {
    if (a !== b) changes.push({ label, before: a, after: b });
  };
  push(t.name, before.name, after.name);
  push(t.topic, before.topic ?? t.none, after.topic ?? t.none);
  push(t.nsfw, yesNo(before.nsfw), yesNo(after.nsfw));
  push(t.slowmode, formatSeconds(before.rateLimitPerUser), formatSeconds(after.rateLimitPerUser));
  push(t.category, before.parentName ?? t.none, after.parentName ?? t.none);
  return changes;
}

export interface RoleSnapshot {
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
}

export function roleChanges(before: RoleSnapshot, after: RoleSnapshot): FieldChange[] {
  const changes: FieldChange[] = [];
  const push = (label: string, a: string, b: string) => {
    if (a !== b) changes.push({ label, before: a, after: b });
  };
  const hex = (color: number) => (color ? `#${color.toString(16).padStart(6, '0')}` : t.none);
  push(t.name, before.name, after.name);
  push(t.color, hex(before.color), hex(after.color));
  push(t.hoist, yesNo(before.hoist), yesNo(after.hoist));
  push(t.mentionable, yesNo(before.mentionable), yesNo(after.mentionable));
  return changes;
}

export interface ProfileSnapshot {
  username: string;
  globalName: string | null;
  avatar: string | null;
}

export interface UserProfileChange {
  username?: { before: string; after: string };
  displayName?: { before: string | null; after: string | null };
  avatarChanged: boolean;
}

/** Username, display name and avatar changes; null when none of them changed. */
export function profileChange(
  before: ProfileSnapshot,
  after: ProfileSnapshot,
): UserProfileChange | null {
  const change: UserProfileChange = { avatarChanged: before.avatar !== after.avatar };
  if (before.username !== after.username) {
    change.username = { before: before.username, after: after.username };
  }
  if (before.globalName !== after.globalName) {
    change.displayName = { before: before.globalName, after: after.globalName };
  }
  return change.username || change.displayName || change.avatarChanged ? change : null;
}

export interface VoiceSnapshot {
  channelId: string | null;
  serverMute: boolean | null;
  serverDeaf: boolean | null;
}

export type VoiceEvent =
  | { kind: 'joined'; channelId: string }
  | { kind: 'left'; channelId: string }
  | { kind: 'moved'; fromId: string; toId: string }
  | { kind: 'serverMute' | 'serverDeaf'; enabled: boolean; channelId: string };

/**
 * What a voice state update means for the log. Self mute/deafen, streaming and
 * camera changes are left out on purpose: they are frequent and rarely useful.
 */
export function voiceEvents(before: VoiceSnapshot, after: VoiceSnapshot): VoiceEvent[] {
  const events: VoiceEvent[] = [];
  if (before.channelId !== after.channelId) {
    if (before.channelId && after.channelId) {
      events.push({ kind: 'moved', fromId: before.channelId, toId: after.channelId });
    } else if (after.channelId) {
      events.push({ kind: 'joined', channelId: after.channelId });
    } else if (before.channelId) {
      events.push({ kind: 'left', channelId: before.channelId });
    }
  }
  // Mute and deafen flags are only meaningful while connected before and after.
  if (before.channelId && after.channelId) {
    for (const kind of ['serverMute', 'serverDeaf'] as const) {
      const old = before[kind];
      const next = after[kind];
      if (old !== null && next !== null && old !== next) {
        events.push({ kind, enabled: next, channelId: after.channelId });
      }
    }
  }
  return events;
}
