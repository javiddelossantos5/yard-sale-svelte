/// <reference types="node" />
import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { cwd } from 'process';

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	const env = loadEnv(mode, cwd(), '');

	// Get API base URL from environment variable, fallback to default
	const API_BASE_URL = env.VITE_API_BASE_URL || 'http://10.1.2.165:8000';

	// Log the API base URL for debugging (only in dev mode)
	if (mode === 'development') {
		console.log(`[Vite] Proxy target API base URL: ${API_BASE_URL}`);
	}

	return {
		plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
		build: {
			sourcemap: true
		},
		server: {
			sourcemapIgnoreList: false,
			fs: {
				allow: ['.'] // Allow opening local files
			},
			host: true, // <-- allow network access
			allowedHosts: ['yardsalefinders.com', 'main.yardsalefinders.com', 'localhost', '10.1.2.165'], // <-- add your hostnames
			proxy: {
				// Remove /api prefix for ALL endpoints (backend removed /api prefix)
				'/api': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false,
					ws: true,
					rewrite: (path) => path.replace(/^\/api/, '') // Remove /api prefix for ALL endpoints
				},
				// Proxy image upload and proxy endpoints directly (no /api prefix)
				'^/(upload|images|image-proxy)': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false,
					configure: (proxy, options) => {
						proxy.on('proxyReq', (proxyReq, req, res) => {
							try {
								// Parse the request URL to extract token
								const fullUrl = req.url || '';
								const url = new URL(fullUrl, `http://${req.headers.host || 'localhost'}`);
								const token = url.searchParams.get('token');

								if (token) {
									// Add Authorization header from token query parameter
									proxyReq.setHeader('Authorization', `Bearer ${token}`);
									// Remove token from query string for security
									url.searchParams.delete('token');
									proxyReq.path = url.pathname + url.search;
									console.log(`[Vite Proxy] Added Authorization header for: ${url.pathname}`);
								} else {
									console.warn(`[Vite Proxy] No token found in request: ${fullUrl}`);
								}
							} catch (error) {
								console.error('[Vite Proxy] Error parsing URL:', error);
							}
						});
					}
				},
				// Proxy market-items messaging endpoints directly (no /api prefix)
				'^/market-items/(conversations|.*/messages|messages/.*)': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false
				},
				// Proxy yard-sales messaging endpoints directly (no /api prefix)
				'^/yard-sales/(conversations|.*/messages|messages/.*)': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false
				},
				// Proxy events messaging endpoints directly (no /api prefix)
				'^/events/(conversations|.*/messages|messages/.*)': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false
				}
			}
		}
	};
});
