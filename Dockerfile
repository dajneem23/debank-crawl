FROM node:16-alpine


# We don't need the standalone Chromium
WORKDIR /app


# Add package.json file
COPY package.json yarn.lock tsconfig.json ./
ARG ENV_VARS
ENV ENV_VARS=$ENV_VARS
RUN echo $ENV_VARS

ARG MODE
ENV MODE=$MODE
RUN echo $MODE

# Install packages without generate a yarn.lock lockfile
RUN yarn --pure-lockfile --production=true --non-interactive --frozen-lockfile --ignore-scripts --ignore-engines --ignore-platform --no-progress --optimize-autoloader --no-bin-links

#install tsc
RUN yarn global add typescript

# Copy all file from current dir to /app in container
COPY . /app


#build
RUN tsc --build


# Expose port
EXPOSE 9002


# Start service
CMD [  "yarn", "production" ]
