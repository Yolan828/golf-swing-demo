import fs from 'fs';
import os from 'os';
import path from 'path';
import { test, expect, type Page } from '@playwright/test';

/** Records a generated canvas, so the tests need no video fixture and contain no real footage. */
async function createSampleWebm(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d')!;
        let frame = 0;
        const timer = setInterval(() => {
          ctx.fillStyle = `hsl(${frame++ * 12}, 70%, 40%)`;
          ctx.fillRect(0, 0, 320, 240);
        }, 33);

        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
          clearInterval(timer);
          const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
          resolve(btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join('')));
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 1200);
      })
  );
  return Buffer.from(base64, 'base64');
}

type Row = Record<string, unknown>;

/** Reads a store directly, leaving binary fields out of the result. */
function readStore(page: Page, store: string): Promise<Row[]> {
  return page.evaluate(
    (storeName) =>
      new Promise<Row[]>((resolve, reject) => {
        const open = indexedDB.open('GolfSwingPWA_DB');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const request = open.result.transaction(storeName).objectStore(storeName).getAll();
          request.onsuccess = () => {
            open.result.close();
            resolve(
              request.result.map((stored) => {
                const row = { ...stored };
                delete row.blob;
                delete row.thumbnailBlob;
                return row;
              })
            );
          };
        };
      }),
    store
  );
}

async function uploadSampleSwing(page: Page) {
  await page.goto('/my-swings');
  await expect(page.getByText('已保存影片 (0 / 3)')).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample-swing.webm',
    mimeType: 'video/webm',
    buffer: await createSampleWebm(page),
  });
  await expect(page.getByText('已保存影片 (1 / 3)')).toBeVisible();
}

async function recordFromCamera(page: Page) {
  await page.goto('/my-swings');
  await expect(page.getByText('已保存影片 (0 / 3)')).toBeVisible();
  await page.getByRole('button', { name: /鏡頭實時拍攝/ }).click();
  const preview = page.locator('video');
  await expect.poll(() => preview.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '開始錄影' }).click();
  await page.waitForTimeout(2000);
}

test('uploaded video is kept in the browser after a reload', async ({ page }) => {
  await uploadSampleSwing(page);
  await page.reload();
  await expect(page.getByText('已保存影片 (1 / 3)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'sample-swing.webm' })).toBeVisible();
});

test('closing the camera mid-recording discards the video', async ({ page }) => {
  await recordFromCamera(page);
  await page.getByRole('button', { name: '關閉相機' }).click();
  await page.waitForTimeout(1000);

  await expect(page.getByText('已保存影片 (0 / 3)')).toBeVisible();
  expect(await readStore(page, 'userVideos')).toHaveLength(0);
});

test('a finished recording stores its real length and format', async ({ page }) => {
  await recordFromCamera(page);
  await page.getByRole('button', { name: '停止錄影' }).click();
  await expect(page.getByText('已保存影片 (1 / 3)')).toBeVisible();

  const [video] = await readStore(page, 'userVideos');
  expect(video.duration).toBeGreaterThan(1.5);
  expect(video.duration).toBeLessThan(4);
  const expectedExtension = String(video.mimeType).includes('mp4') ? 'mp4' : 'webm';
  expect(String(video.filename).endsWith(`.${expectedExtension}`)).toBe(true);
});

test('estimating phases twice leaves one finite marker per phase', async ({ page }) => {
  await uploadSampleSwing(page);
  await page.getByRole('link', { name: '標記' }).click();
  await expect(page.locator('video')).toBeVisible();
  await page.getByRole('button', { name: '展開標記' }).click();

  await page.getByRole('button', { name: '依比例估算' }).click();
  await page.getByRole('button', { name: '重新估算' }).click();
  await page.waitForTimeout(300);

  const markers = await readStore(page, 'swingMarkers');
  expect(markers).toHaveLength(6);
  for (const marker of markers) expect(Number.isFinite(marker.timestamp)).toBe(true);
});

test('compare page has valid posters and shows real frames when moved', async ({ page }) => {
  await uploadSampleSwing(page);
  const benchmark = await createSampleWebm(page);

  await page.goto('/pro-library');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'reference-swing.webm',
    mimeType: 'video/webm',
    buffer: benchmark,
  });
  await page.getByRole('button', { name: '儲存基準影片' }).click();
  await expect(page.getByRole('heading', { name: 'reference-swing' })).toBeVisible();

  await page.goto('/compare');
  const players = page.locator('video');
  await expect(players).toHaveCount(2);
  for (const index of [0, 1]) {
    await expect
      .poll(() =>
        players.nth(index).evaluate(
          (video: HTMLVideoElement) =>
            new Promise<number>((resolve) => {
              const image = new Image();
              image.onload = () => resolve(image.naturalWidth);
              image.onerror = () => resolve(0);
              image.src = video.poster;
            })
        )
      )
      .toBeGreaterThan(0);
  }

  await page.locator('input[type="range"]').fill('0.5');
  await expect(page.getByAltText('左側揮桿預覽圖')).toHaveCount(0);
  await expect(page.getByAltText('右側比對預覽圖')).toHaveCount(0);
});

test('benchmark upload rejects files over 150 MB', async ({ page }) => {
  const oversized = path.join(os.tmpdir(), `oversized-${Date.now()}.webm`);
  fs.closeSync(fs.openSync(oversized, 'w'));
  fs.truncateSync(oversized, 151 * 1024 * 1024);

  try {
    await page.goto('/pro-library');
    await expect(page.getByText('尚無基準揮桿影片')).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(oversized);
    await expect(page.getByText(/影片檔案過大/)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } finally {
    fs.rmSync(oversized);
  }
});
