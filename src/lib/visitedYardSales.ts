import { browser } from '$app/environment';
import {
	markYardSaleAsVisited as markVisitedAPI,
	markYardSaleAsNotVisited as markNotVisitedAPI,
	getUserVisitedYardSales
} from './api';

const VISITED_KEY = 'visited_yard_sales';
const SYNC_KEY = 'visited_sync_completed';

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
 * Check if a yard sale has been visited (backend first, localStorage fallback)
 */
export function isYardSaleVisited(yardSaleId: number, yardSale?: any): boolean {
	if (!browser) return false;

	// If yard sale object has visited status from API, use that
	if (yardSale && typeof yardSale.is_visited === 'boolean') {
		console.log(`Using API visited status for yard sale ${yardSaleId}: ${yardSale.is_visited}`);
		return yardSale.is_visited;
	}

	// Fallback to localStorage
	const visited = getVisitedYardSales();
	const isVisited = visited.includes(yardSaleId);
	console.log(`Using localStorage visited status for yard sale ${yardSaleId}: ${isVisited}`);
	return isVisited;
}

/**
 * Mark a yard sale as visited (backend + localStorage)
 */
export async function markYardSaleAsVisited(yardSaleId: number): Promise<void> {
	if (!browser) return;

	try {
		// Try backend first
		await markVisitedAPI(yardSaleId);

		// Update localStorage as backup
		const visited = getVisitedYardSales();
		if (!visited.includes(yardSaleId)) {
			visited.push(yardSaleId);
			localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
		}
	} catch (error) {
		console.warn('Backend visit tracking failed, using localStorage:', error);

		// Fallback to localStorage only
		const visited = getVisitedYardSales();
		if (!visited.includes(yardSaleId)) {
			visited.push(yardSaleId);
			localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
		}
	}
}

/**
 * Mark a yard sale as not visited (backend + localStorage)
 */
export async function markYardSaleAsNotVisited(yardSaleId: number): Promise<void> {
	if (!browser) return;

	try {
		// Try backend first
		await markNotVisitedAPI(yardSaleId);

		// Update localStorage as backup
		const visited = getVisitedYardSales();
		const updated = visited.filter((id) => id !== yardSaleId);
		localStorage.setItem(VISITED_KEY, JSON.stringify(updated));
	} catch (error) {
		console.warn('Backend visit tracking failed, using localStorage:', error);

		// Fallback to localStorage only
		const visited = getVisitedYardSales();
		const updated = visited.filter((id) => id !== yardSaleId);
		localStorage.setItem(VISITED_KEY, JSON.stringify(updated));
	}
}

/**
 * Toggle visited status for a yard sale (backend + localStorage)
 */
export async function toggleYardSaleVisited(yardSaleId: number, yardSale?: any): Promise<boolean> {
	if (!browser) return false;

	const isVisited = isYardSaleVisited(yardSaleId, yardSale);
	console.log(`Toggling visited status for yard sale ${yardSaleId}: currently ${isVisited}`);

	if (isVisited) {
		await markYardSaleAsNotVisited(yardSaleId);
		console.log(`Marked yard sale ${yardSaleId} as NOT visited`);
		return false;
	} else {
		await markYardSaleAsVisited(yardSaleId);
		console.log(`Marked yard sale ${yardSaleId} as visited`);
		return true;
	}
}

/**
 * Sync localStorage with backend (run on login)
 */
export async function syncVisitedStatus(): Promise<void> {
	if (!browser) return;

	try {
		// Check if we've already synced
		const hasSynced = localStorage.getItem(SYNC_KEY);
		if (hasSynced) return;

		// Get visited from backend
		const serverVisited = await getUserVisitedYardSales();

		// Get visited from localStorage
		const localVisited = getVisitedYardSales();

		// Merge both lists (backend takes precedence)
		const merged = [...new Set([...serverVisited, ...localVisited])];

		// Update localStorage
		localStorage.setItem(VISITED_KEY, JSON.stringify(merged));
		localStorage.setItem(SYNC_KEY, 'true');

		console.log('Visited status synced with backend');
	} catch (error) {
		console.warn('Failed to sync visited status with backend:', error);
		// Continue with localStorage only
	}
}

/**
 * Clear all visited yard sales
 */
export function clearAllVisitedYardSales(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(VISITED_KEY);
		localStorage.removeItem(SYNC_KEY);
	} catch (error) {
		console.error('Error clearing visited yard sales:', error);
	}
}
