# Netlify Deployment Guide

## Quick Deploy MFEs (Static Hosting)

### Option 1: Drag & Drop (Easiest - No Account Required)
1. Build both MFEs:
   ```bash
   cd apps/mfe-transformation && npm run build
   cd ../mfe-compliance && npm run build
   ```

2. Visit [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag `apps/mfe-transformation/dist` → Get URL (e.g., `https://your-mfe1.netlify.app`)
4. Drag `apps/mfe-compliance/dist` → Get URL (e.g., `https://your-mfe2.netlify.app`)

### Option 2: Git-Based Deployment (Persistent)

#### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/your-repo.git
git push -u origin main
```

#### Step 2: Deploy MFEs via Netlify UI
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Create separate sites for each MFE:
   - **Site 1 (mfe-transformation):**
     - Build command: `cd apps/mfe-transformation && npm run build`
     - Publish directory: `apps/mfe-transformation/dist`
   
   - **Site 2 (mfe-compliance):**
     - Build command: `cd apps/mfe-compliance && npm run build`
     - Publish directory: `apps/mfe-compliance/dist`

## Deploy API Server

**Important:** Netlify's free tier is for static sites. For the API server, use one of these alternatives:

### Option A: Netlify Functions (Free Tier Available)
Convert the Express server to Netlify Functions or use a serverless wrapper.

### Option B: Other Free Platforms (Recommended)
- **Render** (https://render.com) - Free tier with automatic deployments
- **Railway** (https://railway.app) - Pay-as-you-go, free tier includes $5/month credit
- **Heroku** (https://www.heroku.com) - Eco dynos available

### Deploy to Render (Recommended)
1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name:** mfe-auth-api
   - **Environment:** Node
   - **Build Command:** `cd apps/api && npm install`
   - **Start Command:** `cd apps/api && npm start`
   - **Port:** 3000
5. Add environment variables:
   - `JWT_SECRET`: Your secret key
   - `NODE_ENV`: production
6. Deploy!

Your API will be at: `https://mfe-auth-api.onrender.com`

## Update MFE Configuration

Once deployed, update the API URLs in your MFE code:

**For React Components** (if they call the API):
Replace `localhost:3000` with your deployed API URL:
```
https://mfe-auth-api.onrender.com
```

## Environment Variables for Production

### API Server (.env)
```
JWT_SECRET=your-production-secret-key-here
PORT=3000
```

### MFEs (if needed in webpack/build config)
```
REACT_APP_API_URL=https://mfe-auth-api.onrender.com
```

## Verification Checklist
- [ ] mfe-transformation deployed to Netlify
- [ ] mfe-compliance deployed to Netlify
- [ ] API server deployed to Render/Railway/Heroku
- [ ] Verify API health: `https://your-api.com/api/health`
- [ ] Test login endpoint: POST to `https://your-api.com/api/login`
- [ ] MFEs can reach the API endpoint
