import { supabase } from './supabase';

const API_SERVER_URL = import.meta.env.VITE_API_URL || '/api';

export class InsufficientTokensError extends Error {
    constructor(balance) {
        super('insufficient_tokens');
        this.name = 'InsufficientTokensError';
        this.balance = balance;
    }
}

const apiServerClient = {
    fetch: async (url, options = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        };

        const res = await window.fetch(API_SERVER_URL + url, {
            ...options,
            headers,
            body: options.body != null && typeof options.body !== 'string'
                ? JSON.stringify(options.body)
                : options.body,
        });

        if (res.status === 402) {
            const data = await res.json().catch(() => ({}));
            throw new InsufficientTokensError(data.balance ?? 0);
        }

        return res;
    },

    // Convenience: fetch + parse JSON, throws on error
    json: async (url, options = {}) => {
        const res = await apiServerClient.fetch(url, options);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Request failed (${res.status})`);
        }
        return res.json();
    },
};

export default apiServerClient;
export { apiServerClient };
