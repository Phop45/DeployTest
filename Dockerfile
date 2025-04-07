# Use a base image that has the necessary build tools
FROM node:18-slim

# Install necessary libraries for canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libpango1.0-dev \
    libcairo2-dev \
    pkg-config \
    libjpeg-dev \
    libgif-dev \
    libpng-dev \
    libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to install dependencies
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy the rest of the application code
COPY . .

# Expose the port your app is running on
EXPOSE 3000

# Run your app
CMD ["npm", "start"]