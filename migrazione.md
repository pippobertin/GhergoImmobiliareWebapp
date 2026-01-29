# 🚀 Guida Migrazione Completa - Webapp Ghergo Immobiliare

## 📋 OVERVIEW
Questa guida descrive la migrazione dell'applicazione dal mio account Google personale all'account Google del cliente, mantenendo tutte le funzionalità operative.

---

## ⚠️ PREREQUISITI

### 1. Account Google Cliente
- ✅ Account Google Workspace/Gmail del cliente attivo
- ✅ Accesso admin all'account (per abilitare API)
- ✅ Dominio personalizzato configurato (opzionale ma consigliato)

### 2. Accessi Necessari
- ✅ Accesso a Google Cloud Console del cliente
- ✅ Credenziali database Supabase (se trasferito)
- ✅ Accesso al server di produzione
- ✅ Credenziali GitHub per deploy

---

## 🔧 FASE 1: SETUP GOOGLE CLOUD PROJECT (CLIENTE)

### Step 1.1: Creazione Nuovo Project
1. Accedere a [Google Cloud Console](https://console.cloud.google.com) con account cliente
2. Cliccare su dropdown project in alto
3. "New Project" → Nome: `ghergo-immobiliare-webapp`
4. Annotare il **PROJECT_ID** generato

### Step 1.2: Abilitazione API
```bash
# Abilitare le seguenti API:
1. Gmail API
2. Google Calendar API
3. Google OAuth2 API
```

**Console UI:**
- Andare su "APIs & Services" → "Library"
- Cercare e abilitare:
  - ✅ Gmail API
  - ✅ Google Calendar API
  - ✅ Google+ API (per OAuth)

### Step 1.3: Configurazione OAuth Consent Screen
1. "APIs & Services" → "OAuth consent screen"
2. Selezionare **External** (o Internal se G Workspace)
3. Compilare form:
   ```
   App name: Ghergo Immobiliare - Gestione Open House
   User support email: [EMAIL_CLIENTE]
   Developer contact: [EMAIL_CLIENTE]
   App domain: [DOMINIO_PRODUZIONE]
   Authorized domains: [DOMINIO_SENZA_HTTPS]
   ```

### Step 1.4: Creazione Credenziali OAuth
1. "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
2. Application type: **Web application**
3. Name: `Ghergo Webapp OAuth`
4. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://[DOMINIO_PRODUZIONE]
   ```
5. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/google/callback
   https://[DOMINIO_PRODUZIONE]/api/auth/google/callback
   ```
6. **SALVARE:** Client ID e Client Secret

---

## 🔐 FASE 2: AGGIORNAMENTO VARIABILI AMBIENTE

### Step 2.1: File .env.local (Development)
```env
# Google OAuth (NUOVE CREDENZIALI CLIENTE)
GOOGLE_CLIENT_ID=[CLIENT_ID_CLIENTE]
GOOGLE_CLIENT_SECRET=[CLIENT_SECRET_CLIENTE]
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Tokens OAuth (INIZIALMENTE VUOTI)
GOOGLE_ACCESS_TOKEN=
GOOGLE_REFRESH_TOKEN=

# Database (STESSO O NUOVO)
NEXT_PUBLIC_SUPABASE_URL=[SUPABASE_URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[SUPABASE_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SUPABASE_SERVICE_KEY]

# App Config
NEXTAUTH_SECRET=[GENERA_NUOVO_SECRET]
NEXTAUTH_URL=http://localhost:3000
```

### Step 2.2: File .env.production (Server)
```env
# Google OAuth (STESSE CREDENZIALI)
GOOGLE_CLIENT_ID=[CLIENT_ID_CLIENTE]
GOOGLE_CLIENT_SECRET=[CLIENT_SECRET_CLIENTE]
GOOGLE_REDIRECT_URI=https://[DOMINIO]/api/auth/google/callback

# Tokens OAuth (DA CONFIGURARE DOPO AUTH)
GOOGLE_ACCESS_TOKEN=
GOOGLE_REFRESH_TOKEN=

# Database
NEXT_PUBLIC_SUPABASE_URL=[SUPABASE_URL_PROD]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[SUPABASE_ANON_KEY_PROD]
SUPABASE_SERVICE_ROLE_KEY=[SUPABASE_SERVICE_KEY_PROD]

# App Config
NEXTAUTH_SECRET=[SECRET_SICURO_PRODUZIONE]
NEXTAUTH_URL=https://[DOMINIO]
```

---

## 📊 FASE 3: MIGRAZIONE DATABASE (SE NECESSARIO)

### Opzione A: Mantenere Supabase Esistente
- Aggiungere cliente come Owner del progetto Supabase
- Aggiornare solo le variabili env

### Opzione B: Nuovo Database Supabase Cliente
1. Cliente crea nuovo progetto su [Supabase](https://supabase.com)
2. Esportare schema e dati attuali:
   ```sql
   -- Esportare strutture tabelle
   pg_dump --schema-only [CONNESSIONE_ATTUALE] > schema.sql

   -- Esportare dati (se necessario)
   pg_dump --data-only [CONNESSIONE_ATTUALE] > data.sql
   ```
3. Importare nel nuovo database:
   ```sql
   psql [NUOVA_CONNESSIONE] < schema.sql
   psql [NUOVA_CONNESSIONE] < data.sql
   ```
4. Aggiornare .env con nuove credenziali

---

## 🔑 FASE 4: PRIMA AUTENTICAZIONE GOOGLE

### Step 4.1: Test Locale
1. Avviare app in locale: `npm run dev`
2. Login come admin nell'app
3. Andare su qualsiasi dashboard con `GoogleConnectionStatus`
4. Cliccare "Riconnetti" quando appare errore
5. Completare OAuth flow con account cliente
6. Copiare i token dalla risposta/logs

### Step 4.2: Ottenere Refresh Token
**METODO 1 - Da Browser Network Tab:**
1. F12 → Network → fare OAuth flow
2. Cercare chiamata a `/api/auth/google/callback`
3. Copiare `access_token` e `refresh_token`

**METODO 2 - Da Logs Server:**
```javascript
// Aggiungere temporaneamente in /api/auth/google/callback/route.ts
console.log('🔑 ACCESS TOKEN:', tokens.access_token)
console.log('🔑 REFRESH TOKEN:', tokens.refresh_token)
```

### Step 4.3: Aggiornare Environment
```env
GOOGLE_ACCESS_TOKEN=[TOKEN_OTTENUTO]
GOOGLE_REFRESH_TOKEN=[REFRESH_TOKEN_OTTENUTO]
```

---

## 🚀 FASE 5: DEPLOY PRODUZIONE

### Step 5.1: Preparazione Codice
```bash
# Assicurarsi che tutto sia committato
git add .
git commit -m "Configurazione per account cliente"
git push origin main
```

### Step 5.2: Deploy su Server
```bash
# SSH nel server di produzione
ssh [USER]@[SERVER]

# Pull ultimo codice
cd [PATH_APP]
git pull origin main

# Installare dipendenze
npm install

# Build produzione
npm run build

# Aggiornare env di produzione
cp .env.production .env.local

# Restart applicazione
pm2 restart ghergo-webapp
# O se Docker:
docker-compose down && docker-compose up -d
```

### Step 5.3: Test OAuth Produzione
1. Andare su `https://[DOMINIO]`
2. Login admin
3. Verificare GoogleConnectionStatus
4. Ripetere processo OAuth se necessario
5. Aggiornare .env produzione con nuovi token

---

## ✅ FASE 6: VERIFICA FUNZIONALITÀ

### Checklist Test:
```
□ Login admin/agent funzionante
□ GoogleConnectionStatus mostra "Connesso"
□ Invio email automatiche funziona
□ Creazione eventi calendario funziona
□ Dashboard statistiche caricate
□ Open Houses visualizzazione corretta
□ Prenotazioni Open House funzionanti
□ Form contatti/lead capturing
□ Responsive design mobile
```

### Test Email:
1. Creare test Open House
2. Fare prenotazione test
3. Verificare ricezione email:
   - ✅ Cliente riceve conferma
   - ✅ Agente riceve notifica
   - ✅ Email formattate correttamente

### Test Calendar:
1. Creare Open House
2. Verificare evento in Google Calendar cliente
3. Controllare dettagli evento corretti

---

## 🔧 FASE 7: CONFIGURAZIONI FINALI

### Step 7.1: Email Templates
Verificare che tutti i template email abbiano:
- Branding cliente corretto
- Link funzionanti al dominio produzione
- Contatti agenti corretti

### Step 7.2: Pulizia Development
```bash
# Rimuovere logs debug
# Rimuovere console.log temporanei
# Verificare nessun hardcoded reference al mio account
```

### Step 7.3: Documentazione Cliente
Creare guida per cliente:
```
- Come gestire agenti
- Come creare Open House
- Come monitorare prenotazioni
- Cosa fare se Google si disconnette
- Backup/manutenzione periodica
```

---

## 🚨 TROUBLESHOOTING COMUNI

### Problema: "Invalid Grant" Error
**Soluzione:**
```bash
# Refresh token scaduto - rifare OAuth flow
# Andare su GoogleConnectionStatus → Riconnetti
```

### Problema: "Redirect URI Mismatch"
**Soluzione:**
```bash
# Verificare in Google Cloud Console:
# - URI esatti in OAuth credentials
# - HTTPS vs HTTP corretto
# - Domini autorizzati corretti
```

### Problema: API Quota Exceeded
**Soluzione:**
```bash
# Google Cloud Console → APIs → Quotas
# Richiedere aumento limiti se necessario
```

### Problema: CORS Errors
**Soluzione:**
```bash
# Verificare in OAuth Consent Screen:
# - Domini autorizzati corretti
# - JavaScript origins corretti
```

---

## 📞 SUPPORTO POST-MIGRAZIONE

### Contatti Emergenza:
- **Developer:** [TUO_CONTATTO]
- **Supabase Support:** dashboard.supabase.com
- **Google Cloud Support:** console.cloud.google.com

### Monitoraggio Ongoing:
- GoogleConnectionStatus ogni 30 secondi
- Logs server per errori email/calendar
- Backup database Supabase automatico

---

## 🎯 CHECKLIST FINALE MIGRAZIONE

```
PREPARAZIONE:
□ Google Cloud Project cliente creato
□ API abilitate (Gmail, Calendar, OAuth)
□ Credenziali OAuth configurate
□ Variabili ambiente aggiornate

AUTENTICAZIONE:
□ OAuth flow completato
□ Access/Refresh token ottenuti
□ GoogleConnectionStatus verde

DEPLOY:
□ Codice pushato su repository
□ Server produzione aggiornato
□ Environment produzione configurato
□ App riavviata e funzionante

TEST:
□ Funzionalità email testate
□ Calendario integrazione testata
□ Dashboard complete funzionanti
□ Mobile responsive verificato

DOCUMENTAZIONE:
□ Credenziali sicure salvate
□ Guida cliente creata
□ Troubleshooting documentato
□ Contatti supporto forniti
```

---

**🎉 MIGRAZIONE COMPLETATA!**

*La webapp è ora completamente operativa sull'account Google del cliente con piena autonomia e controllo.*