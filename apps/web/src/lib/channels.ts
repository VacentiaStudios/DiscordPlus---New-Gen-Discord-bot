/** Discord channel types the panel deals with. */
export const CHANNEL_TYPE = {
  text: 0,
  voice: 2,
  category: 4,
  announcement: 5,
  stage: 13,
  forum: 15,
  media: 16,
} as const;

export interface ChannelOption {
  id: string;
  name: string;
  type: number;
}

export interface ChannelGroup {
  /** Category name, or null for channels outside a category. */
  category: string | null;
  channels: ChannelOption[];
}
