# Stage 1: Build stage
FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS builder

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy the backend source files
COPY . .

# Compile TypeScript to JavaScript (dist/ folder)
RUN npm run build

# Stage 2: Production runner stage
FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS runner

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install only production dependencies (reduces final image size)
RUN npm ci --omit=dev

# Copy compiled JavaScript files from the builder stage
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 5000

# Define runtime environment variables
ENV PORT=5000
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Start the production server
CMD ["npm", "start"]
