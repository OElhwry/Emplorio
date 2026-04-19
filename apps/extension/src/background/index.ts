chrome.runtime.onInstalled.addListener(() => {
  console.log('[emplorio] installed');
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return true;
  }
  return false;
});
