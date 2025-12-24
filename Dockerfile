# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application and data
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

# Set environment variables
ENV NODE_ENV=production
ENV OLLAMA_BASE_URL=http://ollama:11434
ENV OLLAMA_TEXT_MODEL=llama3.2

# Run the CLI
CMD ["node", "dist/cli.js"]
