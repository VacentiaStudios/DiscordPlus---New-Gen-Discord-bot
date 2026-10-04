'use client';

import {
  actionUsesDuration,
  AUTOMOD_ACTION_LABELS,
  AUTOMOD_ACTIONS,
  AUTOMOD_FILTER_DESCRIPTIONS,
  AUTOMOD_FILTER_LABELS,
  MAX_AUTOMOD_EXEMPT_CHANNELS,
  MAX_AUTOMOD_EXEMPT_ROLES,
  recommendedAutomodSettings,
  type AutomodAction,
  type AutomodFilter,
  type AutomodSettings,
} from '@discordplus/shared';
import { Sparkles } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ChannelMultiSelect } from '@/components/settings/channel-multi-select';
import { FieldError, PageHeader, SettingRow } from '@/components/settings/field';
import { RoleMultiSelect, type RoleOption } from '@/components/settings/role-multi-select';
import { SaveBar } from '@/components/settings/save-bar';
import { useSaveSettings, type IssueMap } from '@/components/settings/use-save-settings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ChannelGroup } from '@/lib/channels';
import { cn } from '@/lib/utils';
import {
  listIssue,
  parseList,
  toFormState,
  toSettings,
  type AutomodFormState,
  type FilterForm,
} from './form-state';

function FilterCard({
  filter,
  form,
  onToggle,
  children,
}: {
  filter: AutomodFilter;
  form: FilterForm;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <Card className={cn('gap-0', !form.enabled && 'bg-card/60')}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>
            <label htmlFor={id}>{AUTOMOD_FILTER_LABELS[filter]}</label>
          </CardTitle>
          <CardDescription>{AUTOMOD_FILTER_DESCRIPTIONS[filter]}</CardDescription>
        </div>
        <Switch id={id} checked={form.enabled} onCheckedChange={onToggle} />
      </CardHeader>
      {form.enabled ? <CardContent className="mt-4 divide-y">{children}</CardContent> : null}
    </Card>
  );
}

function ActionRow({
  filter,
  form,
  issues,
  onChange,
}: {
  filter: AutomodFilter;
  form: FilterForm;
  issues: IssueMap;
  onChange: (patch: Partial<FilterForm>) => void;
}) {
  const id = useId();
  const label = AUTOMOD_FILTER_LABELS[filter];
  const durationError = issues[`${filter}.durationMs`];
  return (
    <SettingRow title="Eylem" htmlFor={id}>
      <div className="flex flex-wrap items-start gap-2">
        <Select
          value={form.action}
          onValueChange={(value) => {
            const action = value as AutomodAction;
            // Timeouts need a duration; start from a sensible one.
            const duration = action === 'timeout' && !form.duration.trim() ? '10dk' : form.duration;
            onChange({ action, duration });
          }}
        >
          <SelectTrigger id={id} className="w-44" aria-label={`${label}: eylem`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUTOMOD_ACTIONS.map((action) => (
              <SelectItem key={action} value={action}>
                {AUTOMOD_ACTION_LABELS[action]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {actionUsesDuration(form.action) ? (
          <div>
            <Input
              aria-label={`${label}: süre`}
              aria-invalid={durationError ? true : undefined}
              placeholder={form.action === 'ban' ? 'Boş: kalıcı' : 'ör. 10dk'}
              className="w-32"
              value={form.duration}
              onChange={(e) => onChange({ duration: e.target.value })}
            />
            <FieldError message={durationError} />
          </div>
        ) : null}
      </div>
    </SettingRow>
  );
}

function NumberRow({
  title,
  description,
  path,
  value,
  min,
  max,
  suffix,
  issues,
  onChange,
}: {
  title: string;
  description?: string;
  path: string;
  value: string;
  min: number;
  max: number;
  suffix: string;
  issues: IssueMap;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <SettingRow title={title} description={description} htmlFor={id}>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          className="w-24"
          aria-invalid={issues[path] ? true : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
      <FieldError message={issues[path]} />
    </SettingRow>
  );
}

function ListField({
  title,
  description,
  path,
  value,
  placeholder,
  lowercase,
  issues,
  onChange,
}: {
  title: string;
  description: ReactNode;
  path: string;
  value: string;
  placeholder: string;
  lowercase?: boolean;
  issues: IssueMap;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const items = parseList(value, { lowercase });
  const error = listIssue(issues, path, items);
  return (
    <div className="space-y-2 py-4 last:pb-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {title}
        </label>
        <span className="text-xs text-muted-foreground">{items.length} kayıt</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Textarea
        id={id}
        rows={4}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldError message={error} />
    </div>
  );
}

export function AutomodForm({
  guildId,
  initial,
  channelGroups,
  roles,
}: {
  guildId: string;
  initial: AutomodSettings;
  /** Null when Discord could not be reached. */
  channelGroups: ChannelGroup[] | null;
  roles: RoleOption[] | null;
}) {
  const ids = useId();
  const initialState = useMemo(() => toFormState(initial), [initial]);
  const [state, setState] = useState(initialState);
  const { save, pending, issues, setIssues } = useSaveSettings(guildId, 'automod');

  const snapshot = (s: AutomodFormState) => JSON.stringify(toSettings(s).value);
  const dirty = snapshot(state) !== snapshot(initialState);

  const patchFilter =
    <F extends AutomodFilter>(filter: F) =>
    (patch: Partial<AutomodFormState[F]>) =>
      setState((s) => ({ ...s, [filter]: { ...s[filter], ...patch } }));
  const filterProps = <F extends AutomodFilter>(filter: F) => ({
    filter,
    form: state[filter],
    onToggle: (enabled: boolean) =>
      patchFilter(filter)({ enabled } as Partial<AutomodFormState[F]>),
  });
  const actionRow = (filter: AutomodFilter) => (
    <ActionRow
      filter={filter}
      form={state[filter]}
      issues={issues}
      onChange={(patch) => patchFilter(filter)(patch)}
    />
  );

  const applyRecommended = () => {
    setIssues({});
    setState((s) => toFormState(recommendedAutomodSettings(toSettings(s).value)));
    toast.info('Önerilen ayarlar uygulandı. Kaydetmeyi unutmayın.');
  };

  const { spam, duplicates, profanity, invites, links, caps, mentions } = state;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AutoMod"
        description="Kurallara aykırı mesajları otomatik olarak yakalar. Silinen mesajlar loglarda AutoMod etiketiyle görünür, cezalar vaka olarak kaydedilir. Yeni sunucularda tüm filtreler kapalıdır."
        actions={
          <Button type="button" variant="outline" onClick={applyRecommended}>
            <Sparkles />
            Önerilen ayarları uygula
          </Button>
        }
      />

      <FilterCard {...filterProps('spam')}>
        {actionRow('spam')}
        <NumberRow
          title="Mesaj sınırı"
          description="Bu kadar mesaj, aşağıdaki süre içinde gönderilirse filtre devreye girer. Penceredeki mesajların hepsi silinir, ceza bir kez uygulanır."
          path="spam.maxMessages"
          value={spam.maxMessages}
          min={3}
          max={30}
          suffix="mesaj"
          issues={issues}
          onChange={(maxMessages) => patchFilter('spam')({ maxMessages })}
        />
        <NumberRow
          title="Süre"
          path="spam.perSeconds"
          value={spam.perSeconds}
          min={2}
          max={60}
          suffix="saniye"
          issues={issues}
          onChange={(perSeconds) => patchFilter('spam')({ perSeconds })}
        />
      </FilterCard>

      <FilterCard {...filterProps('duplicates')}>
        {actionRow('duplicates')}
        <NumberRow
          title="Tekrar sınırı"
          description="Büyük/küçük harf ve boşluk farkları yok sayılır."
          path="duplicates.maxDuplicates"
          value={duplicates.maxDuplicates}
          min={2}
          max={20}
          suffix="kez"
          issues={issues}
          onChange={(maxDuplicates) => patchFilter('duplicates')({ maxDuplicates })}
        />
        <NumberRow
          title="Süre"
          path="duplicates.perSeconds"
          value={duplicates.perSeconds}
          min={5}
          max={300}
          suffix="saniye"
          issues={issues}
          onChange={(perSeconds) => patchFilter('duplicates')({ perSeconds })}
        />
      </FilterCard>

      <FilterCard {...filterProps('profanity')}>
        {actionRow('profanity')}
        <SettingRow
          title="Varsayılan Türkçe listeyi kullan"
          description="Yaygın Türkçe küfürler; harf tekrarı, rakamla yazma (s1k) ve araya boşluk koyma gibi hileler de yakalanır."
          htmlFor={`${ids}-default-list`}
        >
          <Switch
            id={`${ids}-default-list`}
            checked={profanity.useDefaultList}
            onCheckedChange={(useDefaultList) => patchFilter('profanity')({ useDefaultList })}
          />
        </SettingRow>
        <ListField
          title="Ek kelimeler"
          description={
            <>
              Her satıra bir kelime. Sonuna <code>*</code> eklerseniz o kökle başlayan tüm kelimeler
              eşleşir (ör. <code>aptal*</code>).
            </>
          }
          path="profanity.words"
          value={profanity.words}
          placeholder={'kelime\nkök*'}
          issues={issues}
          onChange={(words) => patchFilter('profanity')({ words })}
        />
        <ListField
          title="İzin verilen kelimeler"
          description="Yanlışlıkla yakalanan kelimeler için istisnalar. Her iki listeden önce kontrol edilir."
          path="profanity.allowedWords"
          value={profanity.allowedWords}
          placeholder={'kelime\nkök*'}
          issues={issues}
          onChange={(allowedWords) => patchFilter('profanity')({ allowedWords })}
        />
      </FilterCard>

      <FilterCard {...filterProps('invites')}>
        {actionRow('invites')}
        <SettingRow
          title="Bu sunucunun davetlerine izin ver"
          description="Kapalıysa bu sunucuya ait davet linkleri de silinir."
          htmlFor={`${ids}-own-invites`}
        >
          <Switch
            id={`${ids}-own-invites`}
            checked={invites.allowOwnInvites}
            onCheckedChange={(allowOwnInvites) => patchFilter('invites')({ allowOwnInvites })}
          />
        </SettingRow>
      </FilterCard>

      <FilterCard {...filterProps('links')}>
        {actionRow('links')}
        <SettingRow
          title="Liste türü"
          description="İzin listesinde yalnızca listedeki sitelere link verilebilir; yasak listesinde yalnızca listedekiler engellenir. Davet linkleri için davet filtresini kullanın."
          htmlFor={`${ids}-link-mode`}
        >
          <Select
            value={links.mode}
            onValueChange={(mode) =>
              patchFilter('links')({ mode: mode as AutomodFormState['links']['mode'] })
            }
          >
            <SelectTrigger id={`${ids}-link-mode`} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allowlist">İzin listesi</SelectItem>
              <SelectItem value="blocklist">Yasak listesi</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <ListField
          title={links.mode === 'allowlist' ? 'İzin verilen siteler' : 'Engellenen siteler'}
          description="Her satıra bir alan adı. Alt alan adları da kapsanır (youtube.com → www.youtube.com)."
          path="links.domains"
          value={links.domains}
          placeholder={'youtube.com\ntenor.com'}
          lowercase
          issues={issues}
          onChange={(domains) => patchFilter('links')({ domains })}
        />
      </FilterCard>

      <FilterCard {...filterProps('caps')}>
        {actionRow('caps')}
        <NumberRow
          title="Büyük harf oranı"
          path="caps.percent"
          value={caps.percent}
          min={50}
          max={100}
          suffix="% ve üzeri"
          issues={issues}
          onChange={(percent) => patchFilter('caps')({ percent })}
        />
        <NumberRow
          title="En kısa mesaj"
          description="Daha az harf içeren mesajlara bakılmaz (ör. “TAMAM”)."
          path="caps.minLetters"
          value={caps.minLetters}
          min={5}
          max={200}
          suffix="harf"
          issues={issues}
          onChange={(minLetters) => patchFilter('caps')({ minLetters })}
        />
      </FilterCard>

      <FilterCard {...filterProps('mentions')}>
        {actionRow('mentions')}
        <NumberRow
          title="Etiket sınırı"
          description="Tek mesajda bu kadar farklı kullanıcı veya rol etiketlenirse filtre devreye girer."
          path="mentions.maxMentions"
          value={mentions.maxMentions}
          min={2}
          max={50}
          suffix="etiket"
          issues={issues}
          onChange={(maxMentions) => patchFilter('mentions')({ maxMentions })}
        />
      </FilterCard>

      <Card>
        <CardHeader>
          <CardTitle>Muafiyetler ve bildirim</CardTitle>
          <CardDescription>Botlar ve webhook mesajları hiçbir zaman denetlenmez.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            title="Moderatörleri muaf tut"
            description="Kanalda Mesajları Yönet yetkisi olanlar ve yöneticiler denetlenmez. Filtreleri denemek için geçici olarak kapatabilirsiniz."
            htmlFor={`${ids}-mods`}
          >
            <Switch
              id={`${ids}-mods`}
              checked={state.exemptModerators}
              onCheckedChange={(exemptModerators) => setState((s) => ({ ...s, exemptModerators }))}
            />
          </SettingRow>
          <SettingRow
            title="Kanalda bildirim göster"
            description="Mesaj silindiğinde kanala kısa bir not düşülür ve birkaç saniye sonra kendini siler."
            htmlFor={`${ids}-notify`}
          >
            <Switch
              id={`${ids}-notify`}
              checked={state.notifyChannel}
              onCheckedChange={(notifyChannel) => setState((s) => ({ ...s, notifyChannel }))}
            />
          </SettingRow>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <label htmlFor={`${ids}-roles`} className="text-sm font-medium">
                Muaf roller
              </label>
              <p className="text-sm text-muted-foreground">
                Bu rollerden birine sahip üyeler denetlenmez.
              </p>
            </div>
            {roles ? (
              <RoleMultiSelect
                id={`${ids}-roles`}
                roles={roles}
                value={state.exemptRoleIds}
                max={MAX_AUTOMOD_EXEMPT_ROLES}
                emptyLabel="Muaf rol yok."
                onChange={(exemptRoleIds) => setState((s) => ({ ...s, exemptRoleIds }))}
              />
            ) : (
              <Alert>
                <AlertDescription>Rol listesi Discord’dan alınamadı.</AlertDescription>
              </Alert>
            )}
            <FieldError message={issues.exemptRoleIds} />
          </div>
          <div className="space-y-3 py-4 last:pb-0">
            <div className="space-y-1">
              <label htmlFor={`${ids}-channels`} className="text-sm font-medium">
                Muaf kanallar
              </label>
              <p className="text-sm text-muted-foreground">
                Bu kanallardaki mesajlar denetlenmez. Bir kategori seçerseniz içindeki tüm kanallar
                muaf olur.
              </p>
            </div>
            {channelGroups ? (
              <ChannelMultiSelect
                id={`${ids}-channels`}
                groups={channelGroups}
                value={state.exemptChannelIds}
                max={MAX_AUTOMOD_EXEMPT_CHANNELS}
                emptyLabel="Muaf kanal yok."
                onChange={(exemptChannelIds) => setState((s) => ({ ...s, exemptChannelIds }))}
              />
            ) : (
              <Alert>
                <AlertDescription>Kanal listesi Discord’dan alınamadı.</AlertDescription>
              </Alert>
            )}
            <FieldError message={issues.exemptChannelIds} />
          </div>
        </CardContent>
      </Card>

      <SaveBar
        dirty={dirty}
        pending={pending}
        onSave={() => {
          const { value, issues: conversionIssues } = toSettings(state);
          save(value, conversionIssues);
        }}
        onReset={() => {
          setIssues({});
          setState(initialState);
        }}
      />
    </div>
  );
}
