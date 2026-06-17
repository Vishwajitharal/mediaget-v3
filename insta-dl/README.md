# InstaGet — Instagram Media Downloader

A clean web app to download photos and videos from public Instagram posts, reels, and IGTV.

## Stack
- **Backend:** Node.js + Express
- **Scraping:** Axios + Cheerio (og:meta tags)
- **Frontend:** Vanilla JS, no frameworks

## Setup

```bash
npm install
node server.js
```

Then open: http://localhost:3000

## How it works
1. User pastes an Instagram post URL
2. Server fetches the public page HTML
3. Extracts `og:video` / `og:image` meta tags
4. Returns media URLs to frontend
5. `/api/download` proxies the file to avoid CORS issues

## Limitations
- Only works with **public** Instagram accounts
- Instagram may rate-limit requests — add delays if needed
- For carousel posts (multiple images), only the first is returned via og:tags
  → For full carousel support, use a paid API like RapidAPI's Instagram scraper

## Deploy on Render (free)
1. Push to GitHub
2. Create new Web Service on Render
3. Build command: `npm install`
4. Start command: `node server.js`
5. Done — free hosting!

## Upgrade paths
- **Carousel support:** Use RapidAPI Instagram scraper
- **Private posts:** Require user login session cookie (complex, risky)
- **Rate limiting:** Add `express-rate-limit` package
- **Queue system:** Add Bull + Redis for heavy load
