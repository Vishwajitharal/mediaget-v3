const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();

// Redirect Render's default URL (and any non-canonical host) to your custom domain
// Set CANONICAL_DOMAIN as an env var in Render once your custom domain is live
const CANONICAL_DOMAIN = process.env.CANONICAL_DOMAIN; // e.g. "mediaget.com"

if (CANONICAL_DOMAIN) {
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    if (host !== CANONICAL_DOMAIN && host.endsWith(".onrender.com")) {
      return res.redirect(301, `https://${CANONICAL_DOMAIN}${req.originalUrl}`);
    }
    next();
  });
}

app.use(cors());
app.use(express.json());

// Set correct MIME type for XML files
app.use((req, res, next) => {
  if (req.path.endsWith('.xml')) {
    res.type('application/xml');
  }
  next();
});

app.use(express.static(path.join(__dirname, "public")));

const MEDIA_DIR = path.join(__dirname, "downloads");
fs.mkdirSync(MEDIA_DIR, { recursive: true });

app.use("/media", express.static(MEDIA_DIR));

function detectPlatform(url) {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("tiktok.com") || url.includes("vm.tiktok.com")) return "tiktok";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return null;
}

function runDownloader(url, outputDir) {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [
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
        resolve(JSON.parse(stdout.trim()));
      } catch {
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
    fs.readdirSync(MEDIA_DIR).forEach((file) => {
      const p = path.join(MEDIA_DIR, file);
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
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
    const result = await runDownloader(url, MEDIA_DIR);
    if (result.error) return res.status(400).json({ error: result.error });

    const mediaItems = result.mediaItems.map((item) => ({
      type: item.type,
      label: item.label,
      url: `/media/${item.filename}`,
      filename: item.filename,
    }));

    return res.json({ ...result, mediaItems });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/download", (req, res) => {
  const { filename } = req.query;
  if (!filename || filename.includes("..")) return res.status(400).send("Invalid");
  const filePath = path.join(MEDIA_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");
  res.download(filePath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ MediaGet running at http://localhost:${PORT}`);
  console.log(`📁 Downloads: ${MEDIA_DIR}`);
});