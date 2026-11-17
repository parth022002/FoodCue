import { AppError } from "../errors/appErrors";

export interface StandardApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
}

export type UniversalServerRequest = Request | {
  method?: string;
  headers?: Record<string, string | string[] | undefined> | Headers;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (event: string, listener: (chunk: unknown) => void) => void;
  _readableState?: { ended?: boolean };
  text?: () => Promise<string>;
};

export type UniversalServerResponse = {
  status: (code: number) => {
    json: (body: unknown) => unknown;
    send?: (body: unknown) => unknown;
  };
  setHeader: (name: string, value: string) => void;
} | undefined | null;

/**
 * Creates a standard Web API Response object with application/json headers
 */
export function jsonResponse<T = unknown>(
  body: T,
  statusCode = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      ...headers
    }
  });
}

/**
 * Universal response dispatcher that gracefully outputs to either:
 * 1. Node.js / @vercel/node ServerResponse (res.status().json())
 * 2. Web Standard Response (new Response())
 */
export function sendResponse<T = unknown>(
  res: UniversalServerResponse,
  body: T,
  statusCode = 200,
  headers: Record<string, string> = {}
): Response {
  if (res && typeof res.status === "function") {
    try {
      for (const [key, val] of Object.entries(headers)) {
        res.setHeader(key, val);
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.status(statusCode).json(body);
    } catch {
      // If response stream was already closed
    }
    return new Response(JSON.stringify(body), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        ...headers
      }
    });
  }

  return jsonResponse(body, statusCode, headers);
}

/**
 * Formats an unknown error or AppError into a safe JSON API error response
 */
export function errorResponse(error: unknown, res?: UniversalServerResponse): Response {
  if (error instanceof AppError) {
    return sendResponse(
      res,
      {
        error: error.message,
        code: error.errorCode
      },
      error.statusCode
    );
  }

  const err = error as { message?: unknown; errorCode?: unknown; statusCode?: unknown } | null | undefined;
  if (
    err &&
    typeof err.message === "string" &&
    typeof err.statusCode === "number" &&
    err.statusCode >= 400 &&
    err.statusCode < 600
  ) {
    return sendResponse(
      res,
      {
        error: err.message,
        code: typeof err.errorCode === "string" ? err.errorCode : "SERVER_ERROR"
      },
      err.statusCode
    );
  }

  // Generic fallback without exposing internal stack traces
  return sendResponse(
    res,
    {
      error: "An unexpected server error occurred.",
      code: "INTERNAL_SERVER_ERROR"
    },
    500
  );
}

/**
 * Universal request parser that extracts headers and exact raw body across:
 * 1. Web Fetch API Request
 * 2. Node.js IncomingMessage / @vercel/node stream (with bodyParser: false)
 * 3. Pre-parsed Buffer or string bodies
 */
export async function parseRequest(
  req: UniversalServerRequest
): Promise<{
  headers: Headers | Record<string, string | string[] | undefined>;
  method: string;
  getHeader: (name: string) => string | null;
  json: <T>() => Promise<T | null>;
  text: () => Promise<string>;
}> {
  // 1. Web Fetch API standard Request
  if (typeof req?.headers === "object" && typeof (req.headers as Headers).get === "function" && typeof req?.text === "function") {
    const webReq = req as Request;
    let cachedText: string | null = null;
    const getText = async () => {
      if (cachedText === null) {
        cachedText = await webReq.text();
      }
      return cachedText;
    };

    return {
      headers: webReq.headers,
      method: webReq.method || "GET",
      getHeader: (name: string) => webReq.headers.get(name.toLowerCase()) || webReq.headers.get(name),
      text: getText,
      json: async <T>() => {
        try {
          const raw = await getText();
          return raw ? (JSON.parse(raw) as T) : null;
        } catch {
          return null;
        }
      }
    };
  }

  // 2. Node.js IncomingMessage / @vercel/node style
  const nodeReq = req as {
    headers?: Record<string, string | string[] | undefined>;
    method?: string;
    body?: unknown;
    on?: (event: string, listener: (chunk: unknown) => void) => void;
    _readableState?: { ended?: boolean };
  };

  const headers = (nodeReq.headers || {}) as Record<string, string | string[] | undefined>;
  const method = (nodeReq.method || "GET") as string;

  const getHeader = (name: string): string | null => {
    const lower = name.toLowerCase();
    const val = headers[lower] ?? headers[name];
    if (Array.isArray(val)) return val[0] ?? null;
    return val ?? null;
  };

  let cachedRawText: string | null = null;

  const getText = async (): Promise<string> => {
    if (cachedRawText !== null) return cachedRawText;

    // A. If body is already a string
    if (typeof nodeReq.body === "string") {
      cachedRawText = nodeReq.body;
      return nodeReq.body;
    }

    // B. If body is a Buffer
    if (Buffer.isBuffer(nodeReq.body)) {
      const text = nodeReq.body.toString("utf8");
      cachedRawText = text;
      return text;
    }

    // C. If request is a readable stream (e.g. bodyParser: false in Vercel)
    if (typeof nodeReq.on === "function" && !nodeReq._readableState?.ended) {
      const streamText = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        nodeReq.on?.("data", (chunk: unknown) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        });
        nodeReq.on?.("end", () => {
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
        nodeReq.on?.("error", (err: unknown) => {
          reject(err);
        });
      });
      cachedRawText = streamText;
      return streamText;
    }

    // D. Fallback if body was parsed to an object by upstream middleware
    if (nodeReq.body !== undefined && nodeReq.body !== null) {
      const str = JSON.stringify(nodeReq.body);
      cachedRawText = str;
      return str;
    }

    cachedRawText = "";
    return "";
  };

  return {
    headers,
    method,
    getHeader,
    text: getText,
    json: async <T>() => {
      if (nodeReq.body && typeof nodeReq.body === "object" && !Buffer.isBuffer(nodeReq.body)) {
        return nodeReq.body as T;
      }
      try {
        const raw = await getText();
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    }
  };
}
