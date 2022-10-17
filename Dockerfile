FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Add package.json file
COPY package.json yarn.lock ./
ARG ENV_VARS
ENV ENV_VARS=$ENV_VARS
RUN echo $ENV_VARS >env.local.json
RUN cat ./env.local.json
# Install packages without generate a yarn.lock lockfile
RUN yarn --pure-lockfile


# Copy all file from current dir to /app in container
COPY . .


# Expose port
EXPOSE 9001

# Start service
CMD [ "yarn", "start" ]
