import type { BotContext } from './context';

/** Link to a guild's page in the web panel. */
export function panelUrl(ctx: Pick<BotContext, 'env'>, guildId: string, section = ''): string {
  return new URL(`/panel/${guildId}${section}`, ctx.env.WEB_URL).toString();
}
