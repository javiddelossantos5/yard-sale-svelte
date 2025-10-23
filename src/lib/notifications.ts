import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
	getNotifications,
	getNotificationCounts,
	markNotificationAsRead as markReadAPI,
	markAllNotificationsAsRead as markAllReadAPI,
	deleteNotification as deleteAPI,
	type Notification as APINotification
} from './api';

// Re-export the API Notification interface for compatibility
export type Notification = APINotification;

export interface MessageNotification extends Notification {
	type: 'message';
	related_user_id: number;
	related_yard_sale_id?: number;
	related_message_id?: number;
}

// Notification store
export const notifications = writable<Notification[]>([]);
export const unreadCount = writable<number>(0);

// Derived store for message-specific unread count
export const unreadMessageCount = writable<number>(0);

// Sound notification settings
export const soundEnabled = writable<boolean>(true);
export const browserNotificationsEnabled = writable<boolean>(false);

// Notification sound
let notificationSound: HTMLAudioElement | null = null;

if (browser) {
	// Create notification sound (you can replace this with your own sound file)
	notificationSound = new Audio(
		'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
	);
	notificationSound.volume = 0.3;
}

// Load notifications from backend
export async function loadNotifications(page: number = 1, limit: number = 50) {
	if (!browser) return;

	try {
		const response = await getNotifications(page, limit);
		notifications.set(response.notifications);
		// Handle both field name formats
		const unreadCountValue = response.unread_count || response.unread_notifications || 0;
		unreadCount.set(unreadCountValue);

		// Calculate message-specific unread count
		const messageUnreadCount = response.notifications.filter(
			(n) => n.type === 'message' && !n.is_read
		).length;
		unreadMessageCount.set(messageUnreadCount);
	} catch (error) {
		console.warn('Failed to load notifications:', error);
	}
}

// Load notification counts
export async function loadNotificationCounts() {
	if (!browser) return;

	try {
		const counts = await getNotificationCounts();
		// Handle both field name formats
		const unreadCountValue = counts.unread || counts.unread_notifications || 0;
		unreadCount.set(unreadCountValue);

		// Also load notifications to calculate message-specific count
		await loadNotifications(1, 50);
	} catch (error) {
		console.warn('Failed to load notification counts:', error);
	}
}

// Add a message notification (for testing - notifications are now created by backend)
export function addMessageNotification(
	senderId: number,
	senderUsername: string,
	message: string,
	conversationId?: number,
	yardSaleId?: number
) {
	// This is now just for testing - real notifications come from backend
	// Play sound if enabled
	if (soundEnabled) {
		playNotificationSound();
	}

	// Show browser notification if enabled
	if (browserNotificationsEnabled) {
		showBrowserNotification({
			type: 'message',
			title: `New message from ${senderUsername}`,
			message: message,
			related_user_id: senderId,
			related_yard_sale_id: yardSaleId,
			related_message_id: conversationId
		} as MessageNotification);
	}

	// Refresh notifications from backend
	loadNotifications();
}

// Remove a notification
export async function removeNotification(id: number) {
	try {
		await deleteAPI(id);
		// Refresh notifications from backend
		await loadNotifications();
	} catch (error) {
		console.warn('Failed to delete notification:', error);
	}
}

// Mark notification as read
export async function markNotificationAsRead(id: number) {
	try {
		await markReadAPI(id);
		// Update local state
		notifications.update((current) => {
			return current.map((n) => {
				if (n.id === id && !n.is_read) {
					unreadCount.update((count) => Math.max(0, count - 1));
					return { ...n, is_read: true };
				}
				return n;
			});
		});
	} catch (error) {
		console.warn('Failed to mark notification as read:', error);
	}
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
	try {
		await markAllReadAPI();
		// Update local state
		notifications.update((current) => {
			return current.map((n) => ({ ...n, is_read: true }));
		});
		unreadCount.set(0);
	} catch (error) {
		console.warn('Failed to mark all notifications as read:', error);
	}
}

// Clear all notifications (delete all)
export async function clearAllNotifications() {
	try {
		// Get current notifications from the store
		let currentNotifications: Notification[] = [];
		notifications.subscribe((notifs) => {
			currentNotifications = notifs;
		})();

		// Delete all notifications
		for (const notification of currentNotifications) {
			await deleteAPI(notification.id);
		}
		// Refresh from backend
		await loadNotifications();
	} catch (error) {
		console.warn('Failed to clear all notifications:', error);
	}
}

// Play notification sound
function playNotificationSound() {
	if (notificationSound && soundEnabled) {
		notificationSound.currentTime = 0;
		notificationSound.play().catch((error) => {
			console.warn('Could not play notification sound:', error);
		});
	}
}

// Show browser notification
function showBrowserNotification(notification: MessageNotification) {
	if (!browser || !('Notification' in window)) return;

	if (Notification.permission === 'granted') {
		const browserNotification = new Notification(notification.title, {
			body: notification.message,
			icon: '/icon.png',
			tag: `message-${notification.related_user_id}`,
			requireInteraction: false
		});

		browserNotification.onclick = () => {
			window.focus();
			browserNotification.close();
			// You can add logic here to navigate to the conversation
		};

		// Auto-close after 5 seconds
		setTimeout(() => {
			browserNotification.close();
		}, 5000);
	}
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
	if (!browser || !('Notification' in window)) return false;

	if (Notification.permission === 'default') {
		const permission = await Notification.requestPermission();
		browserNotificationsEnabled.set(permission === 'granted');
		return permission === 'granted';
	}

	const granted = Notification.permission === 'granted';
	browserNotificationsEnabled.set(granted);
	return granted;
}

// Check if browser notifications are supported
export function isNotificationSupported(): boolean {
	return browser && 'Notification' in window;
}

// Initialize notification settings from localStorage
if (browser) {
	// Load sound setting
	const savedSoundSetting = localStorage.getItem('notification-sound-enabled');
	if (savedSoundSetting !== null) {
		soundEnabled.set(savedSoundSetting === 'true');
	}

	// Load browser notification setting
	const savedBrowserSetting = localStorage.getItem('browser-notifications-enabled');
	if (savedBrowserSetting !== null) {
		browserNotificationsEnabled.set(savedBrowserSetting === 'true');
	}

	// Save settings when they change
	soundEnabled.subscribe((value) => {
		localStorage.setItem('notification-sound-enabled', value.toString());
	});

	browserNotificationsEnabled.subscribe((value) => {
		localStorage.setItem('browser-notifications-enabled', value.toString());
	});
}
