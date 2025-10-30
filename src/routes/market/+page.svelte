<script lang="ts">
	import { onMount } from 'svelte';
	import { getMarketItems, type MarketItem, getCurrentUser, type CurrentUser } from '$lib/api';
	import { goto } from '$app/navigation';
	import MarketItemCard from '$lib/MarketItemCard.svelte';
	import CreateMarketItemModal from '$lib/CreateMarketItemModal.svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faHeart, faHome, faMessage } from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import { getMarketItemUnreadCount } from '$lib/api';

	let items: MarketItem[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentUser = $state<CurrentUser | null>(null);
	let isCreateOpen = $state(false);
	let statusFilter = $state<'active' | 'sold' | 'hidden' | 'all'>('active');
	let messageUnreadCount = $state(0);

	async function load() {
		loading = true;
		error = null;
		try {
			getCurrentUser()
				.then((u) => (currentUser = u))
				.catch(() => (currentUser = null));
			const params: { status?: 'active' | 'sold' | 'hidden' } = {};
			if (statusFilter !== 'all') {
				params.status = statusFilter;
			}
			items = await getMarketItems(params);
			
			// Load unread message count
			try {
				const unread = await getMarketItemUnreadCount();
				messageUnreadCount = unread.unread_count;
			} catch {
				// Ignore errors loading unread count
			}
		} catch (e: any) {
			error = e?.message || 'Failed to load market items';
		} finally {
			loading = false;
		}
	}

	// Load on mount and when filter changes
	$effect(() => {
		statusFilter; // Track this dependency
		load();
	});

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout();
		goto('/login');
	}

	function isFilterActive(filter: 'all' | 'active' | 'sold' | 'hidden'): boolean {
		return statusFilter === filter;
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

					<div class="flex flex-wrap gap-2">
						<button
							onclick={() => (isCreateOpen = true)}
							class="inline-flex flex-1 items-center justify-center rounded-xl border border-transparent bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none active:scale-95"
						>
							<FontAwesomeIcon icon="plus" class="mr-1.5 h-4 w-4" />
							New Item
						</button>
						{#if currentUser}
							<button
								onclick={() => goto('/market/watched')}
								class="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								<FontAwesomeIcon icon={faHeart} class="mr-1.5 h-4 w-4" />
								Watched
							</button>
							<button
								onclick={() => goto('/market/messages')}
								class="relative inline-flex flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								<FontAwesomeIcon icon={faMessage} class="mr-1.5 h-4 w-4" />
								Messages
								{#if messageUnreadCount > 0}
									<span
										class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white"
										>{messageUnreadCount > 99 ? '99+' : messageUnreadCount}</span
									>
								{/if}
							</button>
						{/if}
						<button
							onclick={() => goto('/')}
							class="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							<FontAwesomeIcon icon={faHome} class="mr-1.5 h-4 w-4" />
							Home
						</button>
						{#if currentUser}
							<button
								onclick={goToProfile}
								class="relative inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
							class="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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

					<div class="flex items-center space-x-3">
						<button
							onclick={() => (isCreateOpen = true)}
							class="inline-flex items-center rounded-xl border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95"
						>
							<FontAwesomeIcon icon="plus" class="mr-2 h-4 w-4" />
							New Item
						</button>
						{#if currentUser}
							<button
								onclick={() => goto('/market/watched')}
								class="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								<FontAwesomeIcon icon={faHeart} class="mr-2 h-4 w-4" />
								Watched
							</button>
							<button
								onclick={() => goto('/market/messages')}
								class="relative inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
								Messages
								{#if messageUnreadCount > 0}
									<span
										class="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white"
										>{messageUnreadCount > 99 ? '99+' : messageUnreadCount}</span
									>
								{/if}
							</button>
						{/if}
						<button
							onclick={() => goto('/')}
							class="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							<FontAwesomeIcon icon={faHome} class="mr-2 h-4 w-4" />
							Home
						</button>
						{#if currentUser}
							<button
								onclick={goToProfile}
								class="relative inline-flex items-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
							class="inline-flex items-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
		<div class="mb-6 flex flex-wrap items-center gap-2">
			<button
				onclick={() => (statusFilter = 'active')}
				class="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 {isFilterActive('active')
					? 'bg-green-600 text-white shadow-md ring-2 ring-green-500/50'
					: 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600'}"
			>
				Available
			</button>
			<button
				onclick={() => (statusFilter = 'sold')}
				class="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 {isFilterActive('sold')
					? 'bg-red-600 text-white shadow-md ring-2 ring-red-500/50'
					: 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600'}"
			>
				Sold
			</button>
			<button
				onclick={() => (statusFilter = 'hidden')}
				class="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 {isFilterActive('hidden')
					? 'bg-gray-600 text-white shadow-md ring-2 ring-gray-500/50'
					: 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600'}"
			>
				Hidden
			</button>
			<button
				onclick={() => (statusFilter = 'all')}
				class="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 {isFilterActive('all')
					? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/50'
					: 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600'}"
			>
				All Items
			</button>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-600 dark:text-gray-300">Loading items...</div>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{error}
			</div>
		{:else if items.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl bg-white/90 p-12 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/90 dark:ring-gray-700"
			>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					{statusFilter === 'all'
						? 'No items available yet.'
						: `No ${statusFilter === 'active' ? 'available' : statusFilter} items found.`}
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each items as item}
					<MarketItemCard {item} />
				{/each}
			</div>
		{/if}
	</div>
	<CreateMarketItemModal
		isOpen={isCreateOpen}
		onClose={() => (isCreateOpen = false)}
		onSuccess={() => load()}
	/>
</div>
