<script lang="ts">
	import { onMount } from 'svelte';
	import { getEvents, type Event, getCurrentUser, type CurrentUser, isAdmin } from '$lib/api';
	import { goto } from '$app/navigation';
	import EventCard from '$lib/EventCard.svelte';
	import CreateEventModal from '$lib/CreateEventModal.svelte';
	import SavedFilters from '$lib/SavedFilters.svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faFilter,
		faChevronDown,
		faChevronUp,
		faShieldAlt,
		faPlus,
		faMessage
	} from '@fortawesome/free-solid-svg-icons';
	import AppHeader from '$lib/AppHeader.svelte';
	import {
		unreadYardSaleMessages,
		unreadMarketItemMessages,
		unreadEventMessages,
		loadNotificationCounts
	} from '$lib/notifications';

	let filtersExpanded = $state(false);

	let events: Event[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentUser = $state<CurrentUser | null>(null);
	let isCreateOpen = $state(false);
	let yardSaleMessageUnreadCount = $state(0);
	let marketMessageUnreadCount = $state(0);
	let eventMessageUnreadCount = $state(0);

	// Filter states
	let searchTerm = $state('');
	let typeFilter = $state<string>('');
	let statusFilter = $state<string>('');
	let cityFilter = $state('');
	let stateFilter = $state('');
	let zipCodeFilter = $state('');
	let locationTypeFilter = $state<string>('');
	let isFreeFilter = $state<boolean | null>(null);
	let categoryFilter = $state('');
	let tagsFilter = $state('');

	// Event types
	const eventTypes = [
		'event',
		'informational',
		'advertisement',
		'announcement',
		'lost_found',
		'request_help',
		'offer_help',
		'service_offer'
	];

	// Event statuses
	const eventStatuses = ['upcoming', 'ongoing', 'ended', 'cancelled'];

	// Location types
	const locationTypes = ['indoor', 'outdoor', 'virtual'];

	// US States
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
			const user = await getCurrentUser().catch(() => null);
			currentUser = user;

			const params: {
				type?: string;
				status?: string;
				city?: string;
				state?: string;
				zip_code?: string;
				location_type?: string;
				is_free?: boolean;
				category?: string;
				tags?: string;
			} = {};

			if (typeFilter && typeFilter.trim() !== '') params.type = typeFilter.trim();
			if (statusFilter && statusFilter.trim() !== '') params.status = statusFilter.trim();
			if (cityFilter && cityFilter.trim() !== '') params.city = cityFilter.trim();
			if (stateFilter && stateFilter.trim() !== '') params.state = stateFilter.trim();
			if (zipCodeFilter && zipCodeFilter.trim() !== '') params.zip_code = zipCodeFilter.trim();
			if (locationTypeFilter && locationTypeFilter.trim() !== '')
				params.location_type = locationTypeFilter.trim();
			if (isFreeFilter !== null) params.is_free = isFreeFilter;
			if (categoryFilter && categoryFilter.trim() !== '') params.category = categoryFilter.trim();
			if (tagsFilter && tagsFilter.trim() !== '') params.tags = tagsFilter.trim();

			const response = await getEvents(params);

			// Client-side filtering (fallback if backend doesn't filter properly)
			let filteredEvents = response;

			// Search term filter (client-side fallback)
			if (searchTerm && searchTerm.trim() !== '') {
				const search = searchTerm.toLowerCase().trim();
				filteredEvents = filteredEvents.filter(
					(event) =>
						event.title.toLowerCase().includes(search) ||
						event.description?.toLowerCase().includes(search) ||
						event.organizer_name?.toLowerCase().includes(search) ||
						event.organizer_username?.toLowerCase().includes(search) ||
						event.category?.toLowerCase().includes(search) ||
						event.tags?.some((tag) => tag.toLowerCase().includes(search))
				);
			}

			// Type filter (client-side fallback)
			if (typeFilter && typeFilter.trim() !== '') {
				filteredEvents = filteredEvents.filter((event) => event.type === typeFilter.trim());
			}

			// Status filter (client-side fallback)
			if (statusFilter && statusFilter.trim() !== '') {
				filteredEvents = filteredEvents.filter((event) => event.status === statusFilter.trim());
			}

			// City filter (client-side fallback)
			if (cityFilter && cityFilter.trim() !== '') {
				const city = cityFilter.toLowerCase().trim();
				filteredEvents = filteredEvents.filter((event) => event.city?.toLowerCase().includes(city));
			}

			// State filter (client-side fallback)
			if (stateFilter && stateFilter.trim() !== '') {
				filteredEvents = filteredEvents.filter(
					(event) => event.state?.toLowerCase() === stateFilter.toLowerCase()
				);
			}

			// Zip code filter (client-side fallback)
			if (zipCodeFilter && zipCodeFilter.trim() !== '') {
				const zipCode = zipCodeFilter.trim();
				filteredEvents = filteredEvents.filter((event) => {
					// Match if zip code is included in the event's zip field
					return event.zip && event.zip.includes(zipCode);
				});
			}

			// Location type filter (client-side fallback)
			if (locationTypeFilter && locationTypeFilter.trim() !== '') {
				filteredEvents = filteredEvents.filter(
					(event) => event.location_type === locationTypeFilter.trim()
				);
			}

			// Free events filter (client-side fallback)
			if (isFreeFilter !== null) {
				filteredEvents = filteredEvents.filter((event) => event.is_free === isFreeFilter);
			}

			// Category filter (client-side fallback)
			if (categoryFilter && categoryFilter.trim() !== '') {
				const category = categoryFilter.toLowerCase().trim();
				filteredEvents = filteredEvents.filter((event) =>
					event.category?.toLowerCase().includes(category)
				);
			}

			// Tags filter (client-side fallback)
			if (tagsFilter && tagsFilter.trim() !== '') {
				const tags = tagsFilter
					.split(',')
					.map((tag) => tag.trim().toLowerCase())
					.filter((tag) => tag.length > 0);
				if (tags.length > 0) {
					filteredEvents = filteredEvents.filter((event) => {
						if (!event.tags || event.tags.length === 0) return false;
						const eventTags = event.tags.map((tag) => tag.toLowerCase());
						// Check if any of the filter tags match any event tag
						return tags.some((filterTag) =>
							eventTags.some((eventTag) => eventTag.includes(filterTag))
						);
					});
				}
			}

			// Sort events: upcoming/ongoing first, then ended/cancelled last
			const sortedEvents = [...filteredEvents].sort((a, b) => {
				const statusPriority: Record<string, number> = {
					upcoming: 0,
					ongoing: 1,
					ended: 3,
					cancelled: 4
				};
				const priorityA = statusPriority[a.status] ?? 5;
				const priorityB = statusPriority[b.status] ?? 5;

				if (priorityA !== priorityB) {
					return priorityA - priorityB;
				}

				// If same status, sort by start_date (closest first)
				if (a.start_date && b.start_date) {
					return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
				}
				if (a.start_date) return -1;
				if (b.start_date) return 1;

				// Default: sort by created_at (newest first)
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			});

			events = sortedEvents;

			// Refresh message counts after loading events and setting currentUser
			if (currentUser) {
				await refreshMessageCount();
			}
		} catch (err: any) {
			error = err?.message || 'Failed to load events';
			events = [];
		} finally {
			loading = false;
		}
	}

	function clearFilters() {
		searchTerm = '';
		typeFilter = '';
		statusFilter = '';
		cityFilter = '';
		stateFilter = '';
		zipCodeFilter = '';
		locationTypeFilter = '';
		isFreeFilter = null;
		categoryFilter = '';
		tagsFilter = '';
		load();
	}

	// Get current filter state as an object
	function getCurrentFilters(): Record<string, any> {
		const filters: Record<string, any> = {};
		if (searchTerm && searchTerm.trim() !== '') filters.search = searchTerm.trim();
		if (typeFilter && typeFilter.trim() !== '') filters.type = typeFilter.trim();
		if (statusFilter && statusFilter.trim() !== '') filters.status = statusFilter.trim();
		if (cityFilter && cityFilter.trim() !== '') filters.city = cityFilter.trim();
		if (stateFilter && stateFilter.trim() !== '') filters.state = stateFilter.trim();
		if (zipCodeFilter && zipCodeFilter.trim() !== '') filters.zip_code = zipCodeFilter.trim();
		if (locationTypeFilter && locationTypeFilter.trim() !== '')
			filters.location_type = locationTypeFilter.trim();
		if (isFreeFilter !== null) filters.is_free = isFreeFilter;
		if (categoryFilter && categoryFilter.trim() !== '') filters.category = categoryFilter.trim();
		if (tagsFilter && tagsFilter.trim() !== '') filters.tags = tagsFilter.trim();
		return filters;
	}

	// Load a saved filter
	function loadSavedFilter(filters: Record<string, any>) {
		searchTerm = filters.search || '';
		typeFilter = filters.type || '';
		statusFilter = filters.status || '';
		cityFilter = filters.city || '';
		stateFilter = filters.state || '';
		zipCodeFilter = filters.zip_code || '';
		locationTypeFilter = filters.location_type || '';
		isFreeFilter = filters.is_free !== undefined ? filters.is_free : null;
		categoryFilter = filters.category || '';
		tagsFilter = filters.tags || '';
		// Collapse filters after loading
		filtersExpanded = false;
		// load() will be triggered by $effect when these values change
	}

	const hasActiveFilters = $derived(
		typeFilter !== '' ||
			statusFilter !== '' ||
			cityFilter.trim() !== '' ||
			stateFilter !== '' ||
			zipCodeFilter.trim() !== '' ||
			locationTypeFilter !== '' ||
			isFreeFilter !== null ||
			categoryFilter.trim() !== '' ||
			tagsFilter.trim() !== ''
	);

	// Function to refresh message unread count
	async function refreshMessageCount() {
		if (!currentUser) return;

		try {
			// Use unified notification counts endpoint
			// This will populate the stores that AppHeader reads from
			await loadNotificationCounts();
		} catch {
			// Ignore errors loading unread count
		}
	}

	// React to filter changes
	$effect(() => {
		// Track all filter dependencies
		typeFilter;
		statusFilter;
		cityFilter;
		stateFilter;
		zipCodeFilter;
		locationTypeFilter;
		isFreeFilter;
		categoryFilter;
		tagsFilter;
		searchTerm;
		load();
	});

	// Load notification counts when currentUser changes
	$effect(() => {
		if (currentUser) {
			loadNotificationCounts().catch(() => {
				// Ignore errors
			});
		}
	});

	onMount(() => {
		load();
		// Also refresh message counts on mount in case load() hasn't set currentUser yet
		refreshMessageCount();
	});

	async function handleCreateSuccess() {
		isCreateOpen = false;
		await load();
	}

	const mobileMenuItems = $derived.by(() => {
		const items = [];
		if (currentUser && isAdmin(currentUser)) {
			items.push({
				label: 'Admin',
				icon: faShieldAlt,
				action: () => goto('/admin/users'),
				badge: undefined
			});
		}
		if (currentUser) {
			const totalMessages =
				$unreadYardSaleMessages + $unreadMarketItemMessages + $unreadEventMessages;
			items.push({
				label: 'Messages',
				icon: faMessage,
				action: () => goto('/messages'),
				badge: totalMessages > 0 ? totalMessages : undefined
			});
		}
		return items;
	});
</script>

<svelte:head>
	<title>Events - Yard Sale Finder</title>
	<meta name="description" content="Browse community events, announcements, and more" />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<AppHeader
		title="Events"
		subtitle="Community events, announcements & more"
		count={events.length}
		countLabel="events"
		primaryAction={() => {
			if (currentUser) {
				isCreateOpen = true;
			} else {
				goto('/login');
			}
		}}
		primaryActionLabel="New Event"
		primaryActionIcon={faPlus}
		{currentUser}
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
							placeholder="Search events..."
							class="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:bg-gray-600 dark:focus:ring-blue-400"
						/>
					</div>
					<button
						onclick={() => (filtersExpanded = !filtersExpanded)}
						class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {hasActiveFilters
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
						<!-- Status Filter - First on mobile, in row with Type on desktop -->
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
									<option value="">All Statuses</option>
									{#each eventStatuses as status}
										<option value={status}
											>{status.charAt(0).toUpperCase() + status.slice(1)}</option
										>
									{/each}
								</select>
							</div>

							<!-- Type Filter - Second on mobile -->
							<div class="order-2 sm:order-1">
								<label
									for="type"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Type
								</label>
								<select
									id="type"
									bind:value={typeFilter}
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								>
									<option value="">All Types</option>
									{#each eventTypes as type}
										<option value={type}>
											{type
												.split('_')
												.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
												.join(' ')}
										</option>
									{/each}
								</select>
							</div>
						</div>

						<!-- Row 2: Location Type and Pricing -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<!-- Location Type Filter -->
							<div>
								<label
									for="locationType"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Location Type
								</label>
								<select
									id="locationType"
									bind:value={locationTypeFilter}
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								>
									<option value="">All Locations</option>
									{#each locationTypes as locationType}
										<option value={locationType}>
											{locationType.charAt(0).toUpperCase() + locationType.slice(1)}
										</option>
									{/each}
								</select>
							</div>

							<!-- Free Events Filter -->
							<div>
								<label
									for="isFree"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Pricing
								</label>
								<select
									id="isFree"
									bind:value={isFreeFilter}
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								>
									<option value={null}>All Events</option>
									<option value={true}>Free Only</option>
									<option value={false}>Paid Only</option>
								</select>
							</div>
						</div>

						<!-- Row 3: Location Filters -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<!-- City Filter -->
							<div>
								<label
									for="city"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									City
								</label>
								<input
									type="text"
									id="city"
									bind:value={cityFilter}
									placeholder="City..."
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								/>
							</div>

							<!-- State Filter -->
							<div>
								<label
									for="state"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									State
								</label>
								<select
									id="state"
									bind:value={stateFilter}
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								>
									<option value="">All States</option>
									{#each states as state}
										<option value={state}>{state}</option>
									{/each}
								</select>
							</div>

							<!-- Zip Code Filter -->
							<div>
								<label
									for="zipCode"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Zip Code
								</label>
								<input
									type="text"
									id="zipCode"
									bind:value={zipCodeFilter}
									placeholder="Zip code..."
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								/>
							</div>
						</div>

						<!-- Row 4: Category and Tags -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<!-- Category Filter -->
							<div>
								<label
									for="category"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Category
								</label>
								<input
									type="text"
									id="category"
									bind:value={categoryFilter}
									placeholder="Category..."
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								/>
							</div>

							<!-- Tags Filter -->
							<div>
								<label
									for="tags"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Tags (comma-separated)
								</label>
								<input
									type="text"
									id="tags"
									bind:value={tagsFilter}
									placeholder="kids, music, outdoor..."
									class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-400"
								/>
							</div>
						</div>
					</div>

					<!-- Active Filters Indicator, Saved Filters, and Clear Button -->
					{#if hasActiveFilters}
						<div
							class="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-700"
						>
							<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
									<FontAwesomeIcon icon={faFilter} class="h-4 w-4" />
									<span>Filters applied</span>
								</div>
								<div class="flex items-center gap-2">
									{#if currentUser}
										<SavedFilters
											filterType="event"
											currentFilters={getCurrentFilters()}
											onLoadFilter={loadSavedFilter}
											{currentUser}
										/>
									{/if}
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
										Clear Filters
									</button>
								</div>
							</div>
						</div>
					{:else if currentUser}
						<!-- Show saved filters even when no filters are applied -->
						<div
							class="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-700"
						>
							<div class="flex items-center justify-end">
								<SavedFilters
									filterType="event"
									currentFilters={getCurrentFilters()}
									onLoadFilter={loadSavedFilter}
									{currentUser}
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Events Grid -->
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-8 w-8 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading events...</span>
			</div>
		{:else if error}
			<div class="rounded-2xl bg-red-50 p-6 dark:bg-red-900/20">
				<div class="flex">
					<FontAwesomeIcon icon="exclamation-triangle" class="h-5 w-5 text-red-400" />
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
						<div class="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
					</div>
				</div>
			</div>
		{:else if events.length === 0}
			<div
				class="rounded-2xl bg-white p-12 text-center shadow-sm dark:bg-gray-800 dark:ring-1 dark:ring-gray-700"
			>
				<FontAwesomeIcon icon="calendar" class="mx-auto h-12 w-12 text-gray-400" />
				<h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No events found</h3>
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
					{#if hasActiveFilters}
						Try adjusting your filters or
						<button onclick={clearFilters} class="text-blue-600 hover:underline dark:text-blue-400">
							clear all filters
						</button>
					{:else}
						Be the first to create an event!
					{/if}
				</p>
				{#if currentUser && !hasActiveFilters}
					<button
						onclick={() => (isCreateOpen = true)}
						class="mt-4 inline-flex items-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-95"
					>
						<FontAwesomeIcon icon={faPlus} class="mr-2 h-4 w-4" />
						Create Event
					</button>
				{/if}
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each events as event (event.id)}
					<EventCard {event} />
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if isCreateOpen && currentUser}
	<CreateEventModal
		isOpen={isCreateOpen}
		onClose={() => (isCreateOpen = false)}
		onSuccess={handleCreateSuccess}
	/>
{/if}
