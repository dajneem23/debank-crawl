FROM node:16-slim


# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*
# Create app directory
WORKDIR /usr/src/app

# Add package.json file
COPY package.json yarn.lock ./
ARG ENV_VARS
ENV ENV_VARS=$ENV_VARS
RUN echo $ENV_VARS

ARG MODE
ENV MODE=$MODE
RUN echo $MODE

# Install packages without generate a yarn.lock lockfile
RUN yarn --pure-lockfile


# Copy all file from current dir to /app in container
COPY . .


# Expose port
EXPOSE 9002

# Start service
CMD [ "yarn", "start" ]
