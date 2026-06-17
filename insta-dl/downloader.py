#!/usr/bin/env python3
"""
Universal media downloader.
Supports: Instagram (instaloader), YouTube & TikTok (yt-dlp)
Usage: python3 downloader.py <url> <output_dir>
Outputs JSON to stdout.
"""

import sys
import json
import os
import re
import glob

def extract_instagram_shortcode(url):
    match = re.search(r'instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]+)', url)
    return match.group(1) if match else None

def detect_platform(url):
    if 'instagram.com' in url:
        return 'instagram'
    if 'tiktok.com' in url or 'vm.tiktok.com' in url:
        return 'tiktok'
    if 'youtube.com' in url or 'youtu.be' in url:
        return 'youtube'
    return None

def download_instagram(url, output_dir):
    import instaloader
    shortcode = extract_instagram_shortcode(url)
    if not shortcode:
        return {"error": "Could not parse Instagram post ID from URL."}

    L = instaloader.Instaloader(
        download_pictures=True,
        download_videos=True,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        post_metadata_txt_pattern="",
        filename_pattern="{shortcode}",
        dirname_pattern=output_dir,
        quiet=True,
    )

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
    except instaloader.exceptions.LoginRequiredException:
        return {"error": "This Instagram post requires login (private account)."}
    except Exception as e:
        return {"error": f"Could not fetch Instagram post: {str(e)}"}

    try:
        L.download_post(post, target=output_dir)
    except Exception as e:
        return {"error": f"Instagram download failed: {str(e)}"}

    media_items = collect_files(output_dir)
    if not media_items:
        return {"error": "No media files downloaded. Post may be private."}

    thumbnail = next((f"/media/{i['filename']}" for i in media_items if i['type'] == 'image'), None)

    return {
        "platform": "instagram",
        "shortcode": shortcode,
        "title": (post.caption[:100] if post.caption else "Instagram Post"),
        "authorName": post.owner_username,
        "thumbnail": thumbnail,
        "mediaItems": media_items,
    }

def download_ytdlp(url, output_dir, platform):
    import yt_dlp

    # For YouTube, prefer a single combined MP4 format up to 1080p to avoid needing ffmpeg
    if platform == 'youtube':
        format_spec = 'best[height<=1080][ext=mp4]/best'
    else:
        # TikTok: best single format
        format_spec = 'best[ext=mp4]/best'

    output_template = os.path.join(output_dir, '%(id)s.%(ext)s')

    ydl_opts = {
        'format': format_spec,
        'outtmpl': output_template,
        'quiet': True,
        'no_warnings': True,
        # Avoid FFmpeg merging/postprocessing so downloads work without system ffmpeg
        'writethumbnail': True,
    }

    info = {}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as e:
        msg = str(e)
        if 'Private video' in msg or 'This video is private' in msg:
            return {"error": "This video is private and cannot be downloaded."}
        if 'age' in msg.lower():
            return {"error": "Age-restricted video. Login required."}
        return {"error": f"Download failed: {msg[:200]}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)[:200]}"}

    media_items = collect_files(output_dir)
    if not media_items:
        return {"error": "No media files were downloaded."}

    video_items = [i for i in media_items if i['type'] == 'video']
    image_items = [i for i in media_items if i['type'] == 'image']

    # Thumbnail = first image (yt-dlp saves thumbnail as jpg)
    thumbnail = f"/media/{image_items[0]['filename']}" if image_items else None

    # Only return video items to user (thumbnail is internal)
    download_items = video_items if video_items else media_items

    return {
        "platform": platform,
        "title": info.get('title', f'{platform.title()} Video')[:100],
        "authorName": info.get('uploader') or info.get('channel') or info.get('creator') or '',
        "duration": info.get('duration'),
        "thumbnail": thumbnail,
        "mediaItems": download_items,
    }

def collect_files(directory):
    items = []
    for f in sorted(glob.glob(os.path.join(directory, '*'))):
        ext = os.path.splitext(f)[1].lower()
        filename = os.path.basename(f)
        if ext == '.mp4':
            items.append({"type": "video", "label": "Video (MP4)", "filename": filename, "path": f})
        elif ext in ('.jpg', '.jpeg', '.png', '.webp'):
            items.append({"type": "image", "label": "Photo", "filename": filename, "path": f})
    return items

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: downloader.py <url> <output_dir>"}))
        sys.exit(1)

    url = sys.argv[1]
    output_dir = sys.argv[2]
    os.makedirs(output_dir, exist_ok=True)

    platform = detect_platform(url)
    if not platform:
        print(json.dumps({"error": "Unsupported URL. Please use Instagram, TikTok, or YouTube links."}))
        sys.exit(1)

    if platform == 'instagram':
        result = download_instagram(url, output_dir)
    else:
        result = download_ytdlp(url, output_dir, platform)

    print(json.dumps(result))

if __name__ == "__main__":
    main()
