# CV Generator

A professional CV generator that uses OpenAI's Assistant API to create personalized CVs through an interactive chat interface.

## Features

- Interactive chat interface that guides users through creating their CV
- Adapts to different professions with tailored questions
- Generates a professionally formatted PDF CV
- Users provide their own OpenAI API key

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser to `http://localhost:3000`

## Deployment Options

### Deployment on Vercel (Recommended)

This application is configured for easy deployment on Vercel.

1. Make sure you have a Vercel account and are logged in
2. Fork this repository to your GitHub account
3. Go to your Vercel dashboard and click **Add New Project**
4. Import your GitHub repository
5. Vercel will automatically detect the settings from `vercel.json`
6. Click **Deploy**

For detailed instructions and configuration information, see [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md).

### Deployment on Render

This application can also be deployed on Render.com.

#### One-Click Deployment

1. Make sure you have a Render account and are logged in
2. Fork this repository to your GitHub account
3. Go to your Render dashboard and click **New Web Service**
4. Connect to your GitHub repository
5. Render will automatically detect the settings from `render.yaml`
6. Click **Create Web Service**

#### Manual Setup

If you prefer to configure manually:

1. Create a new Web Service on Render
2. Connect to your GitHub repository
3. Use the following settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node api/server.js`
4. Click **Create Web Service**

For detailed Render deployment instructions, see [RENDER_DEPLOY.md](RENDER_DEPLOY.md).

## Using the Application

1. Once deployed, open the application in your browser
2. Enter your OpenAI API key when prompted
3. Follow the chat assistant's guidance to create your CV
4. Download your finalized CV as a PDF

## Note on API Keys

This application requires each user to provide their own OpenAI API key. The key is only used for your session and is not stored permanently.