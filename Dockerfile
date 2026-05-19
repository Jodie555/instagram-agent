FROM node:20-alpine

WORKDIR /app

COPY tools/package.json tools/package-lock.json ./tools/
RUN cd tools && npm ci --omit=dev

COPY tools ./tools
COPY instagram ./instagram
COPY skills ./skills
COPY .github ./.github

RUN mkdir -p /app/instagram/posts /app/instagram/metrics \
 && chown -R node:node /app

USER node

ENTRYPOINT ["node", "tools/auto-pipeline.js"]
