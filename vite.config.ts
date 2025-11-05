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
			allowedHosts: ['yardsalefinders.com', 'localhost', '10.1.2.165'], // <-- add your hostnames
			proxy: {
				// Keep /api prefix for auth and user endpoints
				'^/api/(login|register|me|user)': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false,
					ws: true,
					rewrite: (path) => path // Keep the path as-is (including /api prefix)
				},
				// Remove /api prefix for all other endpoints
				'^/api/(?!login|register|me|user)': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/api/, '')
				},
				// Proxy image upload endpoints directly
				'^/(upload|images)': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false
				},
				// Proxy market-items messaging endpoints directly
				'^/market-items/(conversations|.*/messages|messages/.*)': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false
				},
				// Proxy yard-sales messaging endpoints directly
				'^/yard-sales/(conversations|.*/messages|messages/.*)': {
					target: API_BASE_URL,
					changeOrigin: true,
					secure: false
				}
			}
		}
	};
});
