'use client';

import { MultiSelect, type MultiSelectProps } from './multi-select';

export interface RoleOption {
  id: string;
  name: string;
  /** Discord role color; 0 means none. */
  color: number;
}

function RoleDot({ color }: { color: number }) {
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full bg-muted-foreground"
      style={color ? { backgroundColor: `#${color.toString(16).padStart(6, '0')}` } : undefined}
    />
  );
}

/** Picks roles of the guild, highest first. */
export function RoleMultiSelect({
  roles,
  addLabel = 'Rol ekle',
  emptyLabel = 'Rol seçilmedi.',
  ...props
}: { roles: RoleOption[]; addLabel?: string; emptyLabel?: string } & Omit<
  MultiSelectProps,
  'groups' | 'addLabel' | 'emptyLabel' | 'unknownLabel' | 'removeLabel'
>) {
  return (
    <MultiSelect
      {...props}
      addLabel={addLabel}
      emptyLabel={emptyLabel}
      unknownLabel="silinmiş rol"
      removeLabel={(name) => `${name} rolünü listeden çıkar`}
      groups={[
        {
          label: null,
          options: roles.map((role) => ({
            id: role.id,
            name: `@${role.name}`,
            icon: <RoleDot color={role.color} />,
          })),
        },
      ]}
    />
  );
}
