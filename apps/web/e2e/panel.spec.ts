import { expect, test } from '@playwright/test';
import { E2E_ENV } from './env';
import { guilds } from './fixtures.mjs';
import { loginAs } from './helpers';

test.describe('server list', () => {
  test.beforeEach(async ({ context }) => {
    await loginAs(context, 'alice');
  });

  test('shows only servers the user may manage', async ({ page }) => {
    await page.goto('/panel');
    await expect(page.getByRole('heading', { name: 'Sunucularım' })).toBeVisible();

    await expect(page.getByTestId(`guild-${guilds.owned.id}`)).toContainText('Sahip');
    await expect(page.getByTestId(`guild-${guilds.admin.id}`)).toContainText('Yönetici');
    await expect(page.getByTestId(`guild-${guilds.manager.id}`)).toContainText('Sunucuyu Yönet');
    await expect(page.getByTestId(`guild-${guilds.member.id}`)).toHaveCount(0);
  });

  test('offers "Manage" where the bot is present and "Add bot" elsewhere', async ({ page }) => {
    await page.goto('/panel');
    await expect(
      page.getByTestId(`guild-${guilds.owned.id}`).getByRole('link', { name: 'Yönet' }),
    ).toHaveAttribute('href', `/panel/${guilds.owned.id}`);
    await expect(
      page.getByTestId(`guild-${guilds.admin.id}`).getByRole('link', { name: 'Botu Ekle' }),
    ).toHaveAttribute('href', `/davet?sunucu=${guilds.admin.id}`);
  });

  test('refresh keeps the list', async ({ page }) => {
    await page.goto('/panel');
    await page.getByRole('button', { name: 'Yenile' }).click();
    await expect(page.getByTestId(`guild-${guilds.owned.id}`)).toBeVisible();
  });
});

test.describe('guild pages', () => {
  test.beforeEach(async ({ context }) => {
    await loginAs(context, 'alice');
  });

  test('overview and server switcher', async ({ page }) => {
    await page.goto(`/panel/${guilds.owned.id}`);
    await expect(page.getByRole('heading', { name: guilds.owned.name })).toBeVisible();
    await expect(page.getByText('Aktif', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Sunucu değiştir' }).click();
    // Only other servers with the bot are offered.
    await expect(page.getByRole('menuitem', { name: guilds.admin.name })).toHaveCount(0);
    await page.getByRole('menuitem', { name: guilds.manager.name }).click();
    await expect(page).toHaveURL(`/panel/${guilds.manager.id}`);
    await expect(page.getByRole('heading', { name: guilds.manager.name })).toBeVisible();
  });

  test('asks to add the bot when it is missing', async ({ page }) => {
    await page.goto(`/panel/${guilds.admin.id}`);
    await expect(page.getByText('DiscordPlus bu sunucuda değil')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Botu Ekle' })).toHaveAttribute(
      'href',
      `/davet?sunucu=${guilds.admin.id}`,
    );
  });

  test('servers the user cannot manage are not found', async ({ page }) => {
    const response = await page.goto(`/panel/${guilds.member.id}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Sunucu bulunamadı' })).toBeVisible();
  });

  test('malformed server ids are not found', async ({ page }) => {
    const response = await page.goto('/panel/not-a-snowflake');
    expect(response?.status()).toBe(404);
  });
});

test('a user without manageable servers sees an explanation', async ({ context, page }) => {
  await loginAs(context, 'bob');
  await page.goto('/panel');
  await expect(page.getByText('Yönetebileceğiniz bir sunucu bulunamadı')).toBeVisible();
});

test('invite link preselects the server', async ({ request }) => {
  const response = await request.get(`/davet?sunucu=${guilds.admin.id}`, { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  const location = new URL(response.headers().location!);
  expect(location.searchParams.get('client_id')).toBe(E2E_ENV.DISCORD_CLIENT_ID);
  expect(location.searchParams.get('guild_id')).toBe(guilds.admin.id);
});
