/**
 * Script per eseguire migrations SQL su Supabase
 *
 * Uso: node supabase/run-migration.js <migration-file>
 * Esempio: node supabase/run-migration.js 20260311_add_google_oauth_fields.sql
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function runMigration(migrationFile) {
  // Verifica variabili d'ambiente
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Errore: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY non trovati in .env.local')
    process.exit(1)
  }

  // Crea client Supabase con service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Leggi il file di migration
  const migrationPath = path.join(__dirname, 'migrations', migrationFile)

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ File migration non trovato: ${migrationPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log(`📄 Esecuzione migration: ${migrationFile}`)
  console.log('─'.repeat(50))

  try {
    // Esegui la migration
    // Nota: Supabase non ha un metodo diretto per eseguire SQL raw tramite client JS
    // Questo script è un template - in produzione usa Supabase Dashboard o CLI

    console.log('⚠️  IMPORTANTE:')
    console.log('Supabase client JS non supporta l\'esecuzione diretta di SQL raw.')
    console.log('')
    console.log('Per eseguire questa migration, usa uno di questi metodi:')
    console.log('')
    console.log('1. SUPABASE DASHBOARD (Consigliato):')
    console.log('   - Vai su https://app.supabase.com')
    console.log('   - Apri SQL Editor')
    console.log('   - Copia e incolla questo SQL:')
    console.log('─'.repeat(50))
    console.log(sql)
    console.log('─'.repeat(50))
    console.log('')
    console.log('2. SUPABASE CLI:')
    console.log('   npm install -g supabase')
    console.log('   supabase db push')
    console.log('')

  } catch (error) {
    console.error('❌ Errore durante l\'esecuzione della migration:', error.message)
    process.exit(1)
  }
}

// Main
const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('❌ Uso: node run-migration.js <migration-file>')
  console.error('Esempio: node run-migration.js 20260311_add_google_oauth_fields.sql')
  process.exit(1)
}

runMigration(migrationFile)
