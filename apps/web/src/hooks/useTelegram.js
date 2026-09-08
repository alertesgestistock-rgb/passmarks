// Detects whether the app is running inside the Telegram Mini App WebView.
// Safe everywhere: window.Telegram is undefined on the normal web, so every
// value here just falls back to "not in Telegram" and nothing else changes.
import { useEffect, useMemo } from 'react';

export function useTelegram() {
	const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
	const isTelegram = Boolean(tg?.initData);

	useEffect(() => {
		if (!tg) return;
		// Tells Telegram the app is ready to be displayed, and expands the
		// WebView to full height instead of the default half-screen sheet.
		tg.ready();
		tg.expand();
	}, [tg]);

	const user = useMemo(() => tg?.initDataUnsafe?.user ?? null, [tg]);

	return {
		tg,
		isTelegram,
		initData: tg?.initData ?? null,
		user, // NOT verified — display/UX only, never trust for auth. Verify `initData` server-side first.
		colorScheme: tg?.colorScheme ?? null, // 'light' | 'dark'
		themeParams: tg?.themeParams ?? null,
	};
}
