# Use a Node base image, then layer Python on top
FROM node:20-bookworm

# Install Python, pip, and ffmpeg (needed by yt-dlp for merging video/audio)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install --production

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy rest of the app
COPY . .

# Render provides PORT env var
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
