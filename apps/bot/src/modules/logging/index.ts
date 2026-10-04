import type { BotModule } from '../../core/types';
import { messageBulkDeleteEvent, messageDeleteEvent, messageUpdateEvent } from './events/messages';
import {
  memberAddEvent,
  memberRemoveEvent,
  memberUpdateEvent,
  userUpdateEvent,
} from './events/members';
import {
  channelCreateEvent,
  channelDeleteEvent,
  channelUpdateEvent,
  guildUpdateEvent,
  roleCreateEvent,
  roleDeleteEvent,
  roleUpdateEvent,
} from './events/server';
import { voiceStateEvent } from './events/voice';

/**
 * Message, member, server and voice logs. Each event goes to the channel the
 * guild picked for its category in the web panel; moderation logs are written
 * by the moderation service.
 */
export const loggingModule: BotModule = {
  name: 'logging',
  events: [
    messageDeleteEvent,
    messageBulkDeleteEvent,
    messageUpdateEvent,
    memberAddEvent,
    memberRemoveEvent,
    memberUpdateEvent,
    userUpdateEvent,
    channelCreateEvent,
    channelDeleteEvent,
    channelUpdateEvent,
    roleCreateEvent,
    roleDeleteEvent,
    roleUpdateEvent,
    guildUpdateEvent,
    voiceStateEvent,
  ],
};
