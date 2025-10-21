import { browser } from '$app/environment';

const VISITED_KEY = 'visited_yard_sales';

/**
 * Get all visited yard sale IDs from localStorage
 */
export function getVisitedYardSales(): number[] {
	if (!browser) return [];

	try {
		const visited = localStorage.getItem(VISITED_KEY);
		return visited ? JSON.parse(visited) : [];
	} catch (error) {
		console.error('Error reading visited yard sales:', error);
		return [];
	}
}

/**
 * Check if a yard sale has been visited
 */
export function isYardSaleVisited(yardSaleId: number): boolean {
	if (!browser) return false;

	const visited = getVisitedYardSales();
	return visited.includes(yardSaleId);
}

/**
 * Mark a yard sale as visited
 */
export function markYardSaleAsVisited(yardSaleId: number): void {
	if (!browser) return;

	try {
		const visited = getVisitedYardSales();
		if (!visited.includes(yardSaleId)) {
			visited.push(yardSaleId);
			localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
		}
	} catch (error) {
		console.error('Error marking yard sale as visited:', error);
	}
}

/**
 * Mark a yard sale as not visited (remove from visited list)
 */
export function markYardSaleAsNotVisited(yardSaleId: number): void {
	if (!browser) return;

	try {
		const visited = getVisitedYardSales();
		const updated = visited.filter((id) => id !== yardSaleId);
		localStorage.setItem(VISITED_KEY, JSON.stringify(updated));
	} catch (error) {
		console.error('Error marking yard sale as not visited:', error);
	}
}

/**
 * Toggle visited status for a yard sale
 */
export function toggleYardSaleVisited(yardSaleId: number): boolean {
	if (!browser) return false;

	const isVisited = isYardSaleVisited(yardSaleId);

	if (isVisited) {
		markYardSaleAsNotVisited(yardSaleId);
		return false;
	} else {
		markYardSaleAsVisited(yardSaleId);
		return true;
	}
}

/**
 * Clear all visited yard sales
 */
export function clearAllVisitedYardSales(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(VISITED_KEY);
	} catch (error) {
		console.error('Error clearing visited yard sales:', error);
	}
}
