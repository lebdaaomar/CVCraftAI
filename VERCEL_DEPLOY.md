# Deploying to Vercel

## Steps for Successful Deployment

1. **Add these files to your GitHub repository**:
   - `vercel.json` - Configuration for Vercel deployment
   - `api/index.js` - Server endpoint for Vercel
   - `tsconfig.server.json` - TypeScript config for server files

2. **On Vercel Dashboard**:
   - Create a new project by importing your GitHub repository
   - For "Framework Preset", select "Other"
   - Under "Build and Output Settings":
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Add this environment variable:
     - `OPENAI_API_KEY`: Leave this blank (users will provide their own)
   - Click "Deploy"

## Troubleshooting

If your deployment shows server code instead of the application:
1. Check that all files are properly committed to GitHub
2. Make sure your `vercel.json` file is correctly formatted
3. Try a fresh deployment by clicking "Redeploy" in the Vercel dashboard

## Alternative Deployment Approach

If you continue to face issues, you may want to consider deploying the frontend and backend separately:

1. **Frontend**: Deploy to Vercel, Netlify, or GitHub Pages
2. **Backend**: Deploy to a service like Render, Railway, or Cyclic

This approach might require updating API endpoints in your frontend code to point to your deployed backend URL.