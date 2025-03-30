import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
    path: '../.env.local'
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a singleton instance
export class SupabaseClient {
    private static instance: ReturnType<typeof createClient>;

    private constructor() {}

    public static getInstance(): ReturnType<typeof createClient> {
        if (!SupabaseClient.instance) {
            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Supabase URL and Anon Key are required');
            }

            SupabaseClient.instance = createClient(
                supabaseUrl,
                supabaseAnonKey,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                    }
                }
            );
        }

        return SupabaseClient.instance;
    }
}

// Export the singleton instance
export const supabase = SupabaseClient.getInstance();
