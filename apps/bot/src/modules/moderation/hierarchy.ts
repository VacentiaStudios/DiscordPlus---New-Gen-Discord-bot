import type { GuildMember, User } from 'discord.js';
import { UserError } from '../../core/errors';
import { tr } from '../../locales/tr';

export type HierarchyProblem = 'self' | 'bot' | 'owner' | 'moderatorRole' | 'botRole';

export interface HierarchyInput {
  actorId: string;
  actorIsOwner: boolean;
  actorTopRole: number;
  botId: string;
  botTopRole: number;
  targetId: string;
  targetIsOwner: boolean;
  /** Position of the target's highest role; null when the target is not a member. */
  targetTopRole: number | null;
}

/**
 * Whether the actor may moderate the target. Members can only act on members
 * whose highest role is strictly below theirs (the owner is exempt), and the bot
 * can only act below its own highest role.
 */
export function checkHierarchy(input: HierarchyInput): HierarchyProblem | null {
  if (input.targetId === input.actorId) return 'self';
  if (input.targetId === input.botId) return 'bot';
  if (input.targetIsOwner) return 'owner';
  if (input.targetTopRole === null) return null;
  if (!input.actorIsOwner && input.targetTopRole >= input.actorTopRole) return 'moderatorRole';
  if (input.targetTopRole >= input.botTopRole) return 'botRole';
  return null;
}

/** Throws a user-facing error when `actor` may not moderate `target` (a user or member). */
export function assertCanModerate(
  actor: GuildMember,
  target: User,
  targetMember: GuildMember | null,
): void {
  const guild = actor.guild;
  const me = guild.members.me;
  const problem = checkHierarchy({
    actorId: actor.id,
    actorIsOwner: guild.ownerId === actor.id,
    actorTopRole: actor.roles.highest.position,
    botId: me?.id ?? guild.client.user.id,
    botTopRole: me?.roles.highest.position ?? 0,
    targetId: target.id,
    targetIsOwner: guild.ownerId === target.id,
    targetTopRole: targetMember ? targetMember.roles.highest.position : null,
  });
  if (problem) throw new UserError(tr.hierarchy[problem]);
}
