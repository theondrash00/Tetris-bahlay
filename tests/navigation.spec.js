import { test, expect } from '@playwright/test';

test.describe('Screen navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#menu-screen')).toHaveClass(/active/);
  });

  test('menu screen is the default active screen', async ({ page }) => {
    await expect(page.locator('#menu-screen')).toHaveClass(/active/);
    await expect(page.locator('#game-screen')).not.toHaveClass(/active/);
  });

  test('VS BOT opens bot select screen', async ({ page }) => {
    await page.click('#btn-vs-bot');
    await expect(page.locator('#bot-select-screen')).toHaveClass(/active/);
    await expect(page.locator('#menu-screen')).not.toHaveClass(/active/);
  });

  test('back from bot select returns to menu', async ({ page }) => {
    await page.click('#btn-vs-bot');
    await page.click('#btn-back-bot-select');
    await expect(page.locator('#menu-screen')).toHaveClass(/active/);
  });

  test('HIGH SCORES opens highscores screen', async ({ page }) => {
    await page.click('#btn-highscores');
    await expect(page.locator('#highscores-screen')).toHaveClass(/active/);
  });

  test('back from highscores returns to menu', async ({ page }) => {
    await page.click('#btn-highscores');
    await page.click('#btn-back-scores');
    await expect(page.locator('#menu-screen')).toHaveClass(/active/);
  });

  test("WHAT'S NEW opens whats-new screen", async ({ page }) => {
    await page.click('#btn-whats-new');
    await expect(page.locator('#whats-new-screen')).toHaveClass(/active/);
  });

  test("back from what's new returns to menu", async ({ page }) => {
    await page.click('#btn-whats-new');
    await page.click('#btn-back-whats-new');
    await expect(page.locator('#menu-screen')).toHaveClass(/active/);
  });

  test('MULTIPLAYER opens lobby screen', async ({ page }) => {
    await page.click('#btn-multiplayer');
    await expect(page.locator('#lobby-screen')).toHaveClass(/active/);
  });

  test('back from lobby returns to menu', async ({ page }) => {
    await page.click('#btn-multiplayer');
    await page.click('#btn-back-menu');
    await expect(page.locator('#menu-screen')).toHaveClass(/active/);
  });

  test('all 4 bot cards are visible', async ({ page }) => {
    await page.click('#btn-vs-bot');
    for (const bot of ['rookie', 'cleaner', 'aggressor', 'pro']) {
      await expect(page.locator(`.bot-card[data-bot="${bot}"]`)).toBeVisible();
    }
  });

  test('difficulty buttons 1-10 are all present', async ({ page }) => {
    for (let i = 1; i <= 10; i++) {
      await expect(page.locator(`.diff-btn[data-level="${i}"]`)).toBeVisible();
    }
  });

  test('clicking difficulty button updates active state', async ({ page }) => {
    await page.click('.diff-btn[data-level="5"]');
    await expect(page.locator('.diff-btn[data-level="5"]')).toHaveClass(/active/);
    await expect(page.locator('.diff-btn[data-level="1"]')).not.toHaveClass(/active/);
  });

  test('difficulty hint updates when level changes', async ({ page }) => {
    await page.click('.diff-btn[data-level="9"]');
    await expect(page.locator('#difficulty-hint')).toContainText('Extreme');
  });
});
