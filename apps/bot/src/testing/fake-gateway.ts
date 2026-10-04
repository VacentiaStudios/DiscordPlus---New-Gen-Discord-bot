// Drives a real discord.js client with hand-written gateway packets, so event
// handlers can be tested end to end without connecting to Discord.
import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Status,
  type APIGuildMember,
  type APIOverwrite,
  type APIRole,
  type APIUser,
  type Client,
  type GuildMemberFlags,
  type GuildTextBasedChannel,
  type MessageCreateOptions,
  type RoleFlags,
} from 'discord.js';
import { vi } from 'vitest';
import type { BotContext } from '../core/context';
import type { AnyEventHandler } from '../core/types';

interface PacketSink {
  status: Status;
  handlePacket(packet: { t: string; d: unknown }, shard: unknown): boolean;
}

export function rawUser(id: string, username: string, extra: Partial<APIUser> = {}): APIUser {
  return { id, username, global_name: null, avatar: null, discriminator: '0', ...extra };
}

export function rawMember(
  user: APIUser,
  roles: string[] = [],
  extra: Partial<APIGuildMember> = {},
): APIGuildMember {
  return {
    user,
    roles,
    nick: null,
    joined_at: '2026-01-01T00:00:00.000Z',
    deaf: false,
    mute: false,
    flags: 0 as GuildMemberFlags,
    ...extra,
  };
}

export function rawRole(
  id: string,
  name: string,
  permissions: bigint,
  position: number,
  extra: Partial<APIRole> = {},
): APIRole {
  return {
    id,
    name,
    color: 0,
    colors: { primary_color: 0, secondary_color: null, tertiary_color: null },
    hoist: false,
    position,
    permissions: permissions.toString(),
    managed: false,
    mentionable: false,
    flags: 0 as RoleFlags,
    ...extra,
  };
}

export function rawOverwrite(
  id: string,
  type: 'role' | 'member',
  allow: bigint,
  deny: bigint,
): APIOverwrite {
  return {
    id,
    type: type === 'role' ? OverwriteType.Role : OverwriteType.Member,
    allow: allow.toString(),
    deny: deny.toString(),
  };
}

export interface RawChannelOptions {
  type?: ChannelType;
  parentId?: string | null;
  overwrites?: APIOverwrite[];
  topic?: string | null;
  position?: number;
}

export function rawChannel(id: string, name: string, options: RawChannelOptions = {}) {
  return {
    id,
    name,
    type: options.type ?? ChannelType.GuildText,
    parent_id: options.parentId ?? null,
    permission_overwrites: options.overwrites ?? [],
    topic: options.topic ?? null,
    nsfw: false,
    rate_limit_per_user: 0,
    position: options.position ?? 0,
  };
}

export const BASE_PERMISSIONS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.AttachFiles |
  PermissionFlagsBits.ReadMessageHistory;

export interface RawGuildOptions {
  id: string;
  ownerId: string;
  name?: string;
  roles: APIRole[];
  channels: ReturnType<typeof rawChannel>[];
  members: APIGuildMember[];
  voiceStates?: { user_id: string; channel_id: string }[];
}

export function rawGuild(options: RawGuildOptions) {
  return {
    id: options.id,
    name: options.name ?? 'Test Sunucusu',
    icon: null,
    owner_id: options.ownerId,
    unavailable: false,
    member_count: options.members.length,
    joined_at: '2026-01-01T00:00:00.000Z',
    large: false,
    features: [],
    emojis: [],
    stickers: [],
    roles: options.roles,
    channels: options.channels,
    threads: [],
    members: options.members,
    presences: [],
    stage_instances: [],
    guild_scheduled_events: [],
    soundboard_sounds: [],
    voice_states: (options.voiceStates ?? []).map((state) => ({
      ...state,
      session_id: `session-${state.user_id}`,
      deaf: false,
      mute: false,
      self_deaf: false,
      self_mute: false,
      self_video: false,
      suppress: false,
      request_to_speak_timestamp: null,
    })),
  };
}

export interface RestCall {
  method: string;
  route: string;
  body?: unknown;
}

export interface FakeGateway {
  dispatch(type: string, data: unknown): void;
  /** Replaces `send` on a channel and records what was sent to it. */
  captureSends(
    channelId: string,
  ): ReturnType<typeof vi.fn<(options: MessageCreateOptions) => Promise<unknown>>>;
  /** Answers every REST request with an empty success and records it. */
  captureRest(): RestCall[];
}

/**
 * Marks the client ready as `botUser` and returns a dispatcher for gateway
 * events. The client must not be logged in.
 */
export function connectFakeGateway(client: Client, botUser: APIUser): FakeGateway {
  const ws = client.ws as unknown as PacketSink;
  ws.status = Status.Ready;
  const shard = { id: 0, status: Status.Ready, checkReady: () => undefined };
  const dispatch = (type: string, data: unknown) => {
    ws.handlePacket({ t: type, d: data }, shard);
  };
  dispatch('READY', { user: botUser, guilds: [], application: { id: botUser.id, flags: 0 } });

  return {
    dispatch,
    captureSends(channelId) {
      const channel = client.channels.cache.get(channelId) as GuildTextBasedChannel | undefined;
      if (!channel) throw new Error(`Unknown channel ${channelId}`);
      const send = vi.fn((_options: MessageCreateOptions) =>
        Promise.resolve({ id: 'sent', channelId, delete: () => Promise.resolve() }),
      );
      Object.assign(channel, { send });
      return send;
    },
    captureRest() {
      const calls: RestCall[] = [];
      const request = vi.fn((options: { method: string; fullRoute: string; body?: unknown }) => {
        calls.push({ method: options.method, route: options.fullRoute, body: options.body });
        return Promise.resolve(undefined);
      });
      Object.assign(client.rest, { request });
      return calls;
    },
  };
}

/**
 * Subscribes module event handlers to the client; `settled()` waits until every
 * handler started so far has finished.
 */
export function runHandlers(
  client: Client,
  ctx: BotContext,
  handlers: readonly AnyEventHandler[],
): { settled(): Promise<void> } {
  const pending: Promise<unknown>[] = [];
  for (const handler of handlers) {
    const untyped = handler as unknown as {
      handle(ctx: BotContext, ...args: unknown[]): Promise<void> | void;
    };
    client.on(handler.event, (...args: unknown[]) => {
      pending.push(Promise.resolve(untyped.handle(ctx, ...args)));
    });
  }
  return {
    async settled() {
      while (pending.length > 0) await Promise.all(pending.splice(0));
    },
  };
}
