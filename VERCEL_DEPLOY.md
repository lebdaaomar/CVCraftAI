# Deploying Your CV Generator to Vercel

This guide explains how to deploy your CV Generator to Vercel using the updated configuration.

## Prerequisites

1. A GitHub repository with your CV Generator code
2. A free account on [Vercel](https://vercel.com)

## Step-by-Step Deployment Guide

### 1. Push Your Code to GitHub

Make sure all the following files are properly committed to your GitHub repository:
- `vercel.json` (contains the updated configuration)
- `api/server.js` (with Vercel-specific adaptations)
- Your entire frontend and backend code

### 2. Sign Up or Log In to Vercel

- Go to [vercel.com](https://vercel.com)
- Sign up using GitHub or log in if you already have an account

### 3. Create a New Project on Vercel

- Click "Add New..." → "Project" in the Vercel dashboard
- Select your GitHub repository from the list
- If you don't see your repository, you may need to configure GitHub access in your Vercel account settings

### 4. Configure the Project

- For "Framework Preset", select "Other" (not "Vite" or "Next.js")
- The build settings should be automatically detected from your `vercel.json` file
- Don't add any environment variables (users will provide their OpenAI API key at runtime)
- Click "Deploy"

### 5. Wait for Deployment to Complete

- Vercel will build and deploy your application
- This process typically takes 1-2 minutes

### 6. Test Your Deployed Application

- Once deployment is complete, click on the generated domain (something like `your-app.vercel.app`)
- Enter your OpenAI API key
- Verify that you can generate a CV and download the PDF

## How This Deployment Works

The updated configuration makes several adjustments for Vercel:

1. **Modified `vercel.json`**:
   - Specifies the build command and output directory
   - Configures route handling for both API calls and frontend pages
   - Allocates adequate memory and execution time for PDF generation

2. **PDF Generation Adaptation**:
   - For Vercel: PDFs are generated in the `/tmp` directory and sent directly in the response
   - For local development: PDFs are saved to disk and served via URL

3. **Frontend Handling**:
   - Detects response type (JSON or PDF) and processes appropriately
   - Uses Blob URLs for direct PDF downloads in Vercel environment

## Troubleshooting

If you encounter issues with your Vercel deployment:

1. **Build Errors**:
   - Check the build logs in Vercel dashboard
   - Verify your `vercel.json` is correctly formatted

2. **PDF Generation Issues**:
   - If PDFs aren't generating, check if your OpenAI API key has sufficient quota
   - Verify in network tab that PDF requests are being processed correctly

3. **Other Issues**:
   - Try clearing Vercel's build cache and redeploying
   - Make sure your `/api` routes are correctly formatted

## Need Further Assistance?

If you continue experiencing issues, consider:
- Checking your browser console for error messages
- Looking at the Function Logs in Vercel dashboard
- Trying a clean deployment by creating a new project