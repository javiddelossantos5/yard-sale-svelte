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
	let lastPath = $state<string>('');
	let isRedirecting = $state(false); // Prevent redirect loops

	onMount(() => {
		isClient = true;

		// Check if we're in the middle of a logout redirect
		if (
			typeof sessionStorage !== 'undefined' &&
			sessionStorage.getItem('logout_redirecting') === 'true'
		) {
			sessionStorage.removeItem('logout_redirecting');
			// If we're on login page, we're done - don't check auth
			const currentPath = String($page.url.pathname);
			if (currentPath === '/login') {
				isLoggedInClient = false;
				isRedirecting = false;
				return;
			}
		}

		isLoggedInClient = isLoggedIn();
		lastPath = $page.url.pathname;

		// If we're on login page, reset redirect flag and don't check auth
		const currentPath = String($page.url.pathname);
		if (currentPath === '/login') {
			isRedirecting = false;
			return; // Exit early - don't run any auth checks
		}

		// setupAuthFetch() is now called at module load time in auth.ts
		// but call it here too to ensure it's set up (idempotent)
		setupAuthFetch();

		// Check authentication on every page load (but not on login page)
		checkAuth();

		// Load notification counts and start message polling if user is logged in and not on login page
		// Use setTimeout to avoid interfering with initial page load
		const currentPathForPolling = String($page.url.pathname);
		if (isLoggedInClient && currentPathForPolling !== '/login') {
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
	// Always create $effect but guard it to prevent SSR execution
	$effect(() => {
		// Only run on client - this guard prevents SSR execution
		if (typeof window === 'undefined' || !browser || !isClient) return;

		// Don't run if we're redirecting
		if (isRedirecting) return;

		// Don't run if we're in the middle of a logout redirect
		if (
			typeof sessionStorage !== 'undefined' &&
			sessionStorage.getItem('logout_redirecting') === 'true'
		) {
			return;
		}

		// Track page path to react to changes
		const currentPath = String($page.url.pathname);

		// If we're on login page, update login status but don't check auth - and clear any redirect flags
		if (currentPath === '/login') {
			isLoggedInClient = isLoggedIn();
			isRedirecting = false; // Reset redirect flag when on login page
			// Clear logout redirect flag
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.removeItem('logout_redirecting');
			}
			// Don't run checkAuth on login page - exit early
			return;
		}

		// Only update if path actually changed
		if (currentPath !== lastPath) {
			lastPath = currentPath;
			isLoggedInClient = isLoggedIn();
			// Only check auth if we're not on login page
			if (currentPath !== '/login') {
				checkAuth();
			}
		}
	});

	function checkAuth() {
		// Only run on client
		if (typeof window === 'undefined') return;

		// Prevent redirect loops
		if (isRedirecting) return;

		// Don't redirect if we're in the middle of a logout redirect
		if (
			typeof sessionStorage !== 'undefined' &&
			sessionStorage.getItem('logout_redirecting') === 'true'
		) {
			return;
		}

		const currentPath = $page.url.pathname;
		const isLoginPage = currentPath === '/login';

		// If we're already on login page, don't redirect
		if (isLoginPage) {
			isLoggedInClient = isLoggedIn();
			return;
		}

		// Don't force redirects based on token - let pages handle their own auth
		// Only update login status
		isLoggedInClient = isLoggedIn();

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
