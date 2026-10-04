import {
  CASE_SOURCE_LABELS,
  CASE_TYPE_LABELS,
  type CaseSource,
  type CaseType,
} from '@discordplus/shared';
import { Badge } from '@/components/ui/badge';

const VARIANTS: Record<CaseType, 'warning' | 'destructive' | 'success' | 'secondary'> = {
  warn: 'warning',
  timeout: 'warning',
  untimeout: 'success',
  kick: 'warning',
  ban: 'destructive',
  unban: 'success',
};

export function CaseTypeBadge({ type }: { type: CaseType }) {
  return <Badge variant={VARIANTS[type]}>{CASE_TYPE_LABELS[type]}</Badge>;
}

export function CaseSourceBadge({ source }: { source: CaseSource }) {
  return <Badge variant="outline">{CASE_SOURCE_LABELS[source]}</Badge>;
}
