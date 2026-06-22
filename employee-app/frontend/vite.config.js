import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration for API requests to the backend server.
// If the browser requests an HTML page (e.g. on direct page navigation or refresh),
// we bypass the proxy and serve index.html to allow client-side React Router to resolve it.
const apiProxy = {
  target: 'http://localhost:8000',
  changeOrigin: true,
  bypass: (req, res, options) => {
    if (req.headers.accept && req.headers.accept.toLowerCase().includes('html')) {
      return '/index.html';
    }
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': apiProxy,
      '/employees': apiProxy,
      '/projects': apiProxy,
      '/departments': apiProxy,
      '/roles': apiProxy,
      '/permissions': apiProxy,
      '/createemployee': apiProxy,
    }
  }
})
