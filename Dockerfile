# Build from reporting_agent dir: docker build .
# Includes LibreOffice for docx→PDF conversion.

FROM node:20-bookworm-slim

WORKDIR /app

# Install LibreOffice for docx→PDF conversion (headless, no GUI)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    fonts-liberation \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY data ./data

# Data bundled in image; override with DATA_DIR + volume if needed
EXPOSE 3081

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3081) + '/health', r => { if(r.statusCode!==200) process.exit(1) })"

CMD ["node", "src/index.js"]
