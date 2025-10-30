import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
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
			}
		}
	}
});
