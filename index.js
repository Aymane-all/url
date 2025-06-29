require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// Body parsing middleware - MUST be before routes
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// In-memory storage for URLs
let urlDatabase = [];
let urlCounter = 1;

// Helper function to validate URL format
function isValidUrl(string) {
  try {
    // Check if it starts with http:// or https://
    if (!string.startsWith('http://') && !string.startsWith('https://')) {
      return false;
    }
    
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

// POST endpoint to create short URL
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;
  
  console.log('Received URL:', originalUrl); // Debug log
  
  // Check if URL is provided
  if (!originalUrl) {
    return res.json({ error: 'invalid url' });
  }
  
  // Validate URL format
  if (!isValidUrl(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }
  
  // Extract hostname for DNS lookup
  let hostname;
  try {
    const urlObj = new URL(originalUrl);
    hostname = urlObj.hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }
  
  // Use dns.lookup to verify the hostname exists
  dns.lookup(hostname, (err, address) => {
    if (err) {
      console.log('DNS lookup failed for:', hostname, err.message); // Debug log
      return res.json({ error: 'invalid url' });
    }
    
    console.log('DNS lookup successful for:', hostname, 'Address:', address); // Debug log
    
    // Check if URL already exists in database
    const existingEntry = urlDatabase.find(entry => entry.original_url === originalUrl);
    if (existingEntry) {
      return res.json({
        original_url: existingEntry.original_url,
        short_url: existingEntry.short_url
      });
    }
    
    // Store the URL with a short identifier
    const newEntry = {
      original_url: originalUrl,
      short_url: urlCounter++
    };
    urlDatabase.push(newEntry);
    
    console.log('URL stored:', newEntry); // Debug log
    
    res.json({
      original_url: originalUrl,
      short_url: newEntry.short_url
    });
  });
});

// GET endpoint to redirect to original URL
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrlId = parseInt(req.params.short_url);
  
  console.log('Looking for short URL:', shortUrlId); // Debug log
  console.log('Current database:', urlDatabase); // Debug log
  
  // Find the URL entry
  const urlEntry = urlDatabase.find(entry => entry.short_url === shortUrlId);
  
  if (urlEntry) {
    console.log('Redirecting to:', urlEntry.original_url); // Debug log
    res.redirect(urlEntry.original_url);
  } else {
    console.log('Short URL not found:', shortUrlId); // Debug log
    res.json({ error: 'No short URL found for the given input' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});