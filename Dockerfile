ARG NODE_IMAGE=node:18-alpine

FROM $NODE_IMAGE AS base

ENV CHROME_BIN="/usr/bin/chromium-browser" 

RUN apk --no-cache add dumb-init chromium
RUN mkdir -p /home/node/app && chown node:node /home/node/app
WORKDIR /home/node/app
USER node
RUN mkdir tmp

FROM base AS dependencies
COPY --chown=node:node ./package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
RUN npm ci
COPY --chown=node:node . .

FROM dependencies AS build
RUN node ace build --production

FROM base AS production
ENV NODE_ENV=production
ENV PORT=$PORT
ENV HOST=0.0.0.0
COPY --chown=node:node ./package*.json ./
RUN npm ci --production
COPY --chown=node:node --from=build /home/node/app/build .
COPY --chown=node:node --from=build /home/node/app/public ./public
EXPOSE $PORT
CMD [ "dumb-init", "node", "server.js" ]