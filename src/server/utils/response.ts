import { AppError } from "../errors/appErrors";

export interface StandardApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
}

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
 * Formats an unknown error or AppError into a safe JSON API error response
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonResponse(
      {
        error: error.message,
        code: error.errorCode
      },
      error.statusCode
    );
  }

  // Generic fallback without exposing internal stack traces
  return jsonResponse(
    {
      error: "An unexpected server error occurred.",
      code: "INTERNAL_SERVER_ERROR"
    },
    500
  );
}

/**
 * Universal request parser that extracts headers and JSON body across Web Request or Node IncomingMessage
 */
export async function parseRequest(
  req: Request | { headers: Record<string, string | string[] | undefined>; body?: unknown; method?: string }
): Promise<{
  headers: Headers | Record<string, string | string[] | undefined>;
  method: string;
  json: <T>() => Promise<T | null>;
}> {
  if (typeof (req as Request).headers?.get === "function") {
    const webReq = req as Request;
    return {
      headers: webReq.headers,
      method: webReq.method || "GET",
      json: async <T>() => {
        try {
          return (await webReq.json()) as T;
        } catch {
          return null;
        }
      }
    };
  }

  // Node IncomingMessage / VercelRequest style
  const nodeReq = req as { headers: Record<string, string | string[] | undefined>; body?: unknown; method?: string };
  return {
    headers: nodeReq.headers,
    method: nodeReq.method || "GET",
    json: async <T>() => {
      if (nodeReq.body) {
        return (typeof nodeReq.body === "string" ? JSON.parse(nodeReq.body) : nodeReq.body) as T;
      }
      return null;
    }
  };
}
