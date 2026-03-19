# Build from reporting_agent dir (data via volume): docker build .
# For bundled data + LibreOffice, use repo root: docker build -f Dockerfile.reporting .

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY data ./data

# Data bundled in image; override with DATA_DIR + volume if needed
EXPOSE 3081

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3081) + '/health', r => { if(r.statusCode!==200) process.exit(1) })"

CMD ["node", "src/index.js"]
