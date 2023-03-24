FROM node:16-alpine


# We don't need the standalone Chromium
WORKDIR /app

ENV NODE_ENV=production

# Add package.json file
COPY package.json yarn.lock ./
ARG ENV_VARS
ENV ENV_VARS=$ENV_VARS
RUN echo $ENV_VARS

ARG MODE
ENV MODE=$MODE
RUN echo $MODE

# Install packages without generate a yarn.lock lockfile
RUN yarn --pure-lockfile --production


# Copy all file from current dir to /app in container
COPY . /app


# Expose port
EXPOSE 9002


# Start service
CMD [  "yarn", "start" ]
