#!/bin/bash

# Deployment helper for MFE PCF Solution
# Deploys both MFEs to Netlify and the API server to Render

set -e

echo "==================================="
echo "MFE PCF Solution - Deployment Helper"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build all applications
echo -e "${BLUE}Step 1: Building applications...${NC}"
npm run build
echo -e "${GREEN}✓ Build complete!${NC}"
echo ""

# Step 2: MFE Deployment Instructions
echo -e "${BLUE}Step 2: Deploying MFEs to Netlify${NC}"
echo ""
echo -e "${YELLOW}Option A: Quick Deploy (Drag & Drop)${NC}"
echo "1. Go to https://app.netlify.com/drop"
echo "2. Drag these folders one by one:"
echo "   - apps/mfe-transformation/dist → Get URL 1"
echo "   - apps/mfe-compliance/dist → Get URL 2"
echo ""

echo -e "${YELLOW}Option B: CLI Deployment${NC}"
echo "1. Install Netlify CLI:"
echo "   npm install -g netlify-cli"
echo ""
echo "2. Deploy MFE Transformation:"
echo "   netlify deploy --prod --dir apps/mfe-transformation/dist"
echo ""
echo "3. Deploy MFE Compliance:"
echo "   netlify deploy --prod --dir apps/mfe-compliance/dist"
echo ""

# Step 3: API Deployment Instructions
echo -e "${BLUE}Step 3: Deploying API Server${NC}"
echo ""
echo -e "${YELLOW}Recommended: Deploy to Render${NC}"
echo "1. Go to https://render.com"
echo "2. Sign in with GitHub"
echo "3. Click 'New +' → 'Web Service'"
echo "4. Connect this repository"
echo "5. Configure:"
echo "   - Name: mfe-auth-api"
echo "   - Environment: Node"
echo "   - Build Command: npm install && cd apps/api && npm install"
echo "   - Start Command: cd apps/api && npm start"
echo "   - Port: 3000"
echo "6. Add environment variables:"
echo "   - JWT_SECRET: (your secret key)"
echo "   - NODE_ENV: production"
echo ""

echo -e "${YELLOW}Alternative: Deploy to Railway or Heroku${NC}"
echo "Both platforms support Node.js with similar setup steps."
echo ""

# Step 4: Verification
echo -e "${BLUE}Step 4: After Deployment - Update Configuration${NC}"
echo ""
echo "Once you have the deployed URLs, update:"
echo ""
echo "1. MFE Configuration (if calling the API):"
echo "   Replace localhost:3000 with your API URL"
echo "   API URL Format: https://your-api-name.onrender.com"
echo ""
echo "2. Verify API Health:"
echo "   curl https://your-api-name.onrender.com/api/health"
echo ""
echo "3. Test Login Endpoint:"
echo "   curl -X POST https://your-api-name.onrender.com/api/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"demo@contoso.com\",\"password\":\"Pass@123\"}'"
echo ""

# Final summary
echo -e "${GREEN}==================================="
echo "Build complete! Ready for deployment."
echo "===================================${NC}"
echo ""
echo "Summary of build outputs:"
echo "  ✓ MFE Transformation: apps/mfe-transformation/dist"
echo "  ✓ MFE Compliance: apps/mfe-compliance/dist"
echo "  ✓ API Server: apps/api (ready for Render)"
echo ""
