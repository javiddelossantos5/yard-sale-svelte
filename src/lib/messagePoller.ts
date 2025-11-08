import { browser } from '$app/environment';
import { getNotificationCounts } from './api';
import { loadNotificationCounts, loadNotifications } from './notifications';
import { getCurrentUser } from './api';

class MessagePoller {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private lastCheckTime: Date = new Date();
	private isPolling = false;
	private currentUserId: string | null = null;

	// Start polling for new messages
	async startPolling() {
		if (!browser || this.isPolling) return;

		try {
			// Get current user
			const user = await getCurrentUser();
			if (!user) {
				return;
			}

			this.currentUserId = user.id;
			this.isPolling = true;
			this.lastCheckTime = new Date();

			// Poll every 15 seconds
			this.intervalId = setInterval(() => {
				this.checkForNewNotifications();
			}, 15000);
		} catch (error) {
			console.warn('Failed to start message polling:', error);
		}
	}

	// Stop polling
	stopPolling() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.isPolling = false;
	}

	// Check for new notifications
	private async checkForNewNotifications() {
		if (!this.currentUserId) return;

		try {
			// Load notification counts to update the UI
			// This also loads the full notifications list (see loadNotificationCounts implementation)
			await loadNotificationCounts();

			// Also explicitly load notifications to ensure they're refreshed
			// This ensures report notifications and other types are loaded
			await loadNotifications(1, 50);

			// Update last check time
			this.lastCheckTime = new Date();
		} catch (error) {
			console.warn('Error checking for new notifications:', error);
		}
	}

	// Get polling status
	get isActive(): boolean {
		return this.isPolling;
	}
}

// Create singleton instance
export const messagePoller = new MessagePoller();

// Note: Message polling is now controlled from +layout.svelte
// to prevent it from running on the login page or when user is not logged in
