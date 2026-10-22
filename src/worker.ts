/**
 * Universal Cloudflare Worker Entry Point
 * Powers Cloudflare Workers with Static Assets ([assets] directory = "./dist")
 * Routes all /api/* calls to universal API router and serves static assets.
 */

import { onRequest, CloudflareEnv } from '../functions/api/[[route]].js';

export interface WorkerEnv extends CloudflareEnv {
  ASSETS?: {
    fetch: (request: Request | string) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Route API requests to the universal API handler
    if (url.pathname.startsWith('/api')) {
      return onRequest({
        request,
        env,
        next: async () => new Response('Not Found', { status: 404 }),
        data: {},
        params: {},
      } as any);
    }

    // Serve static files from [assets] (dist/)
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Fox Coin Worker Active', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
