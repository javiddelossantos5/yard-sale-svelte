import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const DARK_MODE_KEY = 'dark-mode';

// Create a writable store for dark mode state
export const darkMode = writable(false);

// Initialize dark mode from localStorage or system preference
function initializeDarkMode() {
	if (!browser) return;

	// Set up the subscription first
	applyDarkMode();

	// Then set the initial value
	const stored = localStorage.getItem(DARK_MODE_KEY);
	if (stored !== null) {
		darkMode.set(stored === 'true');
	} else {
		// Check system preference
		darkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
	}
}

// Apply dark mode to the document
function applyDarkMode() {
	if (!browser) return;

	// Subscribe to dark mode changes and apply them
	darkMode.subscribe((isDark) => {
		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	});
}

// Toggle dark mode
export function toggleDarkMode() {
	darkMode.update((current) => {
		const newValue = !current;
		if (browser) {
			localStorage.setItem(DARK_MODE_KEY, newValue.toString());
		}
		return newValue;
	});
}

// Set dark mode
export function setDarkMode(isDark: boolean) {
	darkMode.set(isDark);
	if (browser) {
		localStorage.setItem(DARK_MODE_KEY, isDark.toString());
	}
}

// Get current dark mode state
export function isDarkMode() {
	let current = false;
	darkMode.subscribe((value) => {
		current = value;
	})();
	return current;
}

// Initialize on module load
if (browser) {
	initializeDarkMode();

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		if (localStorage.getItem(DARK_MODE_KEY) === null) {
			darkMode.set(e.matches);
		}
	});
}
