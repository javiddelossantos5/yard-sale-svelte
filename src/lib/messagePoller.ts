import { browser } from '$app/environment';
import { getNotificationCounts } from './api';
import { loadNotificationCounts } from './notifications';
import { getCurrentUser } from './api';

class MessagePoller {
	private intervalId: number | null = null;
	private lastCheckTime: Date = new Date();
	private isPolling = false;
	private currentUserId: number | null = null;

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
			await loadNotificationCounts();

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

// Auto-start polling when the module is imported (in browser only)
if (browser) {
	// Start polling after a short delay to ensure the app is initialized
	setTimeout(() => {
		messagePoller.startPolling();
	}, 2000);
}
