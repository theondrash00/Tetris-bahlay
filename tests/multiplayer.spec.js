import { test, expect, chromium } from '@playwright/test';

// Each test opens two independent browser contexts to simulate two players
// connected to the same real Socket.IO server — no mocking.

test.describe('Multiplayer lobby', () => {
  test('MULTIPLAYER button opens lobby screen', async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-multiplayer');
    await expect(page.locator('#lobby-screen')).toHaveClass(/active/);
  });

  test('room-info section is hidden before creating a room', async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-multiplayer');
    await expect(page.locator('#room-info')).toBeHidden();
  });

  test('creating a room shows room-info with a 4-char code', async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-multiplayer');

    await page.fill('#player-name', 'Player1');
    await page.click('#btn-create-room');

    await expect(page.locator('#room-info')).toBeVisible({ timeout: 5_000 });

    const code = await page.locator('#room-code-value').textContent();
    expect(code).toMatch(/^[A-Z0-9]{4}$/);
  });

  test('cannot join with a code shorter than 4 chars', async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-multiplayer');
    // Wait for socket connection before interacting
    await page.waitForTimeout(500);

    await page.fill('#room-code-input', 'AB');
    await page.click('#btn-join-room');

    await expect(page.locator('#toast')).toBeVisible({ timeout: 3_000 });
  });

  test('joining a non-existent room shows an error toast', async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-multiplayer');

    await page.fill('#room-code-input', 'ZZZZ');
    await page.click('#btn-join-room');

    await expect(page.locator('#toast')).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Multiplayer two-player flow', () => {
  test('two players can create and join a room, then both go ready', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    try {
      // P1 creates a room
      await p1.goto('/');
      await p1.click('#btn-multiplayer');
      await p1.fill('#player-name', 'Alpha');
      await p1.click('#btn-create-room');
      await expect(p1.locator('#room-info')).toBeVisible({ timeout: 5_000 });

      const roomCode = await p1.locator('#room-code-value').textContent();
      expect(roomCode).toMatch(/^[A-Z0-9]{4}$/);

      // P2 joins using the code
      await p2.goto('/');
      await p2.click('#btn-multiplayer');
      await p2.fill('#player-name', 'Bravo');
      await p2.fill('#room-code-input', roomCode);
      await p2.click('#btn-join-room');
      await expect(p2.locator('#room-info')).toBeVisible({ timeout: 5_000 });

      // P1 should see 2 players in the list
      await expect(p1.locator('.player-entry')).toHaveCount(2, { timeout: 5_000 });

      // Both click READY
      await p1.click('#btn-ready');
      await p2.click('#btn-ready');

      // Both should transition to the game screen after countdown
      await expect(p1.locator('#game-screen')).toHaveClass(/active/, { timeout: 10_000 });
      await expect(p2.locator('#game-screen')).toHaveClass(/active/, { timeout: 10_000 });
    } finally {
      await ctx1.close();
      await ctx2.close();
    }
  });

  test('both players see opponent section once game starts', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    try {
      await p1.goto('/');
      await p1.click('#btn-multiplayer');
      await p1.fill('#player-name', 'Alpha');
      await p1.click('#btn-create-room');
      await expect(p1.locator('#room-info')).toBeVisible({ timeout: 5_000 });

      const roomCode = await p1.locator('#room-code-value').textContent();

      await p2.goto('/');
      await p2.click('#btn-multiplayer');
      await p2.fill('#player-name', 'Bravo');
      await p2.fill('#room-code-input', roomCode);
      await p2.click('#btn-join-room');
      await expect(p2.locator('#room-info')).toBeVisible({ timeout: 5_000 });

      await p1.click('#btn-ready');
      await p2.click('#btn-ready');

      // Wait for countdown to finish and game to start
      await expect(p1.locator('#overlay-countdown')).toBeHidden({ timeout: 10_000 });
      await expect(p2.locator('#overlay-countdown')).toBeHidden({ timeout: 10_000 });

      await expect(p1.locator('#opponent-section')).toBeVisible();
      await expect(p2.locator('#opponent-section')).toBeVisible();
    } finally {
      await ctx1.close();
      await ctx2.close();
    }
  });

  test('invite link auto-fills room code and disables Create Room', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    try {
      // P1 creates a room and copies invite link
      await p1.goto('/');
      await p1.click('#btn-multiplayer');
      await p1.fill('#player-name', 'Alpha');
      await p1.click('#btn-create-room');
      await expect(p1.locator('#room-info')).toBeVisible({ timeout: 5_000 });

      const roomCode = await p1.locator('#room-code-value').textContent();

      // P2 navigates directly via invite URL
      await p2.goto(`/?join=${roomCode}`);

      // Room code input should be pre-filled and Create Room disabled
      await expect(p2.locator('#room-code-input')).toHaveValue(roomCode);
      await expect(p2.locator('#btn-create-room')).toBeDisabled();
    } finally {
      await ctx1.close();
      await ctx2.close();
    }
  });

  test('disconnecting mid-game gives opponent the win', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    try {
      await p1.goto('/');
      await p1.click('#btn-multiplayer');
      await p1.fill('#player-name', 'Alpha');
      await p1.click('#btn-create-room');
      await expect(p1.locator('#room-info')).toBeVisible({ timeout: 5_000 });

      const roomCode = await p1.locator('#room-code-value').textContent();

      await p2.goto('/');
      await p2.click('#btn-multiplayer');
      await p2.fill('#player-name', 'Bravo');
      await p2.fill('#room-code-input', roomCode);
      await p2.click('#btn-join-room');
      await expect(p2.locator('#room-info')).toBeVisible({ timeout: 5_000 });

      await p1.click('#btn-ready');
      await p2.click('#btn-ready');

      // Wait for countdown overlay to hide on both sides (means game:start fired + GO! animation done)
      await expect(p1.locator('#overlay-countdown')).toBeHidden({ timeout: 10_000 });
      await expect(p2.locator('#overlay-countdown')).toBeHidden({ timeout: 10_000 });

      // Wait for opponent section to be visible on P2 — proves startMultiplayerGame() has run
      await expect(p2.locator('#opponent-section')).toBeVisible({ timeout: 5_000 });
      // Extra buffer to ensure the server's room.state is 'playing'
      await p1.waitForTimeout(500);

      // Disconnect P1's socket explicitly so the server detects it immediately
      await p1.evaluate(() => { if (window.__mpSocket) window.__mpSocket.disconnect(); });
      await p1.waitForTimeout(200);
      await ctx1.close();

      // P2 should see game over with a win (gameOver handler has 500ms delay internally)
      await expect(p2.locator('#overlay-gameover')).toBeVisible({ timeout: 12_000 });
      await expect(p2.locator('#gameover-title')).toHaveText('YOU WIN!');
    } finally {
      await ctx2.close();
    }
  });
});
