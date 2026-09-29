// =============================================================================
// frontend/vite.config.js
// =============================================================================
// Purpose:
//   Vite bundler configuration for the SkyNest React frontend.
//   Configures the React plugin, the dev-server proxy (to avoid CORS
//   issues during development), and build output settings.
//
// What to implement here:
//   import { defineConfig } from 'vite';
//   import react from '@vitejs/plugin-react';
//
//   export default defineConfig({
//     plugins: [react()],
//
//     server: {
//       port: 5173,
//       proxy: {
//         // Proxy all /api requests to the FastAPI backend during development.
//         // This avoids browser CORS blocks when both run on localhost.
//         '/api': {
//           target: 'http://localhost:8000',
//           changeOrigin: true,
//         },
//       },
//     },
//
//     build: {
//       outDir: 'dist',  // Production build output (served by Nginx or similar)
//     },
//   });
//
// Dependencies:
//   - vite                  (dev server + bundler)
//   - @vitejs/plugin-react  (JSX transform + React Fast Refresh)
//
// Install with:
//   npm install --save-dev vite @vitejs/plugin-react
// =============================================================================

// TODO: Implement vite.config.js
