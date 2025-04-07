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

# Install nodemon globally
RUN npm install -g nodemon

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production and development dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Use nodemon as the start command
CMD ["npm", "start"]