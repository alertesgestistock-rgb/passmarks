// Detects whether the app is running inside the Telegram Mini App WebView.
// Safe everywhere: window.Telegram is undefined on the normal web, so every
// value here just falls back to "not in Telegram" and nothing else changes.
import { useEffect, useMemo } from 'react';

// Reads a t.me/<bot>/<app>?startapp=ref_<CODE> deep link's payload and
// feeds it into the SAME localStorage key AuthPage.jsx already reads for the
// web's ?ref= links (see AuthPage.jsx and UserContext.jsx's
// signInWithTelegram) — one referral pipeline, two ways to trigger it.
// Telegram start_param is restricted to [A-Za-z0-9_-]{1,64}, so "ref_XXXXXX"
// round-trips with no encoding needed.
function primeReferralFromStartParam(startParam) {
	if (!startParam?.startsWith('ref_')) return;
	const code = startParam.slice(4).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
	if (code) localStorage.setItem('pm_ref_code', code);
}

export function useTelegram() {
	const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
	const isTelegram = Boolean(tg?.initData);
	const startParam = tg?.initDataUnsafe?.start_param ?? null;

	useEffect(() => {
		if (!tg) return;
		// Tells Telegram the app is ready to be displayed, and expands the
		// WebView to full height instead of the default half-screen sheet.
		tg.ready();
		tg.expand();
		primeReferralFromStartParam(startParam);
	}, [tg, startParam]);

	const user = useMemo(() => tg?.initDataUnsafe?.user ?? null, [tg]);

	return {
		tg,
		isTelegram,
		initData: tg?.initData ?? null,
		startParam,
		user, // NOT verified — display/UX only, never trust for auth. Verify `initData` server-side first.
		colorScheme: tg?.colorScheme ?? null, // 'light' | 'dark'
		themeParams: tg?.themeParams ?? null,
	};
}
