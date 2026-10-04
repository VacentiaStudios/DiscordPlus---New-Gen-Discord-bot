import { Gavel, LayoutDashboard, ScrollText, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { DiscordIcon } from '@/components/brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Gavel,
    title: 'Moderasyon ve vakalar',
    description:
      'Yasaklama, susturma, uyarı ve toplu temizleme. Her işlem numaralı bir vaka olarak kaydedilir; Discord arayüzünden yapılanlar bile.',
  },
  {
    icon: ShieldCheck,
    title: 'AutoMod',
    description:
      'Spam, tekrar eden mesaj, küfür, davet ve link filtreleri. Türkçe’ye özel küfür algılaması ve uyarı eşikleriyle otomatik cezalar.',
  },
  {
    icon: ScrollText,
    title: 'Gelişmiş loglama',
    description:
      'Silinen ve düzenlenen mesajlar, üye ve rol değişiklikleri, kanal düzenlemeleri ve ses hareketleri; her biri istediğiniz kanala.',
  },
  {
    icon: LayoutDashboard,
    title: 'Web paneli',
    description:
      'Tüm ayarlar tarayıcıdan. Yetkili olduğunuz her sunucuyu ayrı yönetin; değişiklikler bota anında yansır.',
  },
];

const steps = [
  {
    title: 'Discord ile giriş yapın',
    description: 'Yalnızca kimliğinizi ve sunucu listenizi görürüz; e-posta istemeyiz.',
  },
  {
    title: 'Botu sunucunuza ekleyin',
    description: 'Panelde yönetici olduğunuz sunucular listelenir; tek tıkla botu ekleyin.',
  },
  {
    title: 'Ayarları panelden yapın',
    description:
      'Log kanallarını, AutoMod filtrelerini ve uyarı eşiklerini seçin. Gerisi otomatik.',
  },
];

function ModLogPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-primary/20 blur-3xl" />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center gap-2 border-b px-4 py-3 text-sm text-muted-foreground">
          <span className="text-foreground">#</span> mod-log
        </div>
        <div className="flex gap-3 p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            D+
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">DPlus</span>
              <Badge variant="default" className="px-1 py-0 text-[10px]">
                UYGULAMA
              </Badge>
              <span className="text-xs text-muted-foreground">bugün 14:32</span>
            </div>
            <div className="rounded-md border-l-4 border-l-warning bg-background/60 p-3 text-sm">
              <p className="mb-2 font-semibold">Vaka #128 · Susturma</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
                <dt>Kullanıcı</dt>
                <dd className="text-foreground">@spammer</dd>
                <dt>Moderatör</dt>
                <dd className="text-foreground">AutoMod</dd>
                <dt>Süre</dt>
                <dd className="text-foreground">10 dakika</dd>
                <dt>Sebep</dt>
                <dd className="text-foreground">Spam: 5 saniyede 7 mesaj</dd>
              </dl>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
        <div className="space-y-6">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-sm">
            <Sparkles className="text-primary" />
            Yeni nesil moderasyon
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Sunucunuzu web panelinden yönetin, gerisini{' '}
            <span className="text-primary">DiscordPlus</span> halletsin.
          </h1>
          <p className="max-w-prose text-lg text-pretty text-muted-foreground">
            Türkçe konuşan moderasyon botu: vaka sistemi, akıllı AutoMod ve ayrıntılı loglar. Tüm
            ayarlar tek bir yerde, tarayıcınızda.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="/davet">
                <DiscordIcon className="size-5" />
                Discord&apos;a Ekle
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/panel">Panele Git</Link>
            </Button>
          </div>
        </div>
        <ModLogPreview />
      </section>

      <section id="ozellikler" className="scroll-mt-20 border-t bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Neler yapabilir?</h2>
          <p className="mt-2 text-muted-foreground">
            Moderatörlerinizin işini kolaylaştıran her şey, tek bir botta.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="gap-4">
                <CardHeader>
                  <div className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription className="leading-relaxed">{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="nasil-calisir" className="scroll-mt-20 border-t">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Nasıl çalışır?</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <Card className="h-full gap-3">
                  <CardContent className="space-y-2">
                    <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/panel">Hemen başla</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
