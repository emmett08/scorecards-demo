import express from 'express';

export function setupSseHeaders(res: express.Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Helps with nginx; harmless elsewhere.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}

export function sseSend(res: express.Response, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function ssePing(res: express.Response) {
  res.write(': ping\n\n');
}
