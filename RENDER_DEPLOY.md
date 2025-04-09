# Deploying to Render

Render is a unified cloud platform that makes it easy to deploy web applications without the hassle of managing infrastructure.

## Why Render?

- **Free Tier**: Generous free tier with enough resources for this application
- **Easy Setup**: Simple deployment from GitHub
- **Auto-Deploy**: Updates automatically when you push to your repository
- **No Configuration Needed**: Works out of the box with Node.js applications

## Step-by-Step Deployment Guide

### 1. Prepare Your Repository

Make sure your GitHub repository includes these files:
- `render.yaml` - Configuration file for Render
- `api/server.js` - Server file with all backend functionality
- `api/package.json` - Dependencies for the server

### 2. Sign Up for Render

If you don't already have an account:
1. Go to [render.com](https://render.com/)
2. Sign up for a free account (you can use GitHub to sign up)

### 3. Deploy Your Web Service

#### Option 1: Blueprint Deployment (Easiest)
1. Go to your Render dashboard
2. Click on "Blueprint" in the sidebar
3. Click "New Blueprint Instance"
4. Select your GitHub repository
5. Render will detect the `render.yaml` file and set up your service
6. Click "Apply" to create the service

#### Option 2: Manual Deployment
1. Go to your Render dashboard
2. Click "New" and select "Web Service"
3. Connect to your GitHub repository
4. Configure the service:
   - **Name**: Choose a name for your application
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node api/server.js`
5. Click "Create Web Service"

### 4. Verify Deployment

1. Render will provide a URL when deployment is complete (usually something like `https://your-app-name.onrender.com`)
2. Open the URL in your browser
3. You should see the CV Generator application
4. Test the application by entering your OpenAI API key and following the chat flow

## Troubleshooting

If you encounter issues:

1. **Check Render Logs**:
   - Go to your web service on the Render dashboard
   - Click on "Logs" to see what's happening

2. **Build Errors**:
   - Ensure all dependencies are correctly listed in package.json
   - Make sure the build command is working correctly

3. **Runtime Errors**:
   - Check that file paths are correct (especially for imports)
   - Verify that the start command is pointing to the right file

4. **White Screen or 404**:
   - Make sure static files are being served correctly
   - Check that the server correctly serves the index.html file for all routes

## Updating Your Deployment

When you push changes to your GitHub repository, Render will automatically rebuild and redeploy your application (if you enabled auto-deploy).