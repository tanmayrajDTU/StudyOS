const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

if (!urlMatch || !keyMatch) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log("Authenticating user...");
    const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'tanmayraj1705@gmail.com',
      password: 'Tanmay12@#',
    });

    if (authErr) throw authErr;
    console.log("Authenticated successfully. User ID:", session.user.id);

    console.log("Attempting to update profile target hours to 8.5...");
    const { data, error } = await supabase
      .from('profiles')
      .update({ daily_target_hours: 8.5 })
      .eq('id', session.user.id)
      .select();

    if (error) {
      throw error;
    }
    console.log("Profile updated successfully:", data);

  } catch (err) {
    console.error("ERROR UPDATING SETTINGS:", err.message, err.details, err.hint, err);
  } finally {
    process.exit();
  }
}
run();
