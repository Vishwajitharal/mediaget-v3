const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());
// Google Analytics snippet to inject into HTML pages when served
const GA_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-WDPZZMJEYR"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-WDPZZMJEYR');
</script>`;

// Middleware: serve HTML files with GA snippet injected before </head>
app.use((req, res, next) => {
  // only handle requests that likely return HTML
  if (req.method !== 'GET') return next();
  const acceptsHtml = req.headers.accept && req.headers.accept.indexOf('text/html') !== -1;
  if (!(req.path === '/' || req.path.endsWith('.html') || acceptsHtml)) return next();

  let relPath = req.path === '/' ? 'index.html' : req.path.replace(/^\//, '');
  const filePath = path.join(__dirname, 'public', relPath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return next();
    // if GA already present, send as-is
    if (data.includes('G-WDPZZMJEYR')) return res.type('html').send(data);
    const out = data.replace(/<\/head>/i, GA_SNIPPET + '\n</head>');
    return res.type('html').send(out);
  });
});

// Serve static assets from public
app.use(express.static(path.join(__dirname, "public")));

const MEDIA_DIR = path.join(__dirname, "downloads");
fs.mkdirSync(MEDIA_DIR, { recursive: true });

// Choose python executable per platform (Windows typically uses `python`)
const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";

app.use("/media", express.static(MEDIA_DIR));

function detectPlatform(url) {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("tiktok.com") || url.includes("vm.tiktok.com")) return "tiktok";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return null;
}

function runDownloader(url, outputDir) {
  return new Promise((resolve, reject) => {
    // Clear previous files in outputDir to avoid stale results being returned
    try {
      fs.readdirSync(outputDir).forEach((f) => {
        const p = path.join(outputDir, f);
        try { fs.unlinkSync(p); } catch (e) {}
      });
    } catch (e) {}

    const py = spawn(PYTHON_CMD, [
      path.join(__dirname, "downloader.py"),
      url,
      outputDir,
    ]);

    let stdout = "";
    let stderr = "";
    py.stdout.on("data", (d) => (stdout += d.toString()));
    py.stderr.on("data", (d) => (stderr += d.toString()));

    py.on("close", () => {
      try {
        // Try parsing entire stdout first
        try { return resolve(JSON.parse(stdout.trim())); } catch (_) {}

        // Fallback: locate the last JSON object in stdout (strip progress logs)
        const out = stdout.trim();
        const firstBrace = out.indexOf('{');
        const lastBrace = out.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const candidate = out.slice(firstBrace, lastBrace + 1);
          try { return resolve(JSON.parse(candidate)); } catch (_) {}
        }

        console.error('Downloader stdout:', stdout);
        console.error('Downloader stderr:', stderr);
        console.error('Downloader parse error: could not locate JSON in stdout');
        try { fs.writeFileSync(path.join(__dirname, 'last_downloader_stdout.txt'), stdout); } catch (e) {}
        reject(new Error(stderr.slice(0, 300) || "Downloader script failed"));
      } catch (err) {
        console.error('Downloader stdout:', stdout);
        console.error('Downloader stderr:', stderr);
        console.error('Downloader parse error:', err && err.message);
        reject(new Error(stderr.slice(0, 300) || "Downloader script failed"));
      }
    });

    py.on("error", reject);

    setTimeout(() => {
      py.kill();
      reject(new Error("Download timed out (60s). Try again."));
    }, 60000);
  });
}

// Auto-clean downloads older than 1 hour
function cleanOldFiles() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  try {
    fs.readdirSync(MEDIA_DIR).forEach((entry) => {
      const p = path.join(MEDIA_DIR, entry);
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          if (stat.mtimeMs < cutoff) {
            fs.rmSync(p, { recursive: true, force: true });
          }
        } else {
          if (stat.mtimeMs < cutoff) fs.unlinkSync(p);
        }
      } catch (e) {}
    });
  } catch {}
}
setInterval(cleanOldFiles, 30 * 60 * 1000);

app.post("/api/fetch", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Please provide a URL." });

  const platform = detectPlatform(url);
  if (!platform) {
    return res.status(400).json({
      error: "Unsupported URL. Please use an Instagram, TikTok, or YouTube link.",
    });
  }

  try {
    // create unique run dir to avoid collisions with previous runs
    const runId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
    const runDir = path.join(MEDIA_DIR, runId);
    fs.mkdirSync(runDir, { recursive: true });

    const result = await runDownloader(url, runDir);
    if (result.error) return res.status(400).json({ error: result.error });

    const mediaItems = result.mediaItems.map((item) => ({
      type: item.type,
      label: item.label,
      url: `/media/${runId}/${item.filename}`,
      filename: `${runId}/${item.filename}`,
    }));

    return res.json({ ...result, mediaItems, runId });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/download", (req, res) => {
  const { filename } = req.query;
  if (!filename) return res.status(400).send("Invalid");
  if (filename.includes("..")) return res.status(400).send("Invalid");
  // resolve path and ensure it's inside MEDIA_DIR
  const resolved = path.resolve(MEDIA_DIR, filename);
  const mediaRoot = path.resolve(MEDIA_DIR);
  if (!resolved.startsWith(mediaRoot)) return res.status(400).send("Invalid");
  if (!fs.existsSync(resolved)) return res.status(404).send("File not found");
  res.download(resolved);
});

// Custom 404 page
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

// Custom 500 page
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, "public", "500.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ MediaGet running at http://localhost:${PORT}`);
  console.log(`📁 Downloads: ${MEDIA_DIR}`);
});
