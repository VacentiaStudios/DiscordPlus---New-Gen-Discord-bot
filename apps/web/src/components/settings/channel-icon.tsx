import {
  Folder,
  Hash,
  ImageIcon,
  Megaphone,
  MessagesSquare,
  Radio,
  Volume2,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import { CHANNEL_TYPE } from '@/lib/channels';

const ICONS: Partial<Record<number, LucideIcon>> = {
  [CHANNEL_TYPE.category]: Folder,
  [CHANNEL_TYPE.voice]: Volume2,
  [CHANNEL_TYPE.stage]: Radio,
  [CHANNEL_TYPE.announcement]: Megaphone,
  [CHANNEL_TYPE.forum]: MessagesSquare,
  [CHANNEL_TYPE.media]: ImageIcon,
};

/** Discord-style icon for a channel type; text and unknown channels get a hash. */
export function ChannelIcon({ channelType, ...props }: { channelType?: number } & LucideProps) {
  const Icon = (channelType === undefined ? undefined : ICONS[channelType]) ?? Hash;
  return <Icon aria-hidden {...props} />;
}
