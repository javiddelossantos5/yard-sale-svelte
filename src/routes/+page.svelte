<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getYardSales,
		getYardSalesByCity,
		getYardSalesByCategory,
		getCurrentUser,
		getYardSaleUnreadCount,
		type YardSale,
		type CurrentUser
	} from '$lib/api';
	import YardSaleCard from '$lib/YardSaleCard.svelte';
	import EditYardSaleModal from '$lib/EditYardSaleModal.svelte';
	import { logout } from '$lib/auth';
	import { getYardSaleStatus, isYardSaleActive, isYardSaleActiveOnDate } from '$lib/yardSaleUtils';
	import {
		isYardSaleVisited,
		syncVisitedStatus,
		migrateOldVisitedData
	} from '$lib/visitedYardSales';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faMessage,
		faBars,
		faStore,
		faUser,
		faArrowRightFromBracket,
		faFilter,
		faChevronDown,
		faChevronUp
	} from '@fortawesome/free-solid-svg-icons';
	import { unreadMessageCount } from '$lib/notifications';

	let mobileMenuOpen = $state(false);
	let filtersExpanded = $state(false);

	let yardSales = $state<YardSale[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	let selectedCity = $state('');
	let selectedDate = $state('');
	let selectedCategory = $state('');
	let statusFilter = $state('active');
	let zipCodeSearch = $state('');
	let currentUser = $state<CurrentUser | null>(null);
	let messageUnreadCount = $state(0);

	// Visited state tracker to trigger re-sorting when visited status changes
	let visitedStateTracker = $state(0);
	let isLoadingUser = $state(false);

	// Get unique cities for filters
	let cities = $state<string[]>([]);

	// Available categories
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

	// Create yard sale modal state
	let showCreateModal = $state(false);

	onMount(() => {
		// Load current user first, which will also load yard sales
		loadCurrentUser().catch((err) => {
			error = err instanceof Error ? err.message : 'Failed to load user data';
		});

		// Listen for visited status changes from detail pages
		const handleVisitedStatusChanged = () => {
			triggerVisitedStateUpdate();
		};

		window.addEventListener('visitedStatusChanged', handleVisitedStatusChanged);

		// Cleanup
		return () => {
			window.removeEventListener('visitedStatusChanged', handleVisitedStatusChanged);
		};
	});

	async function loadCurrentUser() {
		// Prevent multiple simultaneous calls
		if (isLoadingUser) {
			return;
		}

		isLoadingUser = true;

		try {
			currentUser = await getCurrentUser();

			// Migrate old localStorage data to user-specific keys
			migrateOldVisitedData();

			// Sync visited status with backend when user is loaded
			if (currentUser) {
				await syncVisitedStatus();
				// Load unread message count
				try {
					const result = await getYardSaleUnreadCount();
					messageUnreadCount = result.unread_count;
				} catch {
					// Ignore errors loading unread count
				}
			}

			// Load yard sales with visited status after user is loaded
			await loadYardSales(false);
		} catch (error) {
			console.warn('Failed to load current user:', error);
			currentUser = null;
			// Load yard sales without visited status on error
			await loadYardSales(false);
		} finally {
			isLoadingUser = false;
		}
	}

	async function loadYardSales(showLoading: boolean = true) {
		if (showLoading) {
			loading = true;
		}
		error = null;

		try {
			// Load yard sales with visited status if user is authenticated
			const includeVisited = !!currentUser;
			const allData = await getYardSales(includeVisited);
			yardSales = allData;

			// Extract unique cities from all data
			// Normalize city names to prevent duplicates (e.g., "Vernal" vs "vernal")
			const cityMap = new Map();
			allData.forEach((sale) => {
				const normalizedCity = sale.city.trim().toLowerCase();
				if (!cityMap.has(normalizedCity)) {
					cityMap.set(normalizedCity, sale.city.trim());
				}
			});
			cities = Array.from(cityMap.values()).sort();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load yard sales';
		} finally {
			loading = false;
		}
	}

	function handleCityChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedCity = target.value;
		// No need to call loadYardSales() - filtering is handled by $derived
	}

	function handleZipCodeChange(event: Event) {
		const target = event.target as HTMLInputElement;
		zipCodeSearch = target.value;
		// No need to call loadYardSales() - filtering is handled by $derived
	}

	function handleDateChange(event: Event) {
		const target = event.target as HTMLInputElement;
		selectedDate = target.value;
		// No need to call loadYardSales() - filtering is handled by $derived
	}

	function clearFilters() {
		selectedCity = '';
		selectedDate = '';
		selectedCategory = '';
		zipCodeSearch = '';
		searchTerm = '';
		statusFilter = 'active';
		// No need to call loadYardSales() - filtering is handled by $derived
	}

	function handleLogout() {
		logout();
		goto('/login');
	}

	// Function to trigger re-sorting when visited status changes
	async function triggerVisitedStateUpdate() {
		visitedStateTracker++;
		// Reload yard sales data to get updated visited status from backend
		await loadYardSales(false);
	}

	function handleCreateYardSale() {
		showCreateModal = true;
	}

	function handleCloseCreateModal() {
		showCreateModal = false;
	}

	function handleCreateSuccess() {
		// Reload yard sales to show the new one
		loadYardSales();
	}

	function goToProfile() {
		if (currentUser) {
			goto(`/profile/${currentUser.id}`);
		}
	}

	function goToMarket() {
		goto('/market');
	}

	// Filter yard sales by search term, city, zip code, and date
	let filteredYardSales = $derived(
		yardSales
			.filter((sale) => {
				// Search term filter
				const matchesSearch =
					!searchTerm ||
					sale.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
					sale.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
					sale.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
					sale.categories.some((cat) => cat.toLowerCase().includes(searchTerm.toLowerCase()));

				// City filter - case insensitive comparison
				const matchesCity =
					!selectedCity || sale.city.trim().toLowerCase() === selectedCity.toLowerCase();

				// Zip code filter
				const matchesZipCode = !zipCodeSearch || sale.zip_code.includes(zipCodeSearch);

				// Date filter - show yard sales that are active on the selected date
				const matchesDate = !selectedDate || isYardSaleActiveOnDate(sale, selectedDate);

				// Category filter - check if any of the yard sale's categories match the selected category
				const matchesCategory =
					!selectedCategory || sale.categories.some((cat) => cat === selectedCategory);

				// Status filter: filter by selected status option
				const status = getYardSaleStatus(sale);
				let matchesStatus = false;

				switch (statusFilter) {
					case 'active':
						// Active yard sales that haven't been visited
						const isVisited = isYardSaleVisited(sale.id, sale);
						matchesStatus = status === 'active' && !isVisited;
						break;
					case 'upcoming':
						matchesStatus = status === 'upcoming';
						break;
					case 'ended':
						matchesStatus = status === 'expired' || status === 'closed';
						break;
					case 'on_break':
						matchesStatus = status === 'on_break';
						break;
					case 'visited':
						// Only show visited yard sales
						matchesStatus = isYardSaleVisited(sale.id, sale);
						break;
					case 'all':
						matchesStatus = true;
						break;
					default:
						matchesStatus = status === 'active' && !isYardSaleVisited(sale.id, sale);
				}

				return (
					matchesSearch &&
					matchesCity &&
					matchesZipCode &&
					matchesDate &&
					matchesCategory &&
					matchesStatus
				);
			})
			.sort((a, b) => {
				// Access visitedStateTracker to make this derived state reactive to visited changes
				visitedStateTracker; // This makes the derived state reactive to visited changes

				// First, sort by visited status: unvisited first, visited last
				const aVisited = isYardSaleVisited(a.id);
				const bVisited = isYardSaleVisited(b.id);

				if (aVisited !== bVisited) {
					return aVisited ? 1 : -1; // unvisited first (return -1), visited last (return 1)
				}

				// If both have same visited status, sort by start date: closest starting date first
				// Sort by date using Mountain Time
				const dateA = new Date(a.start_date || '').toLocaleString('en-US', {
					timeZone: 'America/Denver'
				});
				const dateB = new Date(b.start_date || '').toLocaleString('en-US', {
					timeZone: 'America/Denver'
				});
				const dateAObj = new Date(dateA);
				const dateBObj = new Date(dateB);

				// If dates are the same, sort by title alphabetically
				if (dateAObj.getTime() === dateBObj.getTime()) {
					return a.title.localeCompare(b.title);
				}

				// Sort by start date (ascending - closest first)
				return dateAObj.getTime() - dateBObj.getTime();
			})
	);
</script>

<svelte:head>
	<title>Yard Sale Finder</title>
	<meta name="description" content="Find yard sales in your area" />
</svelte:head>

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
							<h1 class="text-lg font-semibold text-gray-900 dark:text-white">Yard Sale Finder</h1>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{filteredYardSales.length} found
							</p>
						</div>
					</div>

					<!-- Right side: Menu button and Post button -->
					<div class="flex items-center gap-2">
						<!-- Primary Action -->
						<button
							onclick={handleCreateYardSale}
							class="flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
						>
							<FontAwesomeIcon icon="plus" class="h-4 w-4" />
							<span class="xs:inline ml-1.5 hidden">Post</span>
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
									goToMarket();
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon
									icon={faStore}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
								Marketplace
							</button>
							{#if currentUser}
								<button
									onclick={() => {
										goto('/yard-sale/messages');
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
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Yard Sale Finder</h1>
							<div class="mt-0.5 flex items-center gap-3">
								<p class="text-sm text-gray-600 dark:text-gray-400">
									Discover amazing deals in your neighborhood
								</p>
								<span class="text-xs text-gray-500 dark:text-gray-500">
									• {filteredYardSales.length} found
								</span>
							</div>
						</div>
					</div>

					<!-- Right: Actions -->
					<div class="flex items-center gap-3">
						<!-- Secondary Actions -->
						<div class="flex items-center gap-2">
							<button
								onclick={goToMarket}
								class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								<FontAwesomeIcon icon={faStore} class="mr-2 h-4 w-4" />
								Marketplace
							</button>
							{#if currentUser}
								<button
									onclick={() => goto('/yard-sale/messages')}
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
							onclick={handleCreateYardSale}
							class="flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
						>
							<FontAwesomeIcon icon="plus" class="mr-2 h-4 w-4" />
							Post New Yard Sale
						</button>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Search and Filters -->
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
							placeholder="Search yard sales..."
							class="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:bg-gray-600 dark:focus:ring-blue-400"
						/>
					</div>
					<button
						onclick={() => (filtersExpanded = !filtersExpanded)}
						class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {selectedCity ||
						zipCodeSearch ||
						selectedDate ||
						selectedCategory ||
						statusFilter !== 'active'
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
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
						<!-- Zip Code Filter -->
						<div>
							<label
								for="zipCode"
								class="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400"
							>
								Zip Code
							</label>
							<input
								type="text"
								id="zipCode"
								bind:value={zipCodeSearch}
								oninput={handleZipCodeChange}
								placeholder="Zip code..."
								class="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:focus:bg-gray-600 dark:focus:ring-blue-400"
							/>
						</div>

						<!-- City Filter -->
						<div>
							<label
								for="city"
								class="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400"
							>
								City
							</label>
							<select
								id="city"
								bind:value={selectedCity}
								onchange={handleCityChange}
								class="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:focus:bg-gray-600 dark:focus:ring-blue-400"
							>
								<option value="">All Cities</option>
								{#each cities as city}
									<option value={city}>{city}</option>
								{/each}
							</select>
						</div>

						<!-- Date Filter -->
						<div>
							<label
								for="date"
								class="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400"
							>
								Date
							</label>
							<input
								id="date"
								type="date"
								bind:value={selectedDate}
								onchange={handleDateChange}
								class="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:focus:bg-gray-600 dark:focus:ring-blue-400"
							/>
						</div>

						<!-- Category Filter -->
						<div>
							<label
								for="category"
								class="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400"
							>
								Category
							</label>
							<select
								id="category"
								bind:value={selectedCategory}
								class="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:focus:bg-gray-600 dark:focus:ring-blue-400"
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
								class="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400"
							>
								Status
							</label>
							<select
								id="status"
								bind:value={statusFilter}
								class="w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:focus:bg-gray-600 dark:focus:ring-blue-400"
							>
								<option value="active">Active Now</option>
								<option value="upcoming">Upcoming</option>
								<option value="ended">Ended</option>
								<option value="on_break">On Break</option>
								<option value="visited">Already Visited</option>
								<option value="all">All Statuses</option>
							</select>
						</div>
					</div>

					<!-- Active Filters Indicator and Clear Button -->
					{#if selectedCity || zipCodeSearch || selectedDate || selectedCategory || statusFilter !== 'active'}
						<div
							class="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700"
						>
							<div class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
								<FontAwesomeIcon icon={faFilter} class="h-3 w-3" />
								<span>Filters applied</span>
							</div>
							<button
								onclick={clearFilters}
								class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									></path>
								</svg>
								Clear All
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading yard sales...</span>
			</div>
		{/if}

		<!-- Error State -->
		{#if error}
			<div
				class="mb-6 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
			>
				<div class="flex">
					<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800 dark:text-red-200">
							Error loading yard sales
						</h3>
						<p class="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Yard Sales Grid -->
		{#if !loading && !error}
			{#if filteredYardSales.length === 0}
				<div class="py-12 text-center">
					<svg
						class="mx-auto h-12 w-12 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						></path>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
						No yard sales found
					</h3>
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
						{searchTerm || selectedCity || zipCodeSearch || selectedDate
							? 'Try adjusting your search or filters.'
							: statusFilter === 'visited'
								? "You haven't visited any yard sales yet. Mark yard sales as visited to see them here."
								: statusFilter !== 'active'
									? 'No yard sales found with the selected status filter.'
									: 'No yard sales are currently active right now. Try changing the status filter to see upcoming, ended, or other yard sales.'}
					</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each filteredYardSales as yardSale (yardSale.id)}
						<YardSaleCard {yardSale} onVisitedChange={triggerVisitedStateUpdate} />
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<!-- Create Yard Sale Modal -->
	<EditYardSaleModal
		isOpen={showCreateModal}
		onClose={handleCloseCreateModal}
		onSuccess={handleCreateSuccess}
	/>
</div>
