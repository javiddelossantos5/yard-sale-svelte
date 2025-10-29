<script lang="ts">
	import { onMount } from 'svelte';
	import { getMarketItems, type MarketItem, getCurrentUser, type CurrentUser } from '$lib/api';
	import { goto } from '$app/navigation';
	import MarketItemCard from '$lib/MarketItemCard.svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';

	let items: MarketItem[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentUser = $state<CurrentUser | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			getCurrentUser()
				.then((u) => (currentUser = u))
				.catch(() => (currentUser = null));
			items = await getMarketItems();
		} catch (e: any) {
			error = e?.message || 'Failed to load market items';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<header class="border-b bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="py-4 sm:py-6">
				<div class="block sm:hidden">
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-10 w-10 rounded-lg object-cover"
							/>
							<div>
								<h1 class="text-xl font-bold text-gray-900 dark:text-white">Marketplace</h1>
								<p class="text-xs text-gray-600 dark:text-gray-300">Discover individual items</p>
							</div>
						</div>
					</div>

					<div class="flex space-x-2">
						<button
							onclick={() => goto('/')}
							class="inline-flex flex-1 items-center justify-center rounded-lg border border-transparent bg-gray-900 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 focus:outline-none dark:bg-white dark:text-gray-900"
						>
							<FontAwesomeIcon icon="home" class="mr-1.5 h-4 w-4" />
							Home
						</button>
						{#if currentUser}
							<button
								onclick={goToProfile}
								class="relative inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
								aria-label="View Profile"
							>
								<FontAwesomeIcon icon="user" class="h-4 w-4" />
								{#if $unreadMessageCount > 0}
									<span
										class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white"
										>{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}</span
									>
								{/if}
							</button>
						{/if}
						<button
							onclick={handleLogout}
							aria-label="Logout"
							class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							<FontAwesomeIcon icon="arrow-right" class="h-4 w-4" />
						</button>
					</div>
				</div>

				<div class="hidden items-center justify-between sm:flex">
					<div class="flex items-center space-x-4">
						<img
							src="/icon2.png"
							alt="Yard Sale Finder Logo"
							class="h-12 w-12 rounded-lg object-cover"
						/>
						<div>
							<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Marketplace</h1>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								Discover individual items posted by the community
							</p>
						</div>
					</div>

					<div class="flex items-center space-x-4">
						<button
							onclick={() => goto('/')}
							class="inline-flex items-center rounded-md border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 focus:outline-none dark:bg-white dark:text-gray-900"
						>
							<FontAwesomeIcon icon="home" class="mr-2 h-4 w-4" />
							Home
						</button>
						{#if currentUser}
							<button
								onclick={goToProfile}
								class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								<FontAwesomeIcon icon="user" class="mr-2 h-4 w-4" />
								My Profile
								{#if $unreadMessageCount > 0}
									<span
										class="ml-2 rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white"
										>{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}</span
									>
								{/if}
							</button>
						{/if}
						<button
							onclick={handleLogout}
							class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							<FontAwesomeIcon icon="arrow-right" class="mr-2 h-4 w-4" />
							Logout
						</button>
					</div>
				</div>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="text-gray-600 dark:text-gray-300">Loading items...</div>
		{:else if error}
			<div class="text-red-600">{error}</div>
		{:else if items.length === 0}
			<div class="text-gray-600 dark:text-gray-300">No items yet.</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each items as item}
					<MarketItemCard {item} />
				{/each}
			</div>
		{/if}
	</div>
</div>
