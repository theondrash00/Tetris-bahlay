import { test, expect } from '@playwright/test';

test.describe('Solo game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking SOLO PLAY switches to game screen', async ({ page }) => {
    await page.click('#btn-solo');
    await expect(page.locator('#game-screen')).toHaveClass(/active/);
  });

  test('game canvas is visible when game starts', async ({ page }) => {
    await page.click('#btn-solo');
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect(page.locator('#next-piece-canvas')).toBeVisible();
  });

  test('score, level, lines all start at 0/1/0', async ({ page }) => {
    await page.click('#btn-solo');
    await expect(page.locator('#score-display')).toHaveText('0');
    await expect(page.locator('#level-display')).toHaveText('1');
    await expect(page.locator('#lines-display')).toHaveText('0');
  });

  test('opponent section is hidden in solo mode', async ({ page }) => {
    await page.click('#btn-solo');
    await expect(page.locator('#opponent-section')).toBeHidden();
  });

  test('taunt legend is hidden in solo mode', async ({ page }) => {
    await page.click('#btn-solo');
    await expect(page.locator('#taunt-legend')).toBeHidden();
  });

  test('hard drop moves piece and score increases', async ({ page }) => {
    await page.click('#btn-solo');

    // Give the game loop a moment to start
    await page.waitForTimeout(300);

    const scoreBefore = await page.locator('#score-display').textContent();

    // Hard drop several times (each locks a piece and scores points)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);
    }

    const scoreAfter = await page.locator('#score-display').textContent();
    expect(parseInt(scoreAfter)).toBeGreaterThan(parseInt(scoreBefore));
  });

  test('game over overlay appears after board tops out', async ({ page }) => {
    await page.click('#btn-solo');
    await page.waitForTimeout(200);

    // Rapid hard drops to fill the board and trigger game over
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }

    await expect(page.locator('#overlay-gameover')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#gameover-title')).toHaveText('GAME OVER');
  });

  test('game over shows non-zero stats', async ({ page }) => {
    await page.click('#btn-solo');
    await page.waitForTimeout(200);

    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }

    await expect(page.locator('#overlay-gameover')).toBeVisible({ timeout: 10_000 });
    const stats = await page.locator('#gameover-stats').textContent();
    expect(stats).toBeTruthy();
  });

  test('PLAY AGAIN restarts the game', async ({ page }) => {
    await page.click('#btn-solo');
    await page.waitForTimeout(200);

    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }

    await expect(page.locator('#overlay-gameover')).toBeVisible({ timeout: 10_000 });
    await page.click('#btn-play-again');

    await expect(page.locator('#overlay-gameover')).toBeHidden();
    await expect(page.locator('#game-screen')).toHaveClass(/active/);
    await expect(page.locator('#score-display')).toHaveText('0');
  });

  test('MENU from game over returns to menu screen', async ({ page }) => {
    await page.click('#btn-solo');
    await page.waitForTimeout(200);

    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }

    await expect(page.locator('#overlay-gameover')).toBeVisible({ timeout: 10_000 });
    await page.click('#btn-back-to-menu');
    await expect(page.locator('#menu-screen')).toHaveClass(/active/);
  });

  test('starting level reflects difficulty selection', async ({ page }) => {
    await page.click('.diff-btn[data-level="5"]');
    await page.click('#btn-solo');
    await expect(page.locator('#level-display')).toHaveText('5');
  });
});

test.describe('Bot game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-vs-bot');
  });

  test('selecting a bot starts the game screen', async ({ page }) => {
    await page.click('.bot-card[data-bot="rookie"]');
    await expect(page.locator('#game-screen')).toHaveClass(/active/);
  });

  test('countdown overlay shows before game starts', async ({ page }) => {
    await page.click('.bot-card[data-bot="rookie"]');
    await expect(page.locator('#overlay-countdown')).toBeVisible();
    await expect(page.locator('#countdown-text')).toBeVisible();
  });

  test('opponent section is visible in bot mode', async ({ page }) => {
    await page.click('.bot-card[data-bot="rookie"]');
    // Wait for countdown to finish
    await expect(page.locator('#overlay-countdown')).toBeHidden({ timeout: 8_000 });
    await expect(page.locator('#opponent-section')).toBeVisible();
  });

  test('taunt legend is visible in bot mode', async ({ page }) => {
    await page.click('.bot-card[data-bot="rookie"]');
    await expect(page.locator('#overlay-countdown')).toBeHidden({ timeout: 8_000 });
    await expect(page.locator('#taunt-legend')).toBeVisible();
  });

  test('rematch button shown after bot game ends', async ({ page }) => {
    await page.click('.bot-card[data-bot="rookie"]');
    await expect(page.locator('#overlay-countdown')).toBeHidden({ timeout: 8_000 });

    // Fill board via hard drops to trigger game over
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }

    await expect(page.locator('#overlay-gameover')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#btn-rematch-bot')).toBeVisible();
  });
});
