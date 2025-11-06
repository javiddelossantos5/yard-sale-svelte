<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setupAuthFetch, isLoggedIn } from '$lib/auth';
	import { darkMode, toggleDarkMode } from '$lib/darkMode';
	import NotificationCenter from '$lib/NotificationCenter.svelte';
	import { loadNotificationCounts } from '$lib/notifications';
	import { messagePoller } from '$lib/messagePoller'; // Import messagePoller (don't auto-start)
	import '$lib/fontawesome';

	let { children } = $props();

	// Client-only state to prevent hydration mismatch
	// Use browser check to ensure this is only true on client
	import { browser } from '$app/environment';
	let isClient = $state(browser);
	let isLoggedInClient = $state(false);

	onMount(() => {
		isClient = true;
		isLoggedInClient = isLoggedIn();

		// setupAuthFetch() is now called at module load time in auth.ts
		// but call it here too to ensure it's set up (idempotent)
		setupAuthFetch();

		// Check authentication on every page load
		checkAuth();

		// Load notification counts and start message polling if user is logged in and not on login page
		// Use setTimeout to avoid interfering with initial page load
		const currentPath = $page.url.pathname;
		if (isLoggedInClient && currentPath !== '/login') {
			setTimeout(() => {
				loadNotificationCounts().catch(() => {
					// Silently handle errors - token expiration will be handled by setupAuthFetch
				});
				// Start message polling only if logged in and not on login page
				messagePoller.startPolling().catch(() => {
					// Silently handle errors
				});
			}, 100);
		} else {
			// Stop message polling if not logged in or on login page
			messagePoller.stopPolling();
		}
	});

	// Reactive check for authentication (only when path changes)
	// Only run on client to avoid SSR hydration issues
	$effect(() => {
		// Only run on client after initial mount
		if (typeof window === 'undefined' || !isClient) return;

		isLoggedInClient = isLoggedIn();
		checkAuth();
	});

	function checkAuth() {
		// Only run on client
		if (typeof window === 'undefined') return;

		const currentPath = $page.url.pathname;
		const isLoginPage = currentPath === '/login';
		const isPublicPath =
			currentPath === '/' ||
			currentPath.startsWith('/market') ||
			currentPath.startsWith('/yard-sale') ||
			currentPath.startsWith('/login');

		// Allow public pages without forcing login
		if (!isLoggedInClient && !isPublicPath) {
			goto('/login');
		}

		// If logged in and on login page, redirect to home
		if (isLoggedInClient && isLoginPage) {
			goto('/');
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Top Right Controls -->
<div class="fixed top-4 right-4 z-50 flex items-center gap-3">
	<!-- Notification Center (only show if logged in) -->
	{#if isClient && isLoggedInClient}
		<div class="relative">
			<NotificationCenter />
		</div>
	{/if}

	<!-- Dark Mode Toggle -->
	<button
		onclick={toggleDarkMode}
		class="rounded-full bg-white/90 p-2 shadow-lg ring-1 ring-gray-900/5 transition-all hover:bg-white dark:bg-gray-800/90 dark:ring-gray-100/10 dark:hover:bg-gray-800"
		aria-label="Toggle dark mode"
	>
		{#if $darkMode}
			<!-- Sun icon for light mode -->
			<svg class="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
				/>
			</svg>
		{:else}
			<!-- Moon icon for dark mode -->
			<svg class="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
				/>
			</svg>
		{/if}
	</button>
</div>

{@render children?.()}
