import { BrowserWindow, nativeImage } from 'electron';
import path from 'path';

let exportWindow: BrowserWindow | null = null;

function getExportWindow(): BrowserWindow {
  if (exportWindow && !exportWindow.isDestroyed()) return exportWindow;

  exportWindow = new BrowserWindow({
    width: 1080,
    height: 960,
    show: false,
    transparent: true,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  return exportWindow;
}

export async function exportSlideToPng(htmlContent: string): Promise<{ ok: boolean; data?: Buffer; error?: string }> {
  try {
    const win = getExportWindow();

    // Load the HTML content as a data URL
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    await win.loadURL(dataUrl);

    // Wait for fonts and animations to settle
    await new Promise(resolve => setTimeout(resolve, 800));

    // Capture the page at 1080x960
    const size = win.getSize();
    const image: nativeImage = await win.webContents.capturePage({
      x: 0,
      y: 0,
      width: size[0],
      height: size[1],
    });

    const buffer = image.toPNG();
    return { ok: true, data: buffer };
  } catch (err: any) {
    console.error('[Presentation] Export failed:', err.message);
    return { ok: false, error: err.message || 'Export failed' };
  }
}

export async function exportSlideToTransparentPng(htmlContent: string): Promise<{ ok: boolean; data?: Buffer; error?: string }> {
  try {
    const win = getExportWindow();

    // Inject a transparent background before loading
    const transparentHtml = htmlContent.replace(
      /<body([^>]*)>/i,
      '<body$1 style="background: transparent !important;">'
    ).replace(
      /<style[^>]*>/i,
      '<style>$&:root, body, html { background: transparent !important; }'
    );

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(transparentHtml)}`;
    await win.loadURL(dataUrl);

    await new Promise(resolve => setTimeout(resolve, 800));

    const size = win.getSize();
    const image: nativeImage = await win.webContents.capturePage({
      x: 0,
      y: 0,
      width: size[0],
      height: size[1],
    });

    const buffer = image.toPNG();
    return { ok: true, data: buffer };
  } catch (err: any) {
    console.error('[Presentation] Transparent export failed:', err.message);
    return { ok: false, error: err.message || 'Transparent export failed' };
  }
}

export function destroyExportWindow() {
  if (exportWindow && !exportWindow.isDestroyed()) {
    exportWindow.destroy();
    exportWindow = null;
  }
}
