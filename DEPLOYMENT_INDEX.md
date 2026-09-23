# Deployment Documentation Index

## Start Here 👇

### 1. **DEPLOYMENT_CHECKLIST.md** ⭐ START HERE
A fillable checklist with all deployment steps and URLs to collect.
- Deployment options
- Verification tests  
- Configuration updates

### 2. **DEPLOYMENT_QUICK_REFERENCE.md** 
Quick reference card with all important info at a glance.
- Build sizes and locations
- Deployment credentials
- Common commands
- Troubleshooting

### 3. **DEPLOYMENT_READY.md**
Complete deployment guide with detailed explanations.
- Full deployment paths
- Integration points
- Security notes

## By Platform

### Netlify (MFEs)
- **File:** NETLIFY_DEPLOYMENT_GUIDE.md
- **Quick:** DEPLOYMENT_QUICK_REFERENCE.md → "Fastest Deployment"
- **Config:** apps/mfe-transformation/netlify.toml, apps/mfe-compliance/netlify.toml

### Render (API Server)
- **File:** DEPLOYMENT_READY.md → "Deploy to Render"
- **Config:** apps/api/render.yaml
- **Env:** apps/api/.env.example

## Quick Copy-Paste

See: DEPLOYMENT_COMMANDS.sh

## Build Artifacts Ready

```
✓ apps/mfe-transformation/dist      (568 KB - ready to deploy)
✓ apps/mfe-compliance/dist          (564 KB - ready to deploy)  
✓ apps/api                          (ready for Node.js host)
```

## Deployment Paths

### Fastest (5 minutes, no CLI)
1. Netlify Drop: https://app.netlify.com/drop
2. Render Web Service: https://render.com

### Using CLI
```bash
npm install -g netlify-cli
netlify deploy --prod --dir apps/mfe-transformation/dist
netlify deploy --prod --dir apps/mfe-compliance/dist
```

### Using GitHub (Auto-deploy on push)
1. Push to GitHub
2. Connect Netlify to repo
3. Auto-deploys on every commit

## After Deployment

1. Collect URLs from all three deployments
2. Run verification tests (see DEPLOYMENT_CHECKLIST.md)
3. Update Power Apps with new URLs
4. Test MFEs in Power Apps

## Key Information

| Item | Value |
|------|-------|
| Email (demo) | demo@contoso.com |
| Password (demo) | Pass@123 |
| API Health | GET /api/health |
| API Login | POST /api/login |

⚠️ Change credentials for production!

## Common Issues

See: DEPLOYMENT_QUICK_REFERENCE.md → "Troubleshooting"

- MFE not loading → Check CORS headers (already configured)
- API not responding → Check Render dashboard status
- Build failed → Check build logs in platform dashboard

## Files Created for Deployment

```
Root directory:
├── DEPLOYMENT_READY.md                 (Full guide - READ THIS)
├── DEPLOYMENT_QUICK_REFERENCE.md       (Quick reference)
├── DEPLOYMENT_CHECKLIST.md             (Fillable checklist)
├── DEPLOYMENT_COMMANDS.sh              (Copy-paste commands)
└── NETLIFY_DEPLOYMENT_GUIDE.md         (Netlify specific)

API Server:
└── apps/api/
    ├── netlify.toml                    (Alternative config)
    ├── render.yaml                     (Render config)
    ├── .env.example                    (Environment template)
    ├── package.json                    (Dependencies - Node v18+)
    └── server.js                       (Express.js server)

MFEs (already configured):
├── apps/mfe-transformation/
│   └── netlify.toml                    (Netlify config with CORS)
└── apps/mfe-compliance/
    └── netlify.toml                    (Netlify config with CORS)
```

---

**Next Action:** Open DEPLOYMENT_CHECKLIST.md and start with Step 1!
