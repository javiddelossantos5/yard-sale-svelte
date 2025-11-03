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
		faArrowRightFromBracket,
		faFilter,
		faChevronDown,
		faChevronUp
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import { getMarketItemUnreadCount } from '$lib/api';

	let mobileMenuOpen = $state(false);
	let filtersExpanded = $state(false);

	let items: MarketItem[] = $state([]);
	let totalItems = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentUser = $state<CurrentUser | null>(null);
	let isCreateOpen = $state(false);
	let statusFilter = $state<'active' | 'sold' | 'hidden' | 'all'>('active');
	let messageUnreadCount = $state(0);

	// Filter states
	let searchTerm = $state('');
	let selectedCategory = $state('');
	let minPrice = $state('');
	let maxPrice = $state('');
	let acceptsBestOfferFilter = $state(false);
	let priceReducedFilter = $state(false);
	let sortBy = $state<'price' | 'created_at' | 'price_reduction_percentage' | 'name'>('created_at');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	let sortByDisplay = $state<
		'created_at' | 'price_asc' | 'price_desc' | 'price_reduction_percentage' | 'name'
	>('created_at');

	// Available categories (same as yard sales)
	const categories = [
		'Furniture',
		'Electronics',
		'Clothing',
		'Books',
		'Toys',
		'Kitchen Items',
		'Tools',
		'Sports Equipment',
		'Art & Decor',
		'Garden Items',
		'Antiques',
		'Collectibles',
		'Jewelry',
		'Home Improvement',
		'Automotive',
		'Other'
	];

	async function load() {
		loading = true;
		error = null;
		try {
			getCurrentUser()
				.then((u) => (currentUser = u))
				.catch(() => (currentUser = null));

			// Build params for API call
			const params: {
				search?: string;
				category?: string;
				min_price?: number;
				max_price?: number;
				status?: 'active' | 'sold' | 'hidden' | 'all';
				accepts_best_offer?: boolean;
				price_reduced?: boolean;
				sort_by?: 'price' | 'created_at' | 'price_reduction_percentage' | 'name';
				sort_order?: 'asc' | 'desc';
			} = {};

			// Status filter
			if (statusFilter) {
				params.status = statusFilter;
			}

			// Search term (now searches both name and description on backend)
			if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
				params.search = searchTerm.trim();
			}

			// Category filter
			if (selectedCategory) {
				params.category = selectedCategory;
			}

			// Price filters - convert to string first to handle number inputs
			const minPriceStr = String(minPrice || '').trim();
			if (minPriceStr) {
				const min = parseFloat(minPriceStr);
				if (!isNaN(min) && min >= 0) {
					params.min_price = min;
				}
			}

			const maxPriceStr = String(maxPrice || '').trim();
			if (maxPriceStr) {
				const max = parseFloat(maxPriceStr);
				if (!isNaN(max) && max >= 0) {
					params.max_price = max;
				}
			}

			// Accepts Best Offer filter (now supported alongside other filters by backend)
			if (acceptsBestOfferFilter) {
				params.accepts_best_offer = true;
			}

			// Price Reduced filter
			if (priceReducedFilter) {
				params.price_reduced = true;
			}

			// Sorting
			// Handle sort_by and sort_order based on sortByDisplay
			if (sortByDisplay === 'price_asc') {
				params.sort_by = 'price';
				params.sort_order = 'asc';
			} else if (sortByDisplay === 'price_desc') {
				params.sort_by = 'price';
				params.sort_order = 'desc';
			} else {
				params.sort_by = sortByDisplay;
				params.sort_order = sortOrder;
			}

			// Fetch items with new paginated API
			const response = await getMarketItems(params);
			items = response.items;
			totalItems = response.total;

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
		searchTerm; // Track search term
		selectedCategory; // Track category
		minPrice; // Track min price
		maxPrice; // Track max price
		acceptsBestOfferFilter; // Track best offer filter
		priceReducedFilter; // Track price reduced filter
		sortByDisplay; // Track sort by display
		sortOrder; // Track sort order
		load();
	});

	function clearFilters() {
		searchTerm = '';
		selectedCategory = '';
		minPrice = '';
		maxPrice = '';
		acceptsBestOfferFilter = false;
		priceReducedFilter = false;
		statusFilter = 'active';
		sortByDisplay = 'created_at';
		sortOrder = 'desc';
		// load() will be triggered by $effect when these values change
	}

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout();
		goto('/login');
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
								{items.length}
								{items.length === 1 ? 'item' : 'items'}
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
								<FontAwesomeIcon
									icon={faHome}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
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
										goto('/messages?tab=market');
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
									• {items.length}
									{items.length === 1 ? 'item' : 'items'}
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
									onclick={() => goto('/messages?tab=market')}
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
		<!-- Search and Filters -->
		<div
			class="mb-6 rounded-xl bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:bg-gray-800/80 dark:ring-1 dark:ring-gray-700"
		>
			<!-- Search Bar - Always Visible -->
			<div class="mb-4">
				<div class="flex items-center gap-3">
					<div class="flex-1">
						<input
							id="search"
							type="text"
							bind:value={searchTerm}
							placeholder="Search items..."
							class="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:bg-gray-600 dark:focus:ring-blue-400"
						/>
					</div>
					<button
						onclick={() => (filtersExpanded = !filtersExpanded)}
						class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {searchTerm ||
						selectedCategory ||
						minPrice ||
						maxPrice ||
						acceptsBestOfferFilter ||
						priceReducedFilter ||
						statusFilter !== 'active' ||
						sortByDisplay !== 'created_at' ||
						sortOrder !== 'desc'
							? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
							: ''}"
					>
						<FontAwesomeIcon icon={faFilter} class="h-4 w-4" />
						<span class="hidden sm:inline">Filters</span>
						<FontAwesomeIcon icon={filtersExpanded ? faChevronUp : faChevronDown} class="h-3 w-3" />
					</button>
				</div>
			</div>

			<!-- Filter Options - Collapsible -->
			{#if filtersExpanded}
				<div class="border-t border-gray-200 pt-4 dark:border-gray-700">
					<div class="space-y-4">
						<!-- Row 1: Category and Status -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<!-- Category Filter -->
							<div>
								<label
									for="category"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Category
								</label>
								<select
									id="category"
									bind:value={selectedCategory}
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								>
									<option value="">All Categories</option>
									{#each categories as category}
										<option value={category}>{category}</option>
									{/each}
								</select>
							</div>

							<!-- Status Filter -->
							<div>
								<label
									for="status"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Status
								</label>
								<select
									id="status"
									bind:value={statusFilter}
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								>
									<option value="active">Available</option>
									<option value="sold">Sold</option>
									<option value="hidden">Hidden</option>
									<option value="all">All Items</option>
								</select>
							</div>
						</div>

						<!-- Row 2: Price Range -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<!-- Min Price Filter -->
							<div>
								<label
									for="minPrice"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Min Price
								</label>
								<div class="relative">
									<span
										class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-500 dark:text-gray-400"
									>
										$
									</span>
									<input
										type="number"
										id="minPrice"
										bind:value={minPrice}
										min="0"
										step="0.01"
										placeholder="0.00"
										class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-4 pl-7 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-400"
									/>
								</div>
							</div>

							<!-- Max Price Filter -->
							<div>
								<label
									for="maxPrice"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Max Price
								</label>
								<div class="relative">
									<span
										class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-500 dark:text-gray-400"
									>
										$
									</span>
									<input
										type="number"
										id="maxPrice"
										bind:value={maxPrice}
										min="0"
										step="0.01"
										placeholder="9999.00"
										class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-4 pl-7 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-400"
									/>
								</div>
							</div>
						</div>

						<!-- Row 3: Checkboxes -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<!-- Accepts Best Offer Filter -->
							<label
								for="bestOffer"
								class="flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-blue-500 dark:hover:bg-gray-600"
							>
								<input
									type="checkbox"
									id="bestOffer"
									bind:checked={acceptsBestOfferFilter}
									class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
								/>
								<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
									Accepts Best Offer
								</span>
							</label>

							<!-- Price Reduced Filter -->
							<label
								for="priceReduced"
								class="flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-blue-500 dark:hover:bg-gray-600"
							>
								<input
									type="checkbox"
									id="priceReduced"
									bind:checked={priceReducedFilter}
									class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
								/>
								<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
									Price Reduced
								</span>
							</label>
						</div>

						<!-- Row 4: Sort Options -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<!-- Sort By Filter -->
							<div>
								<label
									for="sortBy"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Sort By
								</label>
								<select
									id="sortBy"
									bind:value={sortByDisplay}
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								>
									<option value="created_at">Newest First</option>
									<option value="price_asc">Price: Low to High</option>
									<option value="price_desc">Price: High to Low</option>
									<option value="price_reduction_percentage">Best Deals</option>
									<option value="name">Name: A-Z</option>
								</select>
							</div>

							<!-- Sort Order Filter -->
							<div>
								<label
									for="sortOrder"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Sort Order
								</label>
								<select
									id="sortOrder"
									bind:value={sortOrder}
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								>
									<option value="desc">Descending</option>
									<option value="asc">Ascending</option>
								</select>
							</div>
						</div>
					</div>

					<!-- Active Filters Indicator and Clear Button -->
					{#if searchTerm || selectedCategory || minPrice || maxPrice || acceptsBestOfferFilter || priceReducedFilter || statusFilter !== 'active' || sortByDisplay !== 'created_at' || sortOrder !== 'desc'}
						<div
							class="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700"
						>
							<div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
								<FontAwesomeIcon icon={faFilter} class="h-4 w-4" />
								<span>Filters applied</span>
							</div>
							<button
								onclick={clearFilters}
								class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									></path>
								</svg>
								Clear All Filters
							</button>
						</div>
					{/if}
				</div>
			{/if}
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
						hideStatusBadge={(statusFilter === 'active' && item.status === 'active') ||
							(statusFilter === 'sold' && item.status === 'sold') ||
							(statusFilter === 'hidden' && item.status === 'hidden')}
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
