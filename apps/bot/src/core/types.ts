import type {
  AnySelectMenuInteraction,
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ClientEvents,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  UserContextMenuCommandInteraction,
} from 'discord.js';
import type { BotContext } from './context';

export interface SlashCommand {
  type: 'slash';
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute(interaction: ChatInputCommandInteraction<'cached'>, ctx: BotContext): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction<'cached'>, ctx: BotContext): Promise<void>;
}

export interface UserContextCommand {
  type: 'user';
  data: RESTPostAPIContextMenuApplicationCommandsJSONBody;
  execute(interaction: UserContextMenuCommandInteraction<'cached'>, ctx: BotContext): Promise<void>;
}

export interface MessageContextCommand {
  type: 'message';
  data: RESTPostAPIContextMenuApplicationCommandsJSONBody;
  execute(
    interaction: MessageContextMenuCommandInteraction<'cached'>,
    ctx: BotContext,
  ): Promise<void>;
}

export type Command = SlashCommand | UserContextCommand | MessageContextCommand;

export type ComponentInteraction =
  | ButtonInteraction<'cached'>
  | AnySelectMenuInteraction<'cached'>
  | ModalSubmitInteraction<'cached'>;

/**
 * Handles buttons, select menus and modals. Custom IDs have the form
 * `prefix:arg1:arg2`; the handler receives the arguments after the prefix.
 */
export interface ComponentHandler {
  prefix: string;
  handle(interaction: ComponentInteraction, args: string[], ctx: BotContext): Promise<void>;
}

export interface EventHandler<K extends keyof ClientEvents> {
  event: K;
  once?: boolean;
  handle(ctx: BotContext, ...args: ClientEvents[K]): Promise<void> | void;
}

export type AnyEventHandler = { [K in keyof ClientEvents]: EventHandler<K> }[keyof ClientEvents];

export function defineEvent<K extends keyof ClientEvents>(
  handler: EventHandler<K>,
): EventHandler<K> {
  return handler;
}

export interface BotModule {
  name: string;
  commands?: Command[];
  components?: ComponentHandler[];
  events?: AnyEventHandler[];
  /** Runs once the client is ready. */
  start?(ctx: BotContext): Promise<void> | void;
  /** Runs on shutdown. */
  stop?(ctx: BotContext): Promise<void> | void;
}
