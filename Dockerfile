# Backend Dockerfile - Node.js + Python for Nash solver
FROM node:18-slim

# Install Python and pip for the Nash Bargaining solver
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment and install Python dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir cvxpy numpy

# Set working directory
WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm ci --production

# Copy server code
COPY server ./server

# Expose port (Azure Container Apps will set PORT env var)
EXPOSE 3000

# Start the server
CMD ["node", "server/index.js"]
