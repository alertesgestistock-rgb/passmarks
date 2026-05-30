import { supabase } from './supabase';

const API_SERVER_URL = import.meta.env.VITE_API_URL || '/api';

const apiServerClient = {
    fetch: async (url, options = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
            ...(options.headers || {}),
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        };
        return await window.fetch(API_SERVER_URL + url, { ...options, headers });
    }
};

export default apiServerClient;

export { apiServerClient };
