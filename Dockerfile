# Note: the Claude Code CLI isn't available in this image, so LLM_BACKEND=claude-code
# won't work here. Set ANTHROPIC_API_KEY (or OPENAI_API_KEY) in .env and
# override LLM_BACKEND (see docker-compose.yml).
FROM node:22-alpine

WORKDIR /app

COPY tools/package.json tools/package-lock.json ./tools/
RUN cd tools && npm ci --omit=dev

COPY tools ./tools
COPY instagram ./instagram
COPY instagram-memory ./instagram-memory
COPY skills ./skills
COPY .github ./.github

RUN mkdir -p /app/instagram/posts /app/instagram/metrics \
 && chown -R node:node /app

USER node

ENTRYPOINT ["node", "tools/auto-pipeline.js"]
