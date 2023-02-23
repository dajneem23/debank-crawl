FROM node:16-slim


# We don't need the standalone Chromium
WORKDIR /app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
# RUN apt-get update && apt-get install gnupg wget -y && \
#   wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
#   sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
#   apt-get update && \
#   apt-get install google-chrome-stable -y --no-install-recommends && \
#   rm -rf /var/lib/apt/lists/*

RUN apk update && apk add --no-cache nmap && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
  apk update && \
  apk add --no-cache \
  chromium \
  harfbuzz \
  "freetype>2.8" \
  ttf-freefont \
  nss
# Create app directory
# WORKDIR /usr/src/app

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
COPY . /app


# Expose port
EXPOSE 9002
CMD [ "node","node_modules/puppeteer/install.js" ]
# Start service
CMD [ "yarn", "start" ]
