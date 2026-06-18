# Instagram Reel Downloadr — DESIGN.md

Project: Instagram Reel Downloadr
Domain: getanyvid.com

Goal
- Build a fast, mobile-first downloader for Instagram Reels, TikTok videos and YouTube videos.
- Clean, minimal, confidence-inspiring UI inspired by Vercel (white/black, lots of whitespace, crisp typography), not copying any competitor UI.
- Prioritize speed, clarity, trust signals, and conversion (paste box + single clear CTA above the fold).

Design principles
- Minimal chrome, content-first layout, large hero with concise value prop.
- Clear input control with platform detection and small platform badges.
- One primary CTA: `Download` (visually prominent). Secondary CTA: `How it works` / `FAQ`.
- Trust and transparency: privacy blurb, automatic cleanup, links to privacy, terms, contact, DMCA.
- Performance-first: small bundle, use Tailwind v4 utility classes, lazy-load images, modern image formats (WebP/AVIF where supported).
- Accessibility: semantic HTML, ARIA where needed, logical tab order, color contrast, large touch targets.

Visual style (Vercel-like)
- Palette: neutral base (white / near-black), single accent gradient for buttons (e.g. violet → pink).
- Typographic scale: large hero (48–72px), medium subheads, monospace for input placeholder.
- Spacing: generous padding and whitespace, center-aligned hero content on desktop.
- Subtle motion: micro-interactions on CTA and result cards.

Core pages
- `/` — Homepage: hero, paste input, CTA, platform badges, example links, benefits, quick FAQ, trust (privacy/terms), footer.
- `/instagram-reel-downloader` — focused landing page with longer content (500–800 words), FAQ, how-to, schema (FAQ JSON-LD), screenshot/preview.
- `/tiktok-downloader` — same pattern for TikTok.
- `/youtube-downloader` — same pattern for YouTube.
- `/privacy-policy`, `/terms-of-service`, `/contact`, `/sitemap.xml`, `/robots.txt`.

Features (must-have)
- Paste URL → server fetch → present thumbnails and media items → direct download links.
- Support Instagram Reels, TikTok, YouTube (shorts & regular) reliably.
- Per-run temp storage + automatic cleanup (already implemented in server).
- Platform detection with fallback (client & server).
- Download queue + visible progress for long fetches.
- Preview thumbnail, author, title and file sizes.
- FAQ + structured data (FAQ schema) on landing pages.
- Sitemap + robots.txt + canonical links for SEO.

Nice-to-have (improvements over indown.io)
- Faster UX: optimistic UI, show thumbnail quickly when possible before full download.
- Better trust: visible privacy-first copy, retention times, and DMCA process.
- Clean visual hierarchy and uncluttered hero — less advertising/no popups for mobile users.
- Batch downloads: allow multiple URLs in a queue and zip output.
- Formats selection: MP4 quality selector (auto up to 1080p) and image format options (WebP/JPG).
- Watermark handling: detect if watermark present and attempt to fetch original when lawful.
- Native-like mobile experience: large CTA, clipboard detect, smart paste suggestions.
- Accessibility-first: keyboard-navigable, ARIA labels, screen-reader friendly.
- Analytics & conversion: track events (paste, download, success rate) for product improvement.

Technical stack
- Frontend: static site using Tailwind CSS v4 for utilities and rapid styling. Minimal JS (vanilla or small framework like Preact).
- Backend: Node.js + Express (current), downloader workers using `yt-dlp` and `instaloader` Python scripts.
- Storage: local temp filesystem with per-run folders (already implemented). For scale: object storage (S3) + CDN.
- Worker / queue: isolate downloads in short-lived worker processes; limit concurrency + rate limiting.
- Security: input validation, path resolution for downloads, CORS, rate limiting, CAPTCHA for abuse control.

SEO & Performance
- One H1 per page, unique title and meta description for landing pages (done).
- Sitemap, robots.txt, canonical tags, structured data (FAQ schema) for important pages.
- Serve minimal JS, inline critical CSS for hero, defer non-critical scripts, compress assets.

Suggested UX flows
1. Paste URL (detect platform), show badge and example text.
2. Press `Download` — show loading card with steps and approximate ETA.
3. Show preview card (thumbnail, title, author) and list of available media items with download buttons.
4. After download, show clear success toast and a persistent small note about file availability (e.g., removed in 1 hour).

Analytics & monitoring
- Use lightweight analytics (Plausible or self-hosted) or event tracking for product metrics.
- Error logging and downloader stdout capture (already writing last_downloader_stdout.txt on parse failure).

Improvements vs indown.io (detailed ideas)
- Remove intrusive ads and banners on pages — instead show polite sponsor links in footer.
- Better mobile-first layout and clipboard detection to auto-fill pasted links.
- Provide clear, readable legal pages and contact options — improve trust.
- Faster core path: reduce round-trips, show progressive preview, and avoid heavy client-side frameworks.
- Add downloadable quality selector and batch/zip downloads.
- Add browser extension and native PWAs for frequent users.

Next steps
1. Scaffold Tailwind v4 project and basic page templates (I can generate this next).
2. Produce HTML/CSS for the hero and input component matching the design system.
3. Implement server-side rate limiting and optional job queue for stability.

References
- Use `web-design-guidelines` skill to audit resulting UI files.
- Tailwind 4 docs for utility classes and recommended patterns.
