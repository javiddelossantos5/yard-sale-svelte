<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setupAuthFetch, isLoggedIn } from '$lib/auth';

	let { children } = $props();

	onMount(() => {
		setupAuthFetch();

		// Check authentication on every page load
		checkAuth();
	});

	// Reactive check for authentication
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

{@render children?.()}
