import { expect, test } from '@playwright/test';
import { E2E_ENV } from './env';
import { guilds } from './fixtures.mjs';
import { loginAs } from './helpers';

test('anonymous visitors are sent to the login page and back', async ({ page }) => {
  await page.goto(`/panel/${guilds.owned.id}`);
  await expect(page).toHaveURL(`/giris?sonra=%2Fpanel%2F${guilds.owned.id}`);
  await expect(page.getByRole('button', { name: 'Discord ile giriş yap' })).toBeVisible();
});

test('Discord sign-in asks only for identity and server list', async ({ page }) => {
  let authorizeUrl: URL | undefined;
  await page.route('https://discord.com/**', async (route) => {
    authorizeUrl = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'Discord' });
  });

  await page.goto('/giris?sonra=%2Fpanel');
  await page.getByRole('button', { name: 'Discord ile giriş yap' }).click();

  await expect.poll(() => authorizeUrl?.pathname).toBe('/api/oauth2/authorize');
  expect(authorizeUrl!.searchParams.get('client_id')).toBe(E2E_ENV.DISCORD_CLIENT_ID);
  expect(authorizeUrl!.searchParams.get('scope')).toBe('identify guilds');
  expect(authorizeUrl!.searchParams.get('redirect_uri')).toBe(
    `${E2E_ENV.WEB_URL}/api/auth/callback/discord`,
  );
  expect(authorizeUrl!.searchParams.get('state')).toBeTruthy();
});

test('login errors are explained', async ({ page }) => {
  await page.goto('/giris?hata=oturum');
  await expect(page.getByRole('alert').filter({ hasText: 'tekrar giriş yapın' })).toBeVisible();
});

test('signed-in users skip the login page', async ({ context, page }) => {
  await loginAs(context, 'alice');
  await page.goto('/giris?sonra=%2Fpanel');
  await expect(page).toHaveURL('/panel');
});

test('signing out ends the session', async ({ context, page }) => {
  await loginAs(context, 'carol');
  await page.goto('/panel');
  await page.getByRole('button', { name: 'Hesap menüsü' }).click();
  await page.getByRole('menuitem', { name: 'Çıkış yap' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/panel');
  await expect(page).toHaveURL('/giris?sonra=%2Fpanel');
});
