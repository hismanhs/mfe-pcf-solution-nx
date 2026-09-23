# Deployment Checklist & Quick Start

## ✅ Build Verification (Complete)

- ✓ MFE Transformation built (568 KB)
- ✓ MFE Compliance built (564 KB)  
- ✓ API Server ready (4.7 MB)

### Build Locations
- **MFE 1:** `apps/mfe-transformation/dist`
- **MFE 2:** `apps/mfe-compliance/dist`
- **API:** `apps/api` (ready for Render)

---

## Deployment Options

### Option 1: Netlify Drag & Drop (Fastest - 5 minutes)

1. Open: https://app.netlify.com/drop
2. Drag: `apps/mfe-transformation/dist`
   - Copy URL: ___________________________
3. Drag: `apps/mfe-compliance/dist`
   - Copy URL: ___________________________

✓ MFEs deployed!

### Option 2: Netlify CLI

```bash
# Install CLI (one-time)
npm install -g netlify-cli
netlify login

# Deploy MFE 1
netlify deploy --prod --dir apps/mfe-transformation/dist

# Deploy MFE 2
netlify deploy --prod --dir apps/mfe-compliance/dist
```

### Option 3: Git-Based Netlify

1. Push to GitHub
2. Connect in app.netlify.com
3. Auto-deploys on every push

---

## API Server Deployment

### Recommended: Render (Free tier + $5 credit)

1. Visit: https://render.com
2. Create account (sign in with GitHub)
3. Click: "New" → "Web Service"
4. Connect your GitHub repository

5. Configure:
   - **Name:** mfe-auth-api
   - **Environment:** Node
   - **Build Command:** `cd apps/api && npm install`
   - **Start Command:** `cd apps/api && npm start`
   - **Port:** 3000

6. Environment Variables:
   - `JWT_SECRET` = your-secret-key
   - `NODE_ENV` = production

7. Click "Deploy"
   - API URL: ___________________________

### Alternative: Railway or Heroku
- Railway: https://railway.app
- Heroku: https://heroku.com

---

## URLs to Collect

Once deployed, fill in:

- **MFE Transformation URL:** ___________________________
- **MFE Compliance URL:** ___________________________
- **API Server URL:** ___________________________

---

## Verification Tests

### TEST 1: API Health Check
```bash
curl https://[API_URL]/api/health
```
Expected: `{"status":"ok","service":"mfe-auth-api"}`
Result: ✓ / ✗

### TEST 2: API Login Endpoint
```bash
curl -X POST https://[API_URL]/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@contoso.com","password":"Pass@123"}'
```
Expected: JWT token in response
Result: ✓ / ✗

### TEST 3: Visit MFE URLs
Open in browser:
- https://[MFE1_URL]
- https://[MFE2_URL]

Expected: React app loads successfully
Result: ✓ / ✗

### TEST 4: CORS Check
Run in browser console on MFE:
```javascript
fetch('https://[API_URL]/api/health')
  .then(r => r.json())
  .then(console.log)
```
Expected: `{"status":"ok","service":"mfe-auth-api"}`
Result: ✓ / ✗

---

## Update Application Config

### 1. Update MFE Code (if calling the API)
Replace `localhost:3000` with `https://[API_URL]`

Files to check:
- `apps/mfe-transformation/src/App.tsx`
- `apps/mfe-compliance/src/App.tsx`
- `apps/pcf-control/MfeHostControl/index.ts`

### 2. Update Power Apps PCF Control
Add deployed URLs to `ControlManifest.Input.xml`:
```xml
<mfe-transformation-url>https://[MFE1_URL]</mfe-transformation-url>
<mfe-compliance-url>https://[MFE2_URL]</mfe-compliance-url>
<auth-api-url>https://[API_URL]</auth-api-url>
```

---

## Demo Credentials

For testing (change in production!):
- **Email:** demo@contoso.com
- **Password:** Pass@123

To change: Edit `apps/api/server.js` and search for `const users = [`

---

## Deployment Completed ✓

Once all checks pass:
- ☑ MFEs deployed to Netlify
- ☑ API deployed to Render/Railway/Heroku
- ☑ All URLs collected
- ☑ Verification tests pass
- ☑ Configuration updated

**You're ready to connect to Power Apps!**

---

## Reference Files

- [DEPLOYMENT_READY.md](DEPLOYMENT_READY.md) - Full guide
- [DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md) - Quick reference
- [DEPLOYMENT_COMMANDS.sh](DEPLOYMENT_COMMANDS.sh) - Copy-paste commands
