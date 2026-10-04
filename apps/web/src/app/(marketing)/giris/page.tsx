import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DiscordIcon, LogoMark } from '@/components/brand';
import { SubmitButton } from '@/components/submit-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInWithDiscord } from '@/server/actions/auth';
import { safeRedirectPath } from '@/server/redirects';
import { getCurrentUser } from '@/server/session';

export const metadata: Metadata = { title: 'Giriş yap' };

const ERRORS: Record<string, string> = {
  oturum: 'Discord oturumunuzun süresi doldu veya erişim kaldırıldı. Lütfen tekrar giriş yapın.',
  giris: 'Discord ile giriş tamamlanamadı. Lütfen tekrar deneyin.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeRedirectPath(first(params.sonra));
  const error = first(params.hata);

  // After an error the user must be able to sign in again even with a session.
  if (!error && (await getCurrentUser())) redirect(next);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:py-24">
      <Card>
        <CardHeader className="justify-items-center text-center">
          <LogoMark className="mb-2 size-12" />
          <CardTitle className="text-2xl">Panele giriş yapın</CardTitle>
          <CardDescription>
            Discord hesabınızla giriş yapın; yönettiğiniz sunucular listelenecek.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{ERRORS[error] ?? ERRORS.giris}</AlertDescription>
            </Alert>
          ) : null}
          <form action={signInWithDiscord}>
            <input type="hidden" name="sonra" value={next} />
            <SubmitButton size="lg" className="w-full">
              <DiscordIcon className="size-5" />
              Discord ile giriş yap
            </SubmitButton>
          </form>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Yalnızca Discord kimliğinize ve sunucu listenize erişiriz; e-posta adresinizi istemeyiz.
            Ayrıntılar için{' '}
            <Link href="/gizlilik" className="underline underline-offset-2 hover:text-foreground">
              gizlilik politikası
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
