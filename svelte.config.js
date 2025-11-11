import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// Ensure all routes are handled by the Node.js server
			// This is important when SSR is disabled
		})
	},
	vitePlugin: {
		inspector: {
			enabled: true, // ✅ ensures inspector is injected
			toggleKeyCombo: 'meta-shift', // ✅ macOS Command + Shift shortcut
			showToggleButton: 'always', // ✅ always show toggle button
			toggleButtonPos: 'bottom-left', // ✅ button position
			holdMode: false // ✅ click mode (not hold mode)
		}
	}
};

export default config;
