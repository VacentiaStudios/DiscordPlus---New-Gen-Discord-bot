'use client';

import { Plus, X } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface MultiSelectOption {
  id: string;
  /** Shown on the chip. */
  name: string;
  /** Shown in the picker; defaults to `name`. */
  label?: string;
  icon?: React.ReactNode;
}

export interface MultiSelectGroup {
  label: string | null;
  options: MultiSelectOption[];
}

export interface MultiSelectProps {
  id?: string;
  groups: MultiSelectGroup[];
  value: string[];
  onChange: (value: string[]) => void;
  max: number;
  addLabel: string;
  emptyLabel: string;
  /** Name of a chosen id that no longer exists. */
  unknownLabel: string;
  removeLabel: (name: string) => string;
}

/** Chosen items as removable chips, plus a picker to add more. */
export function MultiSelect({
  id,
  groups,
  value,
  onChange,
  max,
  addLabel,
  emptyLabel,
  unknownLabel,
  removeLabel,
}: MultiSelectProps) {
  const chosen = new Set(value);
  const byId = new Map(groups.flatMap((g) => g.options).map((o) => [o.id, o]));
  const available = groups
    .map((g) => ({ ...g, options: g.options.filter((o) => !chosen.has(o.id)) }))
    .filter((g) => g.options.length > 0);

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((itemId) => {
            const option = byId.get(itemId);
            const name = option?.name ?? unknownLabel;
            return (
              <li key={itemId}>
                <Badge variant="secondary" className="h-7 gap-1.5 pr-1 text-sm">
                  {option?.icon}
                  {name}
                  <button
                    type="button"
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={removeLabel(name)}
                    onClick={() => onChange(value.filter((v) => v !== itemId))}
                  >
                    <X className="size-3.5" />
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}

      <Select
        value=""
        onValueChange={(itemId) => onChange([...value, itemId])}
        disabled={value.length >= max || available.length === 0}
      >
        <SelectTrigger id={id} className="w-64">
          <span className="flex items-center gap-2">
            <Plus aria-hidden />
            <SelectValue placeholder={addLabel} />
          </span>
        </SelectTrigger>
        <SelectContent>
          {available.map((group) => (
            <SelectGroup key={group.label ?? '__none__'}>
              {group.label ? <SelectLabel>{group.label}</SelectLabel> : null}
              {group.options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.icon}
                  {option.label ?? option.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
