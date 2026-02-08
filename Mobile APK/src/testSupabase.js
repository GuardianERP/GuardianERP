// Test Supabase configuration and connection
import { supabase, isSupabaseConfigured } from './services/supabaseClient.js';

async function testSupabaseConnection() {
    console.log('Testing Supabase configuration...');
    
    if (!isSupabaseConfigured()) {
        console.error('❌ Supabase is not configured. Check your .env file.');
        process.exit(1);
    }
    
    console.log('✅ Supabase is configured.');
    
    try {
        console.log('Testing connection to tasks table...');
        const { data, error } = await supabase.from('tasks').select('*').limit(1);
        
        if (error) {
            console.error('❌ Supabase error:', error.message);
            process.exit(1);
        }
        
        console.log('✅ Supabase connection successful!');
        console.log('Sample data:', data);
        process.exit(0);
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        process.exit(1);
    }
}

testSupabaseConnection();
