const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

// Load connection string from .env.local
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const dbUrlMatch = envFile.match(/DATABASE_URL=["']?(.+?)["']?(\r?\n|$)/)

if (!dbUrlMatch) {
  console.error('DATABASE_URL not found in .env.local')
  process.exit(1)
}

const connectionString = dbUrlMatch[1]
console.log('Connecting to database...')
const sql = postgres(connectionString)

async function main() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql')
    console.log(`Reading schema from ${schemaPath}...`)
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')

    console.log('Executing schema.sql...')
    // Execute the schema script using raw queries
    await sql.unsafe(schemaSql)
    console.log('Database schema migrated successfully!')

    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

main()
