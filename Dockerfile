# Build
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime: production dependencies only, no toolchain, no source.
FROM node:22-alpine
WORKDIR /app

# yt-dlp is what makes transcripts work: YouTube stopped serving caption text
# directly, and yt-dlp is the part that still gets it. python3 is its runtime.
RUN apk add --no-cache tini python3 py3-pip \
 && pip install --break-system-packages --no-cache-dir yt-dlp

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY README.md SKILL.md LICENSE ./

USER node

# tini reaps zombies and forwards signals, so `docker stop` returns promptly
# rather than waiting out the grace period.
ENTRYPOINT ["/sbin/tini", "--", "node", "dist/index.js"]
