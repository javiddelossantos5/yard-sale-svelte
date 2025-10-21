<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setupAuthFetch, isLoggedIn } from '$lib/auth';
	import { darkMode, toggleDarkMode } from '$lib/darkMode';
	import '$lib/fontawesome';

	let { children } = $props();

	onMount(() => {
		setupAuthFetch();

		// Check authentication on every page load
		checkAuth();
	});

	// Reactive check for authentication (only when path changes)
	$effect(() => {
		checkAuth();
	});

	function checkAuth() {
		const currentPath = $page.url.pathname;
		const isLoginPage = currentPath === '/login';

		// If not logged in and not on login page, redirect to login
		if (!isLoggedIn() && !isLoginPage) {
			goto('/login');
		}

		// If logged in and on login page, redirect to home
		if (isLoggedIn() && isLoginPage) {
			goto('/');
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Dark Mode Toggle -->
<div class="fixed top-4 right-4 z-50">
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
