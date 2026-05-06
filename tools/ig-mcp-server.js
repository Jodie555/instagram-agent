#!/usr/bin/env node
/**
 * Minimal Instagram MCP server (stub).
 *
 * Exposes two tools to VS Code chat modes:
 *   - create_post(caption, image_url)        -> { post_id }
 *   - get_post_metrics(post_id)              -> { likes, comments, reach, saves }
 *
 * The implementations are STUBS that read/write local JSON files so you can
 * test the full agent loop without real Instagram credentials. Replace the
 * marked sections with calls to the Instagram Graph API when ready.
 *
 * Real API docs:
 *   https://developers.facebook.com/docs/instagram-api/
 *
 * Run manually:  node ig-mcp-server.js
 * VS Code launches it automatically via .vscode/mcp.json.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.IG_DATA_DIR
  || path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', 'instagram');
const METRICS_DIR = path.join(ROOT, 'metrics');

const server = new Server(
  { name: 'instagram', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_post',
      description: 'Publish an Instagram post. Returns the new post id.',
      inputSchema: {
        type: 'object',
        properties: {
          caption: { type: 'string' },
          image_url: { type: 'string', description: 'Public URL of the image' },
        },
        required: ['caption', 'image_url'],
      },
    },
    {
      name: 'get_post_metrics',
      description: 'Fetch engagement metrics for a post id.',
      inputSchema: {
        type: 'object',
        properties: { post_id: { type: 'string' } },
        required: ['post_id'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === 'create_post') {
    // === REPLACE WITH REAL INSTAGRAM GRAPH API CALL ===
    // 1. POST /{ig-user-id}/media           (creates container)
    // 2. POST /{ig-user-id}/media_publish   (publishes container)
    const post_id = `stub_${Date.now()}`;
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            post_id,
            note: 'STUB: no real post was published. Replace stub in ig-mcp-server.js.',
            caption_preview: String(args.caption).slice(0, 80),
          }),
        },
      ],
    };
  }

  if (name === 'get_post_metrics') {
    // === REPLACE WITH REAL INSTAGRAM GRAPH API CALL ===
    // GET /{media-id}/insights?metric=likes,comments,reach,saved
    const file = path.join(METRICS_DIR, `${args.post_id}.json`);
    try {
      const data = await fs.readFile(file, 'utf8');
      return { content: [{ type: 'text', text: data }] };
    } catch {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              post_id: args.post_id,
              likes: 0,
              comments: 0,
              reach: 0,
              saves: 0,
              note: `STUB: no metrics file found at ${file}. Drop a JSON there to simulate.`,
            }),
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
