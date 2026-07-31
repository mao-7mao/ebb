// Cloudflare Pages Function Middleware for HTTP Basic Authentication
// Enforces fixed username and password protection on Cloudflare edge.

interface Env {
  BASIC_AUTH_USER?: string;
  BASIC_AUTH_PASS?: string;
}

interface EventContext {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}

export const onRequest = async (context: EventContext): Promise<Response> => {
  const { request, env, next } = context;

  // Retrieve expected credentials from env or fallback defaults
  const expectedUser = env.BASIC_AUTH_USER || "ebblab";
  const expectedPass = env.BASIC_AUTH_PASS || "ebblab2026";

  const authHeader = request.headers.get("Authorization");

  if (authHeader) {
    const match = authHeader.match(/^Basic\s+(.*)$/i);
    if (match) {
      try {
        const decoded = atob(match[1]);
        const index = decoded.indexOf(":");
        if (index !== -1) {
          const user = decoded.substring(0, index);
          const pass = decoded.substring(index + 1);

          if (user === expectedUser && pass === expectedPass) {
            // Authorized -> proceed to static assets or app routes
            return await next();
          }
        }
      } catch (e) {
        // Base64 decode failed
      }
    }
  }

  // Unauthorized -> send 401 response prompting for HTTP Basic Auth
  return new Response("Unauthorized Access. Please enter valid credentials.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="EBB Lab Secure Access", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
