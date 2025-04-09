const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { readFileSync } = require('fs');

// Create the Express app
const app = express();
const server = createServer(app);

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, '../dist')));

// Define API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// For all other routes, serve the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start the server when not running on Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless deployment
module.exports = app;