import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

const isValidUrl = (url: string) => {
  try {
    if (!url) return false;
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Create a robust mock client to prevent build/prerender crashes when Env vars are not set yet
const createMockSupabase = () => {
  const mockMethods = {
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
    }),
    update: () => ({
      eq: () => Promise.resolve({ data: [], error: null }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: [], error: null }),
    }),
  };

  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === 'from') {
        return () => new Proxy({}, handler);
      }
      if (prop in mockMethods) {
        return mockMethods[prop as keyof typeof mockMethods];
      }
      return () => Promise.resolve({ data: [], error: null });
    },
  };

  return new Proxy({} as any, handler);
};

export const supabase = isValidUrl(supabaseUrl) && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabase();
