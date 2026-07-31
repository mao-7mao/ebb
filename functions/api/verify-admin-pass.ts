interface Env {
  ADMIN_USER?: string;
  VITE_ADMIN_USER?: string;
  ADMIN_PASS?: string;
  VITE_ADMIN_PASS?: string;
}

type PagesFunctionContext<Env = unknown> = {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
};

export const onRequestPost = async (context: PagesFunctionContext<Env>): Promise<Response> => {
  try {
    const { request, env } = context;
    const body = (await request.json()) as { username?: string; password?: string };
    const inputUser = (body.username || "").trim();
    const inputPass = (body.password || "").trim();

    // Retrieve expected admin credentials from server environment variables
    const expectedUser = (env.ADMIN_USER || env.VITE_ADMIN_USER || "ebblab").trim();
    const expectedPass = (env.ADMIN_PASS || env.VITE_ADMIN_PASS || "ebblab2026").trim();

    if (inputUser === expectedUser && inputPass === expectedPass) {
      return new Response(JSON.stringify({ success: true, message: "驗證成功" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, message: "帳號或密碼錯誤，請重新輸入。" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, message: "無效的請求格式" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
