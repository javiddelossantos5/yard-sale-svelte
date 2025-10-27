import { browser } from '$app/environment';
import {
	markYardSaleAsVisited as markVisitedAPI,
	markYardSaleAsNotVisited as markNotVisitedAPI,
	getUserVisitedYardSales
} from './api';

const VISITED_KEY_PREFIX = 'visited_yard_sales_';
const SYNC_KEY_PREFIX = 'visited_sync_completed_';

/**
 * Get user-specific localStorage keys
 */
function getUserKeys(userId: string | null): { visitedKey: string; syncKey: string } {
	const userSuffix = userId ? `user_${userId}` : 'anonymous';
	return {
		visitedKey: `${VISITED_KEY_PREFIX}${userSuffix}`,
		syncKey: `${SYNC_KEY_PREFIX}${userSuffix}`
	};
}

/**
 * Get current user ID from localStorage token
 */
function getCurrentUserId(): string | null {
	if (!browser) return null;

	try {
		const token = localStorage.getItem('access_token');
		if (!token) return null;

		// Decode JWT to get user ID (simple base64 decode)
		const payload = JSON.parse(atob(token.split('.')[1]));
		return payload.sub || null;
	} catch (error) {
		console.warn('Failed to get current user ID from token:', error);
		return null;
	}
}

/**
 * Get all visited yard sale IDs from localStorage for current user
 */
export function getVisitedYardSales(): string[] {
	if (!browser) return [];

	try {
		const userId = getCurrentUserId();
		const { visitedKey } = getUserKeys(userId);
		const visited = localStorage.getItem(visitedKey);
		return visited ? JSON.parse(visited) : [];
	} catch (error) {
		console.error('Error reading visited yard sales:', error);
		return [];
	}
}

/**
 * Check if a yard sale has been visited (backend first, localStorage fallback)
 */
export function isYardSaleVisited(yardSaleId: string, yardSale?: any): boolean {
	if (!browser) return false;

	// If yard sale object has visited status from API, use that
	if (yardSale && typeof yardSale.is_visited === 'boolean') {
		return yardSale.is_visited;
	}

	// Fallback to localStorage
	const visited = getVisitedYardSales();
	return visited.includes(yardSaleId);
}

/**
 * Mark a yard sale as visited (backend + localStorage)
 */
export async function markYardSaleAsVisited(yardSaleId: string): Promise<void> {
	if (!browser) return;

	try {
		// Try backend first
		await markVisitedAPI(yardSaleId);

		// Update localStorage as backup
		const visited = getVisitedYardSales();
		if (!visited.includes(yardSaleId)) {
			visited.push(yardSaleId);
			const userId = getCurrentUserId();
			const { visitedKey } = getUserKeys(userId);
			localStorage.setItem(visitedKey, JSON.stringify(visited));
		}
	} catch (error) {
		console.warn('Backend visit tracking failed, using localStorage:', error);

		// Fallback to localStorage only
		const visited = getVisitedYardSales();
		if (!visited.includes(yardSaleId)) {
			visited.push(yardSaleId);
			const userId = getCurrentUserId();
			const { visitedKey } = getUserKeys(userId);
			localStorage.setItem(visitedKey, JSON.stringify(visited));
		}
	}
}

/**
 * Mark a yard sale as not visited (backend + localStorage)
 */
export async function markYardSaleAsNotVisited(yardSaleId: string): Promise<void> {
	if (!browser) return;

	try {
		// Try backend first
		await markNotVisitedAPI(yardSaleId);

		// Update localStorage as backup
		const visited = getVisitedYardSales();
		const updated = visited.filter((id) => id !== yardSaleId);
		const userId = getCurrentUserId();
		const { visitedKey } = getUserKeys(userId);
		localStorage.setItem(visitedKey, JSON.stringify(updated));
	} catch (error) {
		console.warn('Backend visit tracking failed, using localStorage:', error);

		// Fallback to localStorage only
		const visited = getVisitedYardSales();
		const updated = visited.filter((id) => id !== yardSaleId);
		const userId = getCurrentUserId();
		const { visitedKey } = getUserKeys(userId);
		localStorage.setItem(visitedKey, JSON.stringify(updated));
	}
}

/**
 * Toggle visited status for a yard sale (backend + localStorage)
 */
export async function toggleYardSaleVisited(yardSaleId: string, yardSale?: any): Promise<boolean> {
	if (!browser) return false;

	const isVisited = isYardSaleVisited(yardSaleId, yardSale);

	if (isVisited) {
		await markYardSaleAsNotVisited(yardSaleId);
		return false;
	} else {
		await markYardSaleAsVisited(yardSaleId);
		return true;
	}
}

/**
 * Sync localStorage with backend (run on login)
 */
export async function syncVisitedStatus(): Promise<void> {
	if (!browser) return;

	try {
		const userId = getCurrentUserId();
		const { visitedKey, syncKey } = getUserKeys(userId);

		// Check if we've already synced for this user
		const hasSynced = localStorage.getItem(syncKey);
		if (hasSynced) {
			return;
		}

		// Get visited from backend
		const serverVisited = await getUserVisitedYardSales();

		// Get visited from localStorage
		const localVisited = getVisitedYardSales();

		// Merge both lists (backend takes precedence)
		const merged = [...new Set([...serverVisited, ...localVisited])];

		// Update localStorage with user-specific keys
		localStorage.setItem(visitedKey, JSON.stringify(merged));
		localStorage.setItem(syncKey, 'true');
	} catch (error) {
		console.warn('Failed to sync visited status with backend:', error);
		// Continue with localStorage only
	}
}

/**
 * Clear all visited yard sales for current user
 */
export function clearAllVisitedYardSales(): void {
	if (!browser) return;

	try {
		const userId = getCurrentUserId();
		const { visitedKey, syncKey } = getUserKeys(userId);
		localStorage.removeItem(visitedKey);
		localStorage.removeItem(syncKey);
	} catch (error) {
		console.error('Error clearing visited yard sales:', error);
	}
}

/**
 * Migrate old localStorage data to user-specific keys
 * This should be called once to clean up old shared data
 */
export function migrateOldVisitedData(): void {
	if (!browser) return;

	try {
		// Check for old shared keys
		const oldVisitedKey = 'visited_yard_sales';
		const oldSyncKey = 'visited_sync_completed';

		const oldVisited = localStorage.getItem(oldVisitedKey);
		const oldSync = localStorage.getItem(oldSyncKey);

		if (oldVisited || oldSync) {
			// Get current user
			const userId = getCurrentUserId();
			const { visitedKey, syncKey } = getUserKeys(userId);

			// If we have a user and old data exists, migrate it
			if (userId && oldVisited) {
				localStorage.setItem(visitedKey, oldVisited);
			}

			if (userId && oldSync) {
				localStorage.setItem(syncKey, oldSync);
			}

			// Remove old keys
			localStorage.removeItem(oldVisitedKey);
			localStorage.removeItem(oldSyncKey);
		}
	} catch (error) {
		console.error('Error migrating old visited data:', error);
	}
}
