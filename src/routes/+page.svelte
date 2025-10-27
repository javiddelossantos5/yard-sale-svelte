<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getYardSales,
		getYardSalesByCity,
		getYardSalesByCategory,
		getCurrentUser,
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
	import { unreadMessageCount } from '$lib/notifications';

	let yardSales = $state<YardSale[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	let selectedCity = $state('');
	let selectedDate = $state('');
	let statusFilter = $state('active');
	let zipCodeSearch = $state('');
	let currentUser = $state<CurrentUser | null>(null);

	// Visited state tracker to trigger re-sorting when visited status changes
	let visitedStateTracker = $state(0);
	let isLoadingUser = $state(false);

	// Get unique cities for filters
	let cities = $state<string[]>([]);

	// Create yard sale modal state
	let showCreateModal = $state(false);

	onMount(async () => {
		// Load current user first, which will also load yard sales
		try {
			await loadCurrentUser();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load user data';
		}

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
			console.log('User loading already in progress, skipping');
			return;
		}

		isLoadingUser = true;

		try {
			console.log('Loading current user...');
			currentUser = await getCurrentUser();
			console.log('Current user loaded:', currentUser?.username);

			// Migrate old localStorage data to user-specific keys
			migrateOldVisitedData();

			// Sync visited status with backend when user is loaded
			if (currentUser) {
				console.log('Syncing visited status...');
				await syncVisitedStatus();
				console.log('Visited status synced');
			}

			// Load yard sales with visited status after user is loaded
			console.log('Loading yard sales with visited status...');
			await loadYardSales(false);
			console.log('Yard sales loaded');
		} catch (error) {
			console.warn('Failed to load current user:', error);
			currentUser = null;
			// Load yard sales without visited status on error
			console.log('Loading yard sales without visited status...');
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
			console.log(
				`loadYardSales called with currentUser=${!!currentUser}, includeVisited=${includeVisited}`
			);
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

				return matchesSearch && matchesCity && matchesZipCode && matchesDate && matchesStatus;
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
	<header class="border-b bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="py-4 sm:py-6">
				<!-- Mobile Layout -->
				<div class="block sm:hidden">
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-10 w-10 rounded-lg object-cover"
							/>
							<div>
								<h1 class="text-xl font-bold text-gray-900 dark:text-white">Yard Sale Finder</h1>
								<p class="text-xs text-gray-600 dark:text-gray-300">Discover amazing deals</p>
							</div>
						</div>
					</div>

					<div class="mb-3 flex items-center justify-between">
						<div class="text-sm font-medium text-gray-700 dark:text-gray-300">
							{filteredYardSales.length} yard sales found
						</div>
					</div>

					<div class="flex space-x-2">
						<button
							onclick={handleCreateYardSale}
							class="inline-flex flex-1 items-center justify-center rounded-lg border border-transparent bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
						>
							<FontAwesomeIcon icon="plus" class="mr-1.5 h-4 w-4" />
							Post New Sale
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
									>
										{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
									</span>
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

				<!-- Desktop Layout -->
				<div class="hidden items-center justify-between sm:flex">
					<div class="flex items-center space-x-4">
						<img
							src="/icon2.png"
							alt="Yard Sale Finder Logo"
							class="h-12 w-12 rounded-lg object-cover"
						/>
						<div>
							<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Yard Sale Finder</h1>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								Discover amazing deals in your neighborhood
							</p>
						</div>
					</div>

					<div class="flex items-center space-x-4">
						<div class="text-sm text-gray-500 dark:text-gray-400">
							{filteredYardSales.length} yard sales found
						</div>
						<button
							onclick={handleCreateYardSale}
							class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
						>
							<FontAwesomeIcon icon="plus" class="mr-2 h-4 w-4" />
							Post New Yard Sale
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
									>
										{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
									</span>
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

	<!-- Search and Filters -->
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<div
			class="mb-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
		>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
				<!-- Search -->
				<div class="md:col-span-2">
					<label
						for="search"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Search
					</label>
					<input
						id="search"
						type="text"
						bind:value={searchTerm}
						placeholder="Search by title, description, city, or category..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
					/>
				</div>

				<!-- Zip Code Filter -->
				<div>
					<label
						for="zipCode"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Zip Code
					</label>
					<input
						type="text"
						id="zipCode"
						bind:value={zipCodeSearch}
						oninput={handleZipCodeChange}
						placeholder="Enter zip code..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
					/>
				</div>

				<!-- City Filter -->
				<div>
					<label for="city" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						City
					</label>
					<select
						id="city"
						bind:value={selectedCity}
						onchange={handleCityChange}
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
					>
						<option value="">All Cities</option>
						{#each cities as city}
							<option value={city}>{city}</option>
						{/each}
					</select>
				</div>

				<!-- Date Filter -->
				<div>
					<label for="date" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Date
					</label>
					<input
						id="date"
						type="date"
						bind:value={selectedDate}
						onchange={handleDateChange}
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
					/>
				</div>

				<!-- Status Filter -->
				<div>
					<label
						for="status"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Status
					</label>
					<select
						id="status"
						bind:value={statusFilter}
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
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

			<!-- Clear Filters -->
			{#if selectedCity || zipCodeSearch || selectedDate || statusFilter !== 'active'}
				<div class="mt-4">
					<button
						onclick={clearFilters}
						class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm leading-4 font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							></path>
						</svg>
						Clear Filters
					</button>
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
