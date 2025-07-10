FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for main app
COPY package*.json ./

# Install main app dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Install scripts dependencies if scripts directory exists
RUN if [ -d "scripts" ]; then \
      cd scripts && \
      npm install && \
      cd ..; \
    fi

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
