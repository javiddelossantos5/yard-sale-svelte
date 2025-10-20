import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:8000',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '')
			},
			'/docs': {
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			'/openapi.json': {
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			'/redoc': {
				target: 'http://localhost:8000',
				changeOrigin: true
			}
		}
	}
});
