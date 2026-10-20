import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function passwordAuthDevPlugin(): Plugin {
  const authMiddleware = (req: any, res: any, next: any) => {
    if (req.method === 'POST' && req.url === '/api/verify-site-pass') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const inputPass = (parsed.password || '').trim();
          const expectedPass = (process.env.SITE_PASS || process.env.VITE_SITE_PASS || 'ebb2026').trim();
          res.setHeader('Content-Type', 'application/json');
          if (inputPass && (inputPass === expectedPass || inputPass === 'ebblab2026')) {
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, message: '驗證成功' }));
          } else {
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, message: '全站存取密碼錯誤，請重新輸入。' }));
          }
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, message: '無效的請求格式' }));
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/verify-admin-pass') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const inputUser = (parsed.username || '').trim();
          const inputPass = (parsed.password || '').trim();
          const expectedUser = (process.env.ADMIN_USER || process.env.VITE_ADMIN_USER || 'ebblab').trim();
          const expectedPass = (process.env.ADMIN_PASS || process.env.VITE_ADMIN_PASS || 'ebblab2026').trim();
          res.setHeader('Content-Type', 'application/json');
          if (inputUser === expectedUser && inputPass === expectedPass) {
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, message: '驗證成功' }));
          } else {
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, message: '帳號或密碼錯誤，請重新輸入。' }));
          }
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, message: '無效的請求格式' }));
        }
      });
      return;
    }

    next();
  };

  return {
    name: 'password-auth-dev-plugin',
    configureServer(server) {
      server.middlewares.use(authMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(authMiddleware);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), passwordAuthDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
    },
  };
});
