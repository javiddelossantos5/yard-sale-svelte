// Disable SSR for market item detail page to ensure client-side routing works
export const ssr = false;

// Route matcher to ensure this route only matches market item IDs (not "messages" or "watched")
export function match(param: string) {
	// Only match if it's not a reserved route
	const reserved = ['messages', 'watched'];
	return !reserved.includes(param) && param.length > 0;
}
