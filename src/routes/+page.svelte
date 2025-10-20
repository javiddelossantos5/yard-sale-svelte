<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getYardSales,
		getYardSalesByCity,
		getYardSalesByCategory,
		type YardSale
	} from '$lib/api';
	import YardSaleCard from '$lib/YardSaleCard.svelte';
	import CreateYardSaleModal from '$lib/CreateYardSaleModal.svelte';
	import { logout } from '$lib/auth';

	let yardSales = $state<YardSale[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	let selectedCity = $state('');
	let selectedCategory = $state('');

	// Get unique cities and categories for filters
	let cities = $state<string[]>([]);
	let categories = $state<string[]>([]);

	// Create yard sale modal state
	let showCreateModal = $state(false);

	onMount(async () => {
		try {
			await loadYardSales();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load yard sales';
		}
	});

	async function loadYardSales() {
		loading = true;
		error = null;

		try {
			let data: YardSale[];

			if (selectedCity) {
				data = await getYardSalesByCity(selectedCity);
			} else if (selectedCategory) {
				data = await getYardSalesByCategory(selectedCategory);
			} else {
				data = await getYardSales();
			}

			yardSales = data;

			// Extract unique cities and categories
			cities = [...new Set(data.map((sale) => sale.city))].sort();
			categories = [...new Set(data.flatMap((sale) => sale.categories))].sort();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load yard sales';
		} finally {
			loading = false;
		}
	}

	function handleCityChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedCity = target.value;
		selectedCategory = ''; // Reset category when city changes
		loadYardSales();
	}

	function handleCategoryChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedCategory = target.value;
		selectedCity = ''; // Reset city when category changes
		loadYardSales();
	}

	function clearFilters() {
		selectedCity = '';
		selectedCategory = '';
		searchTerm = '';
		loadYardSales();
	}

	function handleLogout() {
		logout();
		goto('/login');
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

	// Filter yard sales by search term
	let filteredYardSales = $derived(
		yardSales.filter(
			(sale) =>
				sale.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				sale.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
				sale.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
				sale.categories.some((cat) => cat.toLowerCase().includes(searchTerm.toLowerCase()))
		)
	);
</script>

<svelte:head>
	<title>Yard Sale Finder</title>
	<meta name="description" content="Find yard sales in your area" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-6">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Yard Sale Finder</h1>
					<p class="mt-1 text-gray-600">Discover amazing deals in your neighborhood</p>
				</div>

				<div class="flex items-center space-x-4">
					<div class="text-sm text-gray-500">
						{yardSales.length} yard sales found
					</div>
					<button
						onclick={handleCreateYardSale}
						class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							></path>
						</svg>
						Post New Yard Sale
					</button>
					<button
						onclick={handleLogout}
						class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							></path>
						</svg>
						Logout
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Search and Filters -->
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<!-- Search -->
				<div class="md:col-span-2">
					<label for="search" class="mb-2 block text-sm font-medium text-gray-700"> Search </label>
					<input
						id="search"
						type="text"
						bind:value={searchTerm}
						placeholder="Search by title, description, city, or category..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<!-- City Filter -->
				<div>
					<label for="city" class="mb-2 block text-sm font-medium text-gray-700"> City </label>
					<select
						id="city"
						bind:value={selectedCity}
						onchange={handleCityChange}
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">All Cities</option>
						{#each cities as city}
							<option value={city}>{city}</option>
						{/each}
					</select>
				</div>

				<!-- Category Filter -->
				<div>
					<label for="category" class="mb-2 block text-sm font-medium text-gray-700">
						Category
					</label>
					<select
						id="category"
						bind:value={selectedCategory}
						onchange={handleCategoryChange}
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">All Categories</option>
						{#each categories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Clear Filters -->
			{#if selectedCity || selectedCategory}
				<div class="mt-4">
					<button
						onclick={clearFilters}
						class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm leading-4 font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
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
				<span class="ml-3 text-gray-600">Loading yard sales...</span>
			</div>
		{/if}

		<!-- Error State -->
		{#if error}
			<div class="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
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
						<h3 class="text-sm font-medium text-red-800">Error loading yard sales</h3>
						<p class="mt-1 text-sm text-red-700">{error}</p>
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
					<h3 class="mt-2 text-sm font-medium text-gray-900">No yard sales found</h3>
					<p class="mt-1 text-sm text-gray-500">
						{searchTerm || selectedCity || selectedCategory
							? 'Try adjusting your search or filters.'
							: 'No yard sales are currently available.'}
					</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each filteredYardSales as yardSale (yardSale.id)}
						<YardSaleCard {yardSale} />
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<!-- Create Yard Sale Modal -->
	<CreateYardSaleModal
		isOpen={showCreateModal}
		onClose={handleCloseCreateModal}
		onSuccess={handleCreateSuccess}
	/>
</div>
