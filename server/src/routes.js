import express from 'express';
import axios from 'axios';
import { resolveAndValidate } from './utils/network.js';
import { analyzeNovel, fetchChaptersBatch } from './services/crawler.js';
import { getIO } from './socket.js';

export const router = express.Router();

// Step 1: Analyze the main URL (TOC)
router.post('/novel-info', async (req, res) => {
  const { url, jobId } = req.body;
  try {
    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!jobId) return res.status(400).json({ error: 'jobId is required for session tracking' });
    
    // Basic URL validation
    try { new URL(url); } catch(e) { return res.status(400).json({ error: 'Invalid URL' }); }

    // Analyze in background
    // We do NOT await this fully, but we catch immediate start-up errors
    analyzeNovel(url, jobId).catch(err => {
       console.error('Background analysis failed:', err);
       // Emit error to the specific job room so UI updates
       getIO().to(jobId).emit('error', { message: err.message || 'Analysis crashed' });
    });

    res.json({ 
      status: 'queued',
      message: 'Analysis started. Please wait for socket events.' 
    });
  } catch (error) {
    console.error('Error in /novel-info:', error);
    // If possible, emit to room, otherwise just HTTP error
    if (jobId) getIO().to(jobId).emit('error', { message: error.message });
    res.status(500).json({ error: 'Failed to start analysis', details: error.message });
  }
});

// Step 2: Fetch content for a batch of chapters
router.post('/chapters-batch', async (req, res) => {
  try {
    const { chapters, jobId, userAgent } = req.body;
    if (!chapters || !Array.isArray(chapters)) {
      return res.status(400).json({ error: 'chapters array is required' });
    }

    const results = await fetchChaptersBatch(chapters, jobId, userAgent);
    res.json({ results });
  } catch (error) {
    console.error('Error in /chapters-batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch', details: error.message });
  }
});

// Helper: Proxy images safely (Preventing SSRF via DNS Rebinding & Redirects)
router.get('/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL required');
  
  let currentUrl = url;
  let redirectCount = 0;
  const MAX_REDIRECTS = 5;
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit to prevent DoS

  try {
    while (redirectCount <= MAX_REDIRECTS) {
      const urlObj = new URL(currentUrl);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return res.status(400).send('Invalid protocol');
      }

      // 1. Resolve and Validate IP immediately (Prevents TOCTOU later by pinning IP)
      const { address, family } = await resolveAndValidate(urlObj.hostname);

      // 2. Define custom lookup to force Axios to use the VALIDATED IP
      // This prevents DNS Rebinding because even if Axios calls lookup again internally,
      // we intercept it and return the safe IP we just checked.
      const customLookup = (hostname, options, cb) => {
        cb(null, address, family);
      };

      // 3. Perform Request with Redirects DISABLED (Manual handling)
      try {
        const response = await axios.get(currentUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
          maxRedirects: 0,
          lookup: customLookup, // Force usage of safe IP
          maxContentLength: MAX_SIZE,
          maxBodyLength: MAX_SIZE,
          validateStatus: status => (status >= 200 && status < 300) || (status >= 300 && status < 400)
        });

        // Handle Redirects Manually
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers['location'];
          if (!location) throw new Error('Redirect without location header');
          
          // Resolve relative redirects
          currentUrl = new URL(location, currentUrl).href;
          redirectCount++;
          continue;
        }

        // Success
        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.set('Content-Type', contentType);
        return res.send(response.data);

      } catch (err) {
        // If axios throws specifically on a redirect (which maxRedirects=0 might do depending on config)
        // We catch it, but our manual loop handles 3xx via validateStatus usually.
        // If it's a network error or DNS error, we throw.
        throw err;
      }
    } sõ
    
    throw new Error('Too many redirects');

  } catch (error) {
    // Differentiate between size limit errors and others
    if (error.code === 'ERR_BAD_RESPONSE' || error.message.includes('maxContentLength')) {
        console.warn(`Proxy blocked large image for ${url}`);
        return res.status(413).send('Image too large');
    }
    console.warn(`Proxy blocked/failed for ${url}:`, error.message);
    res.status(500).send('Failed to fetch image');
  }
});