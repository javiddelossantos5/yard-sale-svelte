import { browser } from '$app/environment';

const DARK_MODE_KEY = 'dark-mode';

// Create a reactive dark mode state
let darkMode = $state(false);

// Initialize dark mode from localStorage or system preference
function initializeDarkMode() {
	if (!browser) return;

	const stored = localStorage.getItem(DARK_MODE_KEY);
	if (stored !== null) {
		darkMode = stored === 'true';
	} else {
		// Check system preference
		darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	applyDarkMode();
}

// Apply dark mode to the document
function applyDarkMode() {
	if (!browser) return;

	if (darkMode) {
		document.documentElement.classList.add('dark');
	} else {
		document.documentElement.classList.remove('dark');
	}
}

// Toggle dark mode
export function toggleDarkMode() {
	darkMode = !darkMode;
	applyDarkMode();

	if (browser) {
		localStorage.setItem(DARK_MODE_KEY, darkMode.toString());
	}
}

// Set dark mode
export function setDarkMode(isDark: boolean) {
	darkMode = isDark;
	applyDarkMode();

	if (browser) {
		localStorage.setItem(DARK_MODE_KEY, darkMode.toString());
	}
}

// Get current dark mode state
export function isDarkMode() {
	return darkMode;
}

// Initialize on module load
if (browser) {
	initializeDarkMode();

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		if (localStorage.getItem(DARK_MODE_KEY) === null) {
			darkMode = e.matches;
			applyDarkMode();
		}
	});
}

// Export the reactive state
export { darkMode };
