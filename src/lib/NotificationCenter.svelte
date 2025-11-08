<script lang="ts">
	import { onMount } from 'svelte';
	import {
		notifications,
		unreadCount,
		markNotificationAsRead,
		removeNotification,
		markAllNotificationsAsRead,
		clearAllNotifications,
		loadNotifications,
		loadNotificationCounts,
		soundEnabled,
		browserNotificationsEnabled,
		requestNotificationPermission,
		isNotificationSupported
	} from './notifications';
	import { goto } from '$app/navigation';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faBell,
		faCheck,
		faTrash,
		faVolumeUp,
		faVolumeMute,
		faCog,
		faMessage,
		faTimes,
		faExclamationTriangle
	} from '@fortawesome/free-solid-svg-icons';

	let isOpen = $state(false);
	let showSettings = $state(false);

	// Format timestamp
	function formatTime(timestamp: string | Date): string {
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString();
	}

	// Handle notification click
	function handleNotificationClick(notification: any) {
		markNotificationAsRead(notification.id);

		// Close the notification center
		isOpen = false;

		if (notification.type === 'message') {
			// Navigate to the conversation or yard sale
			if (notification.related_yard_sale_id) {
				goto(`/yard-sale/${notification.related_yard_sale_id}`);
			} else if (notification.related_user_id) {
				// Navigate to user profile
				goto(`/profile/${notification.related_user_id}`);
			}
		} else if (notification.type === 'report') {
			// Navigate to the reported item or user
			if (notification.related_yard_sale_id) {
				// Navigate to the reported yard sale
				goto(`/yard-sale/${notification.related_yard_sale_id}`);
			} else if (notification.related_user_id) {
				// Navigate to the reported user's profile
				goto(`/profile/${notification.related_user_id}`);
			} else {
				// If no specific target, navigate to admin dashboard
				goto('/admin');
			}
		}
	}

	// Toggle notification center
	function toggleNotificationCenter() {
		isOpen = !isOpen;
		if (isOpen) {
			showSettings = false;
			// Load notifications when opening to ensure latest notifications are shown
			loadNotifications().catch((error) => {
				console.warn('Failed to load notifications:', error);
			});
		}
	}

	// Toggle settings
	function toggleSettings() {
		showSettings = !showSettings;
	}

	// Request notification permission
	async function requestPermission() {
		await requestNotificationPermission();
	}

	// Close notification center when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.notification-center')) {
			isOpen = false;
			showSettings = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<!-- Notification Bell Button -->
<button
	onclick={toggleNotificationCenter}
	class="group relative rounded-full bg-white/10 p-2 backdrop-blur-md transition-all duration-200 hover:bg-white/20"
	aria-label="Notifications"
>
	<FontAwesomeIcon
		icon={faBell}
		class="h-5 w-5 text-white transition-colors group-hover:text-blue-300"
	/>

	<!-- Unread Badge -->
	{#if $unreadCount > 0}
		<span
			class="absolute -top-1 -right-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white"
		>
			{$unreadCount > 99 ? '99+' : $unreadCount}
		</span>
	{/if}
</button>

<!-- Notification Center Dropdown -->
{#if isOpen}
	<div
		class="notification-center absolute top-12 right-0 z-50 max-h-96 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-xl"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200/50 p-4">
			<div class="flex items-center gap-3">
				<FontAwesomeIcon icon={faBell} class="h-5 w-5 text-gray-600" />
				<h3 class="font-semibold text-gray-800">Notifications</h3>
				{#if $unreadCount > 0}
					<span class="rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">
						{$unreadCount}
					</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={toggleSettings}
					class="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
					aria-label="Settings"
				>
					<FontAwesomeIcon icon={faCog} class="h-4 w-4 text-gray-600" />
				</button>
				<button
					onclick={() => (isOpen = false)}
					class="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
					aria-label="Close"
				>
					<FontAwesomeIcon icon={faTimes} class="h-4 w-4 text-gray-600" />
				</button>
			</div>
		</div>

		<!-- Settings Panel -->
		{#if showSettings}
			<div class="border-b border-gray-200/50 p-4">
				<h4 class="mb-3 font-medium text-gray-800">Notification Settings</h4>

				<!-- Sound Toggle -->
				<div class="mb-3 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<FontAwesomeIcon
							icon={$soundEnabled ? faVolumeUp : faVolumeMute}
							class="h-4 w-4 text-gray-600"
						/>
						<span class="text-sm text-gray-700">Sound notifications</span>
					</div>
					<button
						onclick={() => soundEnabled.set(!$soundEnabled)}
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {$soundEnabled
							? 'bg-blue-500'
							: 'bg-gray-300'}"
						aria-label={$soundEnabled
							? 'Disable sound notifications'
							: 'Enable sound notifications'}
					>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {$soundEnabled
								? 'translate-x-6'
								: 'translate-x-1'}"
						></span>
					</button>
				</div>

				<!-- Browser Notifications -->
				{#if isNotificationSupported()}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<FontAwesomeIcon icon={faBell} class="h-4 w-4 text-gray-600" />
							<span class="text-sm text-gray-700">Browser notifications</span>
						</div>
						{#if !$browserNotificationsEnabled}
							<button
								onclick={requestPermission}
								class="rounded-lg bg-blue-500 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-600"
							>
								Enable
							</button>
						{:else}
							<span class="text-xs font-medium text-green-600">Enabled</span>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Notifications List -->
		<div class="max-h-64 overflow-y-auto">
			{#if $notifications.length === 0}
				<div class="p-6 text-center text-gray-500">
					<FontAwesomeIcon icon={faBell} class="mx-auto mb-2 h-8 w-8 opacity-50" />
					<p class="text-sm">No notifications yet</p>
				</div>
			{:else}
				{#each $notifications as notification (notification.id)}
					<button
						onclick={() => handleNotificationClick(notification)}
						onkeydown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
						class="w-full cursor-pointer border-b border-gray-100/50 p-4 text-left transition-colors hover:bg-gray-50/50 {notification.is_read
							? 'opacity-60'
							: notification.type === 'report'
								? 'bg-red-50/30'
								: 'bg-blue-50/30'}"
						aria-label="Notification: {notification.title}"
					>
						<div class="flex items-start gap-3">
							<!-- Icon -->
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full {notification.type ===
								'message'
									? 'bg-blue-100 text-blue-600'
									: notification.type === 'report'
										? 'bg-red-100 text-red-600'
										: 'bg-gray-100 text-gray-600'}"
							>
								{#if notification.type === 'message'}
									<FontAwesomeIcon icon={faMessage} class="h-4 w-4" />
								{:else if notification.type === 'report'}
									<FontAwesomeIcon icon={faExclamationTriangle} class="h-4 w-4" />
								{:else}
									<FontAwesomeIcon icon={faBell} class="h-4 w-4" />
								{/if}
							</div>

							<!-- Content -->
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between">
									<h4 class="truncate text-sm font-medium text-gray-800">
										{notification.title}
									</h4>
									<span class="ml-2 shrink-0 text-xs text-gray-500">
										{formatTime(notification.created_at)}
									</span>
								</div>
								<p class="mt-1 line-clamp-2 text-sm text-gray-600">
									{notification.message}
								</p>
							</div>

							<!-- Unread indicator -->
							{#if !notification.is_read}
								<div
									class="mt-2 h-2 w-2 shrink-0 rounded-full {notification.type === 'report'
										? 'bg-red-500'
										: 'bg-blue-500'}"
								></div>
							{/if}
						</div>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Footer Actions -->
		{#if $notifications.length > 0}
			<div class="flex items-center justify-between border-t border-gray-200/50 bg-gray-50/50 p-3">
				<button
					onclick={markAllNotificationsAsRead}
					class="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-800"
				>
					<FontAwesomeIcon icon={faCheck} class="h-4 w-4" />
					Mark all read
				</button>
				<button
					onclick={clearAllNotifications}
					class="flex items-center gap-2 text-sm text-red-600 transition-colors hover:text-red-800"
				>
					<FontAwesomeIcon icon={faTrash} class="h-4 w-4" />
					Clear all
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
