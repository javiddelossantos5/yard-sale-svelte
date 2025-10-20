<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ensureDevLogin, setupAuthFetch } from '$lib/auth';

	let { children } = $props();

	if (import.meta.env.DEV) {
		setupAuthFetch();
		$effect.root(() => {
			ensureDevLogin('javiddelossantos', 'Password');
		});
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
