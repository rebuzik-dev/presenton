FROM python:3.11-slim-bookworm

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    nginx \
    curl \
    libreoffice \
    fontconfig \
    chromium \
    zstd \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# Install Node.js 20 using NodeSource repository
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs


# Create a working directory
WORKDIR /app  

# Set environment variables
ENV APP_DATA_DIRECTORY=/app_data
ENV TEMP_DIRECTORY=/tmp/presenton
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium


# Install ollama
#RUN curl -fsSL https://ollama.com/install.sh | sh

ARG PYPI_INDEX_URL=https://pypi.org/simple

# Install dependencies for FastAPI
RUN pip install --index-url "${PYPI_INDEX_URL}" --default-timeout=120 --retries 10 aiohttp aiomysql aiosqlite asyncpg fastapi[standard] \
    pathvalidate pdfplumber chromadb sqlmodel \
    anthropic google-genai openai llmai==0.2.5 fastmcp dirtyjson

RUN pip install --index-url "${PYPI_INDEX_URL}" --default-timeout=120 --retries 10 docling --extra-index-url https://download.pytorch.org/whl/cpu

RUN pip install --index-url "${PYPI_INDEX_URL}" --default-timeout=120 --retries 10 \
    alembic fastembed-vectorstore fonttools greenlet jsonschema \
    mem0ai[nlp] nltk psycopg[binary] psycopg2-binary PyJWT python-pptx redis

# Install dependencies for Next.js
WORKDIR /app/servers/nextjs
COPY servers/nextjs/package.json servers/nextjs/package-lock.json ./
RUN npm install


# Copy Next.js app
COPY servers/nextjs/ /app/servers/nextjs/

# Build the Next.js app
WORKDIR /app/servers/nextjs
RUN npm run build

WORKDIR /app

# Copy FastAPI
COPY servers/fastapi/ ./servers/fastapi/
COPY start.js LICENSE NOTICE ./

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose the port
EXPOSE 80

# Start the servers
CMD ["node", "/app/start.js"]
