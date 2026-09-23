# Quick Deployment Reference

## Your Applications Are Built ✓

### 1. MFE Transformation (Built)
- **Location:** `apps/mfe-transformation/dist`
- **Size:** ~140 KB
- **Deploy to:** Netlify (Free)
- **URL Pattern:** `https://mfe-transformation-yourname.netlify.app`

### 2. MFE Compliance (Built)
- **Location:** `apps/mfe-compliance/dist`
- **Size:** ~140 KB
- **Deploy to:** Netlify (Free)
- **URL Pattern:** `https://mfe-compliance-yourname.netlify.app`

### 3. API Server (Ready)
- **Location:** `apps/api`
- **Tech:** Express.js + Node.js
- **Deploy to:** Render, Railway, or Heroku
- **Endpoints:**
  - `GET /api/health` → Health check
  - `POST /api/login` → Authentication
- **URL Pattern:** `https://mfe-auth-api-yourname.onrender.com`

---

## Fastest Deployment (5 minutes)

### MFEs: Netlify Drag & Drop
```
1. Visit: https://app.netlify.com/drop
2. Drag: apps/mfe-transformation/dist
3. Get URL, note it down
4. Drag: apps/mfe-compliance/dist
5. Get URL, note it down
6. Done! ✓
```

### API: Render Web Service
```
1. Visit: https://render.com
2. Click: "New +" → "Web Service"
3. Connect: Your GitHub repository
4. Settings:
   - Build Command: cd apps/api && npm install
   - Start Command: cd apps/api && npm start
   - Port: 3000
5. Environment Variables:
   - JWT_SECRET=your-secret-key
   - NODE_ENV=production
6. Deploy! ✓
```

---

## Test Your Deployments

### Test API Health
```bash
curl https://your-api.onrender.com/api/health
# Expected: {"status":"ok","service":"mfe-auth-api"}
```

### Test API Login
```bash
curl -X POST https://your-api.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@contoso.com","password":"Pass@123"}'
# Expected: JWT token in response
```

### Test CORS (from MFE)
```bash
# MFEs can make requests to API
fetch('https://your-api.onrender.com/api/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'demo@contoso.com', password: 'Pass@123'})
})
```

---

## Common Credentials (Demo Only)

| Field | Value |
|-------|-------|
| Email | demo@contoso.com |
| Password | Pass@123 |

⚠️ **DO NOT use these in production. Change in `apps/api/server.js`**

---

## File Reference for Deployment

| File | Purpose |
|------|---------|
| `apps/mfe-transformation/netlify.toml` | Netlify config (MFE1) |
| `apps/mfe-compliance/netlify.toml` | Netlify config (MFE2) |
| `apps/api/render.yaml` | Render deployment config |
| `apps/api/package.json` | Dependencies |
| `apps/api/server.js` | Express server (main entry) |

---

## Environment Variables

### For API Server (.env)
```
JWT_SECRET=your-production-secret-key
PORT=3000
NODE_ENV=production
```

### Example .env file location: `apps/api/.env`

---

## Troubleshooting

### API not responding
- Check if Render service is running (green status in dashboard)
- Verify JWT_SECRET is set in environment variables
- Test health endpoint: `/api/health`

### CORS errors
- Verify netlify.toml has correct headers (already configured)
- Ensure API endpoint URL is correct in MFE code

### Build fails
- Check Node.js version (v18+ recommended)
- Verify npm dependencies: `npm install` in each app directory
- Check build logs in Render/Netlify dashboard

---

## Deployment Status Checklist

- [ ] MFE Transformation deployed to Netlify
  - URL: _________________________
  - Manifest working: _________________________
  
- [ ] MFE Compliance deployed to Netlify
  - URL: _________________________
  - Manifest working: _________________________
  
- [ ] API Server deployed to Render
  - URL: _________________________
  - Health check passes: _________________________
  - Login endpoint works: _________________________

- [ ] All three services can communicate
  - API CORS headers correct: _________________________
  - MFEs can call API: _________________________

---

## Next Steps

1. ✓ Build complete
2. → Deploy MFEs to Netlify
3. → Deploy API to Render
4. → Update API URLs in MFE code (if needed)
5. → Test all endpoints
6. → Update Power Apps with new URLs
