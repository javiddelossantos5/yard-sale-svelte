import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
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
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			// Remove /api prefix for all other endpoints
			'^/api/(?!login|register|me|user)': {
				target: 'http://localhost:8000',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '')
			},
			// Proxy image upload endpoints directly
			'^/(upload|images)': {
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			// Proxy market-items messaging endpoints directly
			'^/market-items/(conversations|.*/messages|messages/.*)': {
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			// Proxy yard-sales messaging endpoints directly
			'^/yard-sales/(conversations|.*/messages|messages/.*)': {
				target: 'http://localhost:8000',
				changeOrigin: true
			}
		}
	}
});
