# Configurazione Google Cloud Console per OAuth

Questa guida spiega come configurare Google Cloud Console per abilitare il login con Google nell'applicazione Ghergo Immobiliare.

## ⚠️ IMPORTANTE: Eseguire la Migration Prima di Iniziare

Prima di configurare Google Cloud Console, è **OBBLIGATORIO** eseguire la migration del database:

1. Vai su [Supabase Dashboard](https://app.supabase.com)
2. Seleziona il progetto
3. Vai su **SQL Editor**
4. Copia e incolla il contenuto di `supabase/migrations/20260311_add_google_oauth_fields.sql`
5. Clicca **Run**

Questa migration aggiunge:
- `google_oauth_enabled`: flag per abilitare Google OAuth per singolo agente
- `google_tokens`: storage per i token OAuth

Senza questa migration, il login con Google **NON FUNZIONERÀ**.

## Prerequisiti

- Account Google dell'organizzazione Ghergo Immobiliare
- Accesso come amministratore per gestire Google Cloud Console
- URL dell'applicazione in produzione
- Migration del database eseguita (vedi sopra)

## Passaggi di Configurazione

### 1. Accesso a Google Cloud Console

1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Accedi con l'account Google di Ghergo Immobiliare
3. Crea un nuovo progetto o seleziona quello esistente per Ghergo Immobiliare

### 2. Abilita le API necessarie

1. Nel menu di navigazione, vai su **API e servizi > Libreria**
2. Cerca e abilita le seguenti API:
   - **Google+ API** (per autenticazione e profilo utente)
   - **Gmail API** (per funzionalità email)
   - **Google Calendar API** (per gestione open house e appuntamenti)

### 3. Configura la Schermata di Consenso OAuth

1. Vai su **API e servizi > Schermata consenso OAuth**
2. Seleziona **Interno** se usi Google Workspace (consigliato) o **Esterno**
3. Compila i campi richiesti:
   - **Nome applicazione**: Ghergo Immobiliare Web App
   - **Email assistenza utenti**: support@ghergoimmobiliare.com
   - **Logo applicazione**: (opzionale) carica il logo Ghergo
   - **Dominio applicazione**: il dominio dove è hostata l'app
   - **Email sviluppatore**: email del team di sviluppo

4. Nella sezione **Ambiti** (Scopes), aggiungi i seguenti ambiti:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `openid`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

5. Salva e continua

### 4. Crea le Credenziali OAuth 2.0

1. Vai su **API e servizi > Credenziali**
2. Clicca su **+ CREA CREDENZIALI**
3. Seleziona **ID client OAuth 2.0**
4. Compila i campi:
   - **Tipo di applicazione**: Applicazione web
   - **Nome**: Ghergo Immobiliare OAuth Client

5. In **Origini JavaScript autorizzate**, aggiungi:
   ```
   http://localhost:3000 (per sviluppo)
   https://tuo-dominio-produzione.com
   ```

6. In **URI di reindirizzamento autorizzati**, aggiungi:
   ```
   http://localhost:3000/api/auth/google/login-callback (per sviluppo)
   https://tuo-dominio-produzione.com/api/auth/google/login-callback
   ```

7. Clicca **CREA**

8. Salva le credenziali generate:
   - **ID client**: copia questo valore
   - **Segreto client**: copia questo valore

### 5. Configura le Variabili d'Ambiente

Nel file `.env.local` (o nelle variabili d'ambiente di produzione), aggiungi:

```env
# Google OAuth
GOOGLE_CLIENT_ID=tuo-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tuo-client-secret

# URL del sito (importante per il redirect)
NEXT_PUBLIC_SITE_URL=https://tuo-dominio-produzione.com

# Supabase Service Role (richiesto per creare sessioni)
SUPABASE_SERVICE_ROLE_KEY=tua-service-role-key
```

### 6. Abilita Google OAuth per gli Agenti

**IMPORTANTE**: Per motivi di sicurezza, il login con Google deve essere **esplicitamente abilitato** per ogni agente dall'amministratore.

1. Vai su `/admin/agents` (Gestione Agenti)
2. Nella tabella agenti, trova la colonna **Google OAuth**
3. Clicca sul pulsante per abilitare Google OAuth per gli agenti desiderati
   - **Disabilitato** (grigio): l'agente NON può usare "Accedi con Google"
   - **Abilitato** (blu): l'agente PUÒ usare "Accedi con Google"

Solo gli agenti con Google OAuth abilitato potranno autenticarsi tramite Google. Questo previene accessi non autorizzati.

### 7. Verifica Configurazione

Dopo aver configurato tutto:

1. Riavvia l'applicazione in sviluppo o ri-deploya in produzione
2. Vai alla pagina di login (`/admin/login` o `/dashboard/login`)
3. Clicca su **Accedi con Google**
4. Dovresti essere reindirizzato alla schermata di consenso Google
5. Dopo aver autorizzato, dovresti essere reindirizzato alla dashboard appropriata

**Nota**: Se vedi "Login con Google non abilitato per questo account", significa che l'amministratore non ha ancora abilitato Google OAuth per il tuo account nella sezione Gestione Agenti.

## Sicurezza e Best Practices

### Ambiente di Sviluppo vs Produzione

- Usa credenziali OAuth separate per sviluppo e produzione
- Non condividere mai il segreto client pubblicamente
- Mantieni il segreto client in variabili d'ambiente sicure

### Limitazioni e Quota

- Google limita le richieste API per giorno
- Monitora l'utilizzo nella sezione **API e servizi > Dashboard**
- Se necessario, richiedi quota aggiuntiva

### Utenti Autorizzati

L'applicazione implementa un **doppio livello di sicurezza** per Google OAuth:

**Livello 1 - Google Cloud Console:**

Se usi **Tipo utente: Interno** (Google Workspace):
- Solo gli utenti con email @ghergoimmobiliare.com potranno autenticarsi
- Questo offre un livello di sicurezza aggiuntivo

Se usi **Tipo utente: Esterno**:
- Qualsiasi utente Google può iniziare il flusso OAuth

**Livello 2 - Applicazione (sempre attivo):**
1. L'email deve esistere nella tabella `gre_agents`
2. L'account deve avere `is_active = true`
3. L'account deve avere `google_oauth_enabled = true` (abilitato dall'admin)

Solo se **tutti e tre** i controlli passano, l'utente può accedere. Questo previene accessi non autorizzati anche se qualcuno ha un account Google con email simile.

## Troubleshooting

### Errore: "redirect_uri_mismatch"
- Verifica che l'URI di reindirizzamento in Google Cloud Console corrisponda esattamente a quello usato dall'app
- Controlla che `NEXT_PUBLIC_SITE_URL` sia configurato correttamente

### Errore: "Access denied"
- Verifica che tutti gli ambiti richiesti siano stati autorizzati nella schermata di consenso
- Controlla che le API necessarie siano abilitate

### Errore: "Account non trovato o non attivo"
- L'utente Google non ha un account corrispondente nella tabella `gre_agents`
- Verifica che l'email dell'utente sia presente e che `is_active = true`

### Errore: "Login con Google non abilitato per questo account"
- L'agente esiste nel database ma Google OAuth non è abilitato
- Vai su `/admin/agents` e abilita Google OAuth per quell'agente
- Solo l'amministratore può abilitare questa funzionalità

### Token Scaduti
- I token di accesso Google scadono dopo 1 ora
- I refresh token permettono di ottenere nuovi access token
- Assicurati che i refresh token siano salvati correttamente

## Funzionalità Implementate

- ✅ Colonna `google_oauth_enabled` per controllo accesso granulare
- ✅ Colonna `google_tokens` JSONB per storage dei token OAuth
- ✅ Salvataggio automatico dei token nel database
- ✅ Dashboard admin per abilitare/disabilitare Google OAuth per singolo agente
- ✅ Validazione a tre livelli (email esistente + account attivo + OAuth abilitato)

## Prossimi Miglioramenti

- [ ] Implementare refresh automatico dei token scaduti
- [ ] Aggiungere logging per audit degli accessi OAuth
- [ ] Implementare revoca dei token quando l'utente fa logout
- [ ] Mostrare ultimo accesso via Google nella dashboard admin

## Link Utili

- [Google Cloud Console](https://console.cloud.google.com)
- [Documentazione OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-api)
