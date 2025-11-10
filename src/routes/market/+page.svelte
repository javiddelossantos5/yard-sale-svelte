<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getMarketItems,
		type MarketItem,
		getCurrentUser,
		type CurrentUser,
		isAdmin
	} from '$lib/api';
	import { goto } from '$app/navigation';
	import MarketItemCard from '$lib/MarketItemCard.svelte';
	import CreateMarketItemModal from '$lib/CreateMarketItemModal.svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faHeart,
		faHome,
		faMessage,
		faUser,
		faFilter,
		faChevronDown,
		faChevronUp,
		faShieldAlt,
		faPlus
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import { getMarketItemUnreadCount, getYardSaleUnreadCount, getEventUnreadCount } from '$lib/api';
	import AppHeader from '$lib/AppHeader.svelte';

	let filtersExpanded = $state(false);

	let items: MarketItem[] = $state([]);
	let totalItems = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentUser = $state<CurrentUser | null>(null);
	let isCreateOpen = $state(false);
	let statusFilter = $state<'active' | 'sold' | 'hidden' | 'all'>('active');
	let messageUnreadCount = $state(0);
	let yardSaleMessageUnreadCount = $state(0);
	let marketMessageUnreadCount = $state(0);
	let eventMessageUnreadCount = $state(0);

	// Filter states
	let searchTerm = $state('');
	let selectedCategory = $state('');
	let minPrice = $state('');
	let maxPrice = $state('');
	let acceptsBestOfferFilter = $state(false);
	let priceReducedFilter = $state(false);
	let isFreeFilter = $state(false);
	let adminPostedFilter = $state(false);
	let cityFilter = $state('');
	let stateFilter = $state('');
	let zipCodeFilter = $state('');
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

	// US States for location filter
	const states = [
		'AL',
		'AK',
		'AZ',
		'AR',
		'CA',
		'CO',
		'CT',
		'DE',
		'FL',
		'GA',
		'HI',
		'ID',
		'IL',
		'IN',
		'IA',
		'KS',
		'KY',
		'LA',
		'ME',
		'MD',
		'MA',
		'MI',
		'MN',
		'MS',
		'MO',
		'MT',
		'NE',
		'NV',
		'NH',
		'NJ',
		'NM',
		'NY',
		'NC',
		'ND',
		'OH',
		'OK',
		'OR',
		'PA',
		'RI',
		'SC',
		'SD',
		'TN',
		'TX',
		'UT',
		'VT',
		'VA',
		'WA',
		'WV',
		'WI',
		'WY'
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
				is_free?: boolean;
				owner_is_admin?: boolean;
				city?: string;
				state?: string;
				zip_code?: string;
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

			// Free items filter
			if (isFreeFilter) {
				params.is_free = true;
			}

			// Admin posted filter
			if (adminPostedFilter) {
				params.owner_is_admin = true;
			}

			// Location filters
			if (cityFilter && cityFilter.trim()) {
				params.city = cityFilter.trim();
			}

			if (stateFilter && stateFilter.trim()) {
				params.state = stateFilter.trim();
			}

			if (zipCodeFilter && zipCodeFilter.trim()) {
				params.zip_code = zipCodeFilter.trim();
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

			// Sort items: active first, ended/sold last
			const sortedItems = [...response.items].sort((a, b) => {
				// Status priority: active = 0, pending = 1, hidden = 2, sold = 3
				const getStatusPriority = (status: string) => {
					if (status === 'active') return 0;
					if (status === 'pending') return 1;
					if (status === 'hidden') return 2;
					if (status === 'sold') return 3;
					return 4; // Unknown status goes last
				};

				const priorityA = getStatusPriority(a.status);
				const priorityB = getStatusPriority(b.status);

				if (priorityA !== priorityB) {
					return priorityA - priorityB; // Lower priority (active) comes first
				}

				// If same status, maintain original order (or sort by created_at desc)
				return 0;
			});

			items = sortedItems;
			totalItems = response.total;

			// Load unread message counts from both yard sales and marketplace
			try {
				const [yardSaleResult, marketResult] = await Promise.all([
					getYardSaleUnreadCount().catch(() => ({ unread_count: 0 })),
					getMarketItemUnreadCount().catch(() => ({ unread_count: 0 }))
				]);
				messageUnreadCount = (yardSaleResult.unread_count || 0) + (marketResult.unread_count || 0);
			} catch {
				// Ignore errors loading unread count
				messageUnreadCount = 0;
			}
		} catch (e: any) {
			console.error('[Market Page] Error loading items:', e);
			error = e?.message || 'Failed to load market items';
		} finally {
			loading = false;
		}
	}

	// Function to refresh message unread count
	async function refreshMessageCount() {
		if (!currentUser) return;

		try {
			const [yardSaleResult, marketResult, eventResult] = await Promise.all([
				getYardSaleUnreadCount().catch(() => ({ unread_count: 0 })),
				getMarketItemUnreadCount().catch(() => ({ unread_count: 0 })),
				getEventUnreadCount().catch(() => ({ unread_count: 0 }))
			]);
			yardSaleMessageUnreadCount = yardSaleResult.unread_count || 0;
			marketMessageUnreadCount = marketResult.unread_count || 0;
			eventMessageUnreadCount = eventResult.unread_count || 0;
			messageUnreadCount =
				yardSaleMessageUnreadCount + marketMessageUnreadCount + eventMessageUnreadCount;
		} catch {
			// Ignore errors loading unread count
		}
	}

	// Build mobile menu items
	let mobileMenuItems = $derived.by(() => {
		const items: Array<{
			label: string;
			icon: any;
			action: () => void;
			badge?: number;
		}> = [];
		if (currentUser && isAdmin(currentUser)) {
			items.push({
				label: 'Admin',
				icon: faShieldAlt,
				action: () => {
					void goto('/admin');
				}
			});
		}
		if (currentUser) {
			items.push({
				label: 'Watched Items',
				icon: faHeart,
				action: () => {
					void goto('/market/watched');
				}
			});
			items.push({
				label: 'Messages',
				icon: faMessage,
				action: () => {
					void goto('/messages?tab=market');
				},
				badge: messageUnreadCount > 0 ? messageUnreadCount : undefined
			});
		}
		return items;
	});

	onMount(() => {
		// Refresh message count when page becomes visible (user returns to tab)
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible' && currentUser) {
				refreshMessageCount();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		// Refresh message count when window regains focus
		const handleFocus = () => {
			if (currentUser) {
				refreshMessageCount();
			}
		};

		window.addEventListener('focus', handleFocus);

		// Cleanup
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('focus', handleFocus);
		};
	});

	// Load on mount and when filter changes
	$effect(() => {
		statusFilter; // Track this dependency
		searchTerm; // Track search term
		selectedCategory; // Track category
		minPrice; // Track min price
		maxPrice; // Track max price
		acceptsBestOfferFilter; // Track best offer filter
		priceReducedFilter; // Track price reduced filter
		isFreeFilter; // Track free items filter
		adminPostedFilter; // Track admin posted filter
		cityFilter; // Track city filter
		stateFilter; // Track state filter
		zipCodeFilter; // Track zip code filter
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
		isFreeFilter = false;
		adminPostedFilter = false;
		cityFilter = '';
		stateFilter = '';
		zipCodeFilter = '';
		statusFilter = 'active';
		sortByDisplay = 'created_at';
		sortOrder = 'desc';
		// load() will be triggered by $effect when these values change
	}

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout(); // logout() now handles redirect automatically
	}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<AppHeader
		title="Marketplace"
		subtitle="Discover individual items posted by the community"
		count={items.length}
		countLabel={items.length === 1 ? 'item' : 'items'}
		primaryAction={() => (isCreateOpen = true)}
		primaryActionLabel="New Item"
		primaryActionIcon={faPlus}
		{currentUser}
		{marketMessageUnreadCount}
		{yardSaleMessageUnreadCount}
		{eventMessageUnreadCount}
		{mobileMenuItems}
	/>

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
						isFreeFilter ||
						adminPostedFilter ||
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
						<!-- Status Filter - First on mobile, in row with Category on desktop -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<!-- Status Filter - First on mobile -->
							<div class="order-first sm:order-2">
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
									<option value="pending">Pending</option>
									<option value="sold">Sold</option>
									<option value="hidden">Hidden</option>
									<option value="all">All Items</option>
								</select>
							</div>

							<!-- Category Filter - Second on mobile -->
							<div class="order-2 sm:order-1">
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

						<!-- Row 2.5: Location Filters -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<!-- City Filter -->
							<div>
								<label
									for="cityFilter"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									City
								</label>
								<input
									type="text"
									id="cityFilter"
									bind:value={cityFilter}
									placeholder="Enter city"
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-400"
								/>
							</div>

							<!-- State Filter -->
							<div>
								<label
									for="stateFilter"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									State
								</label>
								<select
									id="stateFilter"
									bind:value={stateFilter}
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								>
									<option value="">All States</option>
									{#each states as stateOption}
										<option value={stateOption}>{stateOption}</option>
									{/each}
								</select>
							</div>

							<!-- Zip Code Filter -->
							<div>
								<label
									for="zipCodeFilter"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Zip Code
								</label>
								<input
									type="text"
									id="zipCodeFilter"
									bind:value={zipCodeFilter}
									placeholder="Enter zip code"
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-400"
								/>
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

							<!-- Free Items Filter -->
							<label
								for="isFree"
								class="flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-green-500 dark:hover:bg-gray-600"
							>
								<input
									type="checkbox"
									id="isFree"
									bind:checked={isFreeFilter}
									class="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
								/>
								<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
									Free Items
								</span>
							</label>

							<!-- Admin Posted Filter -->
							<label
								for="adminPosted"
								class="flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-purple-500 dark:hover:bg-gray-600"
							>
								<input
									type="checkbox"
									id="adminPosted"
									bind:checked={adminPostedFilter}
									class="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700"
								/>
								<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
									Admin Posted
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
					{#if searchTerm || selectedCategory || minPrice || maxPrice || acceptsBestOfferFilter || priceReducedFilter || isFreeFilter || adminPostedFilter || cityFilter || stateFilter || zipCodeFilter || statusFilter !== 'active' || sortByDisplay !== 'created_at' || sortOrder !== 'desc'}
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
