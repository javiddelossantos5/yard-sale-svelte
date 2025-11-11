<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import '../app.css';
	import { setupAuthFetch, isLoggedIn } from '$lib/auth';
	import { darkMode, toggleDarkMode } from '$lib/darkMode';
	import NotificationCenter from '$lib/NotificationCenter.svelte';
	import { loadNotificationCounts } from '$lib/notifications';
	import { messagePoller } from '$lib/messagePoller'; // Import messagePoller (don't auto-start)
	import '$lib/fontawesome';

	let { children } = $props();

	// Client-only state to prevent hydration mismatch
	// Use browser check to ensure this is only true on client
	// Since SSR is disabled, we're always on client
	import { browser } from '$app/environment';
	let isClient = $state(typeof window !== 'undefined' ? true : browser);
	let isLoggedInClient = $state(false);
	let lastPath = $state<string>('');
	let isRedirecting = $state(false); // Prevent redirect loops

	onMount(() => {
		// Set isClient immediately to ensure rendering works
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
				// Still set up auth fetch and stop polling, but don't do auth checks
				setupAuthFetch();
				messagePoller.stopPolling();
				return;
			}
		}

		isLoggedInClient = isLoggedIn();
		lastPath = $page.url.pathname;

		// If we're on login page, reset redirect flag and don't check auth
		const currentPath = String($page.url.pathname);
		if (currentPath === '/login') {
			isRedirecting = false;
			// Still set up auth fetch and stop polling, but don't do auth checks
			setupAuthFetch();
			messagePoller.stopPolling();
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
	<link rel="icon" href="/icon2.png" type="image/png" />
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

</div>

<!-- Always render children - SSR is disabled so we're always on client -->
{@render children?.()}
