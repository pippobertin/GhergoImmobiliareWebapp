# Database Migrations

Questa cartella contiene le migrazioni SQL per il database Supabase.

## Come Eseguire le Migrations

### Opzione 1: Supabase Dashboard (Consigliata)
1. Vai su [Supabase Dashboard](https://app.supabase.com)
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. Copia e incolla il contenuto del file `.sql`
5. Clicca **Run** per eseguire

### Opzione 2: Supabase CLI
```bash
# Installa Supabase CLI se non l'hai già fatto
npm install -g supabase

# Collega il progetto
supabase link --project-ref your-project-ref

# Esegui la migration
supabase db push
```

### Opzione 3: Script Node.js
```bash
node supabase/run-migration.js <migration-file>
```

## Migrations Disponibili

### `20260311_add_google_oauth_fields.sql`
**Descrizione**: Aggiunge supporto per Google OAuth
**Campi aggiunti**:
- `google_oauth_enabled` (BOOLEAN): Flag per abilitare login Google per singolo agente
- `google_tokens` (JSONB): Storage per access_token e refresh_token di Google

**Quando eseguire**: Prima di abilitare la funzionalità "Accedi con Google"

## Rollback

Se necessario fare rollback di una migration:

```sql
-- Rollback per 20260311_add_google_oauth_fields.sql
ALTER TABLE gre_agents DROP COLUMN IF EXISTS google_oauth_enabled;
ALTER TABLE gre_agents DROP COLUMN IF EXISTS google_tokens;
DROP INDEX IF EXISTS idx_gre_agents_google_oauth_enabled;
```
