<script lang="ts">
	import { onMount } from 'svelte';
	import { getMarketItems, type MarketItem, getCurrentUser, type CurrentUser } from '$lib/api';
	import { goto } from '$app/navigation';
	import MarketItemCard from '$lib/MarketItemCard.svelte';
	import CreateMarketItemModal from '$lib/CreateMarketItemModal.svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faHeart,
		faHome,
		faMessage,
		faBars,
		faUser,
		faArrowRightFromBracket
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import { getMarketItemUnreadCount } from '$lib/api';

	let mobileMenuOpen = $state(false);

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
	<!-- Header -->
	<header
		class="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<!-- Mobile Layout -->
			<div class="block sm:hidden">
				<div class="flex h-16 items-center justify-between">
					<!-- Logo and Title -->
					<div class="flex items-center space-x-3">
						<img
							src="/icon2.png"
							alt="Yard Sale Finder Logo"
							class="h-8 w-8 rounded-lg object-cover"
						/>
						<div>
							<h1 class="text-lg font-semibold text-gray-900 dark:text-white">Marketplace</h1>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{items.length} {items.length === 1 ? 'item' : 'items'}
							</p>
						</div>
					</div>

					<!-- Right side: Menu button and Post button -->
					<div class="flex items-center gap-2">
						<!-- Primary Action -->
						<button
							onclick={() => (isCreateOpen = true)}
							class="flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
						>
							<FontAwesomeIcon icon="plus" class="h-4 w-4" />
							<span class="xs:inline ml-1.5 hidden">New</span>
						</button>

						<!-- Menu Button -->
						<button
							onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
							class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
							aria-label="Menu"
						>
							<FontAwesomeIcon icon={faBars} class="h-5 w-5 text-gray-700 dark:text-gray-300" />
						</button>
					</div>
				</div>

				<!-- Mobile Menu Dropdown -->
				{#if mobileMenuOpen}
					<div class="border-t border-gray-200 pt-4 pb-4 dark:border-gray-800">
						<div class="space-y-1">
							<button
								onclick={() => {
									goto('/');
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon icon={faHome} class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Home
							</button>
							{#if currentUser}
								<button
									onclick={() => {
										goto('/market/watched');
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faHeart}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									Watched Items
								</button>
								<button
									onclick={() => {
										goto('/market/messages');
										mobileMenuOpen = false;
									}}
									class="relative flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faMessage}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									Messages
									{#if messageUnreadCount > 0}
										<span
											class="ml-auto rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-semibold text-white"
										>
											{messageUnreadCount > 99 ? '99+' : messageUnreadCount}
										</span>
									{/if}
								</button>
								<button
									onclick={() => {
										goToProfile();
										mobileMenuOpen = false;
									}}
									class="relative flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faUser}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									My Profile
									{#if $unreadMessageCount > 0}
										<span
											class="ml-auto rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-semibold text-white"
										>
											{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
										</span>
									{/if}
								</button>
							{/if}
							<button
								onclick={() => {
									handleLogout();
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
							>
								<FontAwesomeIcon icon={faArrowRightFromBracket} class="mr-3 h-5 w-5" />
								Logout
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Desktop Layout -->
			<div class="hidden sm:block">
				<div class="flex h-20 items-center justify-between">
					<!-- Left: Logo and Title -->
					<div class="flex items-center space-x-4">
						<img
							src="/icon2.png"
							alt="Yard Sale Finder Logo"
							class="h-12 w-12 rounded-xl object-cover shadow-sm"
						/>
						<div>
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Marketplace</h1>
							<div class="mt-0.5 flex items-center gap-3">
								<p class="text-sm text-gray-600 dark:text-gray-400">
									Discover individual items posted by the community
								</p>
								<span class="text-xs text-gray-500 dark:text-gray-500">
									• {items.length} {items.length === 1 ? 'item' : 'items'}
								</span>
							</div>
						</div>
					</div>

					<!-- Right: Actions -->
					<div class="flex items-center gap-3">
						<!-- Secondary Actions -->
						<div class="flex items-center gap-2">
							<button
								onclick={() => goto('/')}
								class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								<FontAwesomeIcon icon={faHome} class="mr-2 h-4 w-4" />
								Home
							</button>
							{#if currentUser}
								<button
									onclick={() => goto('/market/watched')}
									class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								>
									<FontAwesomeIcon icon={faHeart} class="mr-2 h-4 w-4" />
									Watched
								</button>
								<button
									onclick={() => goto('/market/messages')}
									class="relative flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								>
									<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
									Messages
									{#if messageUnreadCount > 0}
										<span
											class="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white"
										>
											{messageUnreadCount > 99 ? '99+' : messageUnreadCount}
										</span>
									{/if}
								</button>
								<button
									onclick={goToProfile}
									class="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
									aria-label="My Profile"
								>
									<FontAwesomeIcon icon={faUser} class="h-5 w-5 text-gray-700 dark:text-gray-200" />
									{#if $unreadMessageCount > 0}
										<span
											class="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-xs font-semibold text-white dark:border-gray-900"
										>
											{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
										</span>
									{/if}
								</button>
							{/if}
							<button
								onclick={handleLogout}
								class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								aria-label="Logout"
							>
								<FontAwesomeIcon icon={faArrowRightFromBracket} class="h-5 w-5" />
							</button>
						</div>

						<!-- Primary Action -->
						<button
							onclick={() => (isCreateOpen = true)}
							class="flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
						>
							<FontAwesomeIcon icon="plus" class="mr-2 h-4 w-4" />
							New Item
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
	<CreateMarketItemModal
		isOpen={isCreateOpen}
		onClose={() => (isCreateOpen = false)}
		onSuccess={() => load()}
	/>
</div>
