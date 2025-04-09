# Deploying to Vercel

## Simplified Deployment Approach

1. **Make sure these files are in your GitHub repository**:
   - `vercel.json` - Simplified configuration that routes all requests to server.js
   - `api/server.js` - Standalone server file that handles both API and serving the frontend

2. **On Vercel Dashboard**:
   - Create a new project by importing your GitHub repository
   - For "Framework Preset", select "Other"
   - Use the default settings (Vercel will detect them from vercel.json)
   - Don't add any environment variables (users will provide their OpenAI API key at runtime)
   - Click "Deploy"

## How This Works

This deployment approach uses a simplified architecture:

1. The `vercel.json` file directs all requests to `/api/server.js`
2. `server.js` contains all the backend code in a single file:
   - In-memory storage for sessions and messages
   - API endpoints for chat and PDF generation
   - OpenAI Assistant integration 
   - PDF generation
   - Static file serving for the frontend

This approach eliminates TypeScript compilation issues on Vercel and keeps everything in a single serverless function.

## Troubleshooting

If you're still having issues with deployment:
1. Verify all files are committed properly to your GitHub repository
2. Check that the build is completing successfully in the Vercel logs
3. Try clearing the Vercel build cache and redeploying

## Alternative Deployment Options

The CV Generator can also be deployed on these platforms:

1. **Render**: Free tier works well for this application
   - Create a Web Service from your GitHub repository
   - Build Command: `npm install && npm run build`
   - Start Command: `node api/server.js`

2. **Railway**: Gives you more resources on the free tier
   - Import your GitHub repository
   - Use the same build and start commands as Render

3. **Replit**: If you have a paid Replit account, you can deploy directly
   - Use the "Deploy" button in your Replit project