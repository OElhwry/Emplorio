export async function isPaused(): Promise<boolean> {
  try {
    const r = await chrome.storage.local.get(['emplorioFillPaused']);
    return !!r.emplorioFillPaused;
  } catch {
    return false;
  }
}

export async function awaitUnpause(): Promise<void> {
  while (await isPaused()) {
    await new Promise((r) => setTimeout(r, 250));
  }
}
