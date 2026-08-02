/**
 * Executes a network operation safely in mobile browsers and installed PWAs.
 * Browsers can freeze in-flight requests while the app is backgrounded; this
 * aborts that request and retries it once the page becomes active again.
 */
export async function runMobileSafeRequest(request, { timeoutMs = 12000, retries = 1 } = {}) {
  let remainingRetries = retries;

  while (true) {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      await waitForActivePage();
    }

    const controller = new AbortController();
    let backgrounded = false;
    let timedOut = false;
    const abortWhenHidden = () => {
      if (document.visibilityState !== 'visible') {
        backgrounded = true;
        controller.abort();
      }
    };
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    document.addEventListener('visibilitychange', abortWhenHidden);
    try {
      return await request(controller.signal);
    } catch (error) {
      if (backgrounded) {
        await waitForActivePage();
        continue;
      }
      if (timedOut && remainingRetries > 0) {
        remainingRetries -= 1;
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', abortWhenHidden);
    }
  }
}

function waitForActivePage() {
  if (typeof document === 'undefined' || document.visibilityState === 'visible') {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const resume = () => {
      if (document.visibilityState !== 'visible') return;
      cleanup();
      // Give the auth client and mobile radio a brief moment to reconnect.
      setTimeout(resolve, 150);
    };
    const cleanup = () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('online', resume);
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('online', resume);
  });
}