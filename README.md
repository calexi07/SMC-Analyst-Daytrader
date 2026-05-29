# Zones Tracker — SMC Analyst Daytrader

## Setup în 4 pași

---

### PASUL 1 — Supabase: Creează tabelele

1. Du-te la [supabase.com](https://supabase.com) → proiectul tău
2. Click **SQL Editor** → **New Query**
3. Copiază tot conținutul din `supabase_setup.sql` și apasă **Run**

---

### PASUL 2 — Supabase: Creează Storage Bucket

1. În Supabase Dashboard → **Storage** → **New bucket**
2. Nume: `zone-images`
3. **Public bucket: ON** (toggle activat)
4. Click **Save**
5. Click pe bucket-ul creat → **Policies** → **New policy** → **For full customization**
   - Policy name: `allow all`
   - Allowed operation: **ALL**
   - Target roles: lasă gol (anon + authenticated)
   - USING expression: `true`
   - WITH CHECK expression: `true`
   - Click **Review** → **Save policy**

---

### PASUL 3 — GitHub: Upload fișiere

1. Du-te la repo-ul tău: `https://github.com/calexi07/SMC-Analyst-Daytrader`
2. Dacă repo-ul e gol, poți uploada direct din browser:
   - Click **Add file** → **Upload files**
   - Uploadează în această structură:
     ```
     index.html
     css/
       main.css
     js/
       config.js
       db.js
       pairs.js
       zones.js
       comments.js
       app.js
     ```
3. Sau folosește GitHub Desktop / git CLI:
   ```bash
   git clone https://github.com/calexi07/SMC-Analyst-Daytrader.git
   cd SMC-Analyst-Daytrader
   # copiază fișierele în folder
   git add .
   git commit -m "Initial zones tracker"
   git push
   ```

---

### PASUL 4 — GitHub Pages: Activează

1. În repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → **/ (root)**
4. Click **Save**
5. Așteaptă ~1 minut → site-ul va fi live la:
   `https://calexi07.github.io/SMC-Analyst-Daytrader/`

---

## Structura fișierelor

```
index.html          ← entry point, nu atinge dacă nu e necesar
css/
  main.css          ← tot CSS-ul
js/
  config.js         ← perechi, credențiale Supabase, constante
  db.js             ← toate apelurile Supabase (izolat)
  pairs.js          ← dropdown pairs
  zones.js          ← logica zonelor (add/edit/delete/render)
  comments.js       ← logica comentariilor + upload imagini
  app.js            ← controller principal
supabase_setup.sql  ← SQL pentru setup (rulează o singură dată)
```

## Modificări frecvente

- **Adaugă/scoate perechi** → `js/config.js` → array `TRADING_PAIRS`
- **Schimbă stiluri** → `css/main.css`
- **Logică zone** → `js/zones.js`
- **Logică comentarii** → `js/comments.js`
- **Queries DB** → `js/db.js`
