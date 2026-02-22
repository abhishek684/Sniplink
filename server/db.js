const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('⚠️ SUPABASE_URL and SUPABASE_KEY are not present in environment variables.');
  console.warn('⚠️ Server features relying on the database will not function until these are set.');
}

async function initDatabase() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Skipping Supabase verification due to missing credentials');
    return null;
  }

  console.log('🔗 Connecting to Supabase...');
  // Simple check to ensure connection is valid
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error && error.code !== '42P01') { // Ignore "relation does not exist" error during initial setup
    console.error('❌ Failed to connect to Supabase:', error.message);
  } else {
    console.log('✅ Supabase connected successfully.');
  }
  return supabase;
}

module.exports = { supabase, initDatabase };
