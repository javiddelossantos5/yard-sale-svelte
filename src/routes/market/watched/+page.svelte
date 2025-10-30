<script lang="ts">
	import { onMount } from 'svelte';
	import { getWatchedItems, type MarketItem, getCurrentUser, type CurrentUser } from '$lib/api';
	import { goto } from '$app/navigation';
	import MarketItemCard from '$lib/MarketItemCard.svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import { faHeart } from '@fortawesome/free-solid-svg-icons';

	let items: MarketItem[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentUser = $state<CurrentUser | null>(null);
	let statusFilter = $state<'active' | 'sold' | 'hidden'>('active');

	async function loadItemsOnly() {
		if (!currentUser) return;
		
		loading = true;
		error = null;
		try {
			const result = await getWatchedItems({ status: statusFilter });
			items = result || [];
		} catch (e: any) {
			console.error('Failed to load watched items:', e);
			if (e?.message === 'Token expired' || e?.message?.includes('401') || e?.message?.includes('403')) {
				goto('/login');
				return;
			}
			error = e?.message || 'Failed to load watched items';
			items = [];
		} finally {
			loading = false;
		}
	}

	async function loadAll() {
		loading = true;
		error = null;
		try {
			// Load user first
			try {
				currentUser = await getCurrentUser();
			} catch (e) {
				console.error('Failed to load user:', e);
				currentUser = null;
				loading = false;
				goto('/login');
				return;
			}

			// Then load watched items
			if (currentUser) {
				const result = await getWatchedItems({ status: statusFilter });
				items = result || [];
			}
		} catch (e: any) {
			console.error('Failed to load watched items:', e);
			if (e?.message === 'Token expired' || e?.message?.includes('401') || e?.message?.includes('403')) {
				goto('/login');
				return;
			}
			error = e?.message || 'Failed to load watched items';
			items = [];
		} finally {
			loading = false;
		}
	}

	// Load on mount
	onMount(() => {
		loadAll();
	});

	// Reload items when filter changes (user is already loaded)
	$effect(() => {
		statusFilter; // Track this dependency
		if (currentUser) {
			loadItemsOnly();
		}
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
							<button
								onclick={() => goto('/market')}
								class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								<FontAwesomeIcon icon="arrow-left" class="h-4 w-4" />
							</button>
							<div>
								<h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
									Watched Items
								</h1>
								<p class="text-xs text-gray-600 dark:text-gray-300">Your saved items</p>
							</div>
						</div>
					</div>

					<div class="flex space-x-2">
						{#if currentUser}
							<button
								onclick={goToProfile}
								class="relative inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
								aria-label="View Profile"
							>
								<FontAwesomeIcon icon="user" class="mr-1.5 h-4 w-4" />
								Profile
								{#if $unreadMessageCount > 0}
									<span
										class="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white"
										>{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}</span
									>
								{/if}
							</button>
						{/if}
						<button
							onclick={handleLogout}
							aria-label="Logout"
							class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							<FontAwesomeIcon icon="arrow-right" class="h-4 w-4" />
						</button>
					</div>
				</div>

				<div class="hidden items-center justify-between sm:flex">
					<div class="flex items-center space-x-4">
						<button
							onclick={() => goto('/market')}
							class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							<FontAwesomeIcon icon="arrow-left" class="mr-2 h-4 w-4" />
							Back
						</button>
						<div>
							<h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
								Watched Items
							</h1>
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
								Items you're keeping an eye on
							</p>
						</div>
					</div>

					<div class="flex items-center space-x-3">
						{#if currentUser}
							<button
								onclick={goToProfile}
								class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
							class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
		<!-- Status Filter -->
		<div class="mb-6 flex items-center gap-2">
			<button
				onclick={() => (statusFilter = 'active')}
				class="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors {statusFilter === 'active'
					? 'bg-blue-600 text-white shadow-sm'
					: 'bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}"
			>
				<FontAwesomeIcon icon={faHeart} class="mr-2 h-4 w-4" />
				Active
			</button>
			<button
				onclick={() => (statusFilter = 'sold')}
				class="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors {statusFilter === 'sold'
					? 'bg-blue-600 text-white shadow-sm'
					: 'bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}"
			>
				Sold
			</button>
			<button
				onclick={() => (statusFilter = 'hidden')}
				class="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors {statusFilter === 'hidden'
					? 'bg-blue-600 text-white shadow-sm'
					: 'bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}"
			>
				Hidden
			</button>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-600 dark:text-gray-300">Loading watched items...</div>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{error}
			</div>
		{:else if items.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl bg-white/90 p-12 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/90 dark:ring-gray-700"
			>
				<div
					class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
				>
					<FontAwesomeIcon icon={faHeart} class="h-8 w-8 text-gray-400 dark:text-gray-500" />
				</div>
				<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
					No watched items yet
				</h3>
				<p class="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
					{statusFilter === 'active'
						? "You haven't watched any active items yet. Browse the marketplace and click the Watch button on items you're interested in."
						: `You don't have any ${statusFilter} watched items.`}
				</p>
				<button
					onclick={() => goto('/market')}
					class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
				>
					Browse Marketplace
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each items as item}
					<MarketItemCard
						{item}
						hideStatusBadge={
							(statusFilter === 'active' && item.status === 'active') ||
							(statusFilter === 'sold' && item.status === 'sold') ||
							(statusFilter === 'hidden' && item.status === 'hidden')
						}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>

