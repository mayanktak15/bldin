# Use official Playwright Ubuntu image which includes Node.js and Chromium dependencies
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (playwright itself is included but needs package registration)
RUN npm install

# Copy source code
COPY . .

# Compile TypeScript
RUN npm run build

# Expose server port
EXPOSE 5000

# Define execution environment variables
ENV PORT=5000
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Run the built server
CMD ["npm", "start"]
