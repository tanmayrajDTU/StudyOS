const postgres = require('postgres');
const successUrl = "postgresql://postgres.yrlsjipphkrpfotfubrs:%266MZiFFj5RRC%2BSJ@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";

async function run() {
  console.log("Checking columns of public.profiles table...");
  const sql = postgres(successUrl);

  try {
    const cols = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles';
    `;
    console.log("Columns of public.profiles:", cols);
  } catch (err) {
    console.error("Catalog check failed:", err.message);
  } finally {
    await sql.end();
    process.exit();
  }
}
run();
