<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getAdminEvents,
		getCurrentUser,
		isAdmin,
		deleteEvent,
		type Event,
		type CurrentUser,
		type AdminEventsResponse
	} from '$lib/api';
	import EventCard from '$lib/EventCard.svelte';
	import EditEventModal from '$lib/EditEventModal.svelte';
	import DeleteConfirmationModal from '$lib/DeleteConfirmationModal.svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faChevronLeft,
		faTrash,
		faPencil,
		faFilter,
		faChevronDown,
		faChevronUp,
		faHome,
		faStore,
		faUser,
		faMessage,
		faCalendar,
		faShieldAlt,
		faHeart
	} from '@fortawesome/free-solid-svg-icons';
	import AppHeader from '$lib/AppHeader.svelte';
	import { unreadMessageCount, loadNotificationCounts } from '$lib/notifications';

	let currentUser = $state<CurrentUser | null>(null);
	let events = $state<Event[]>([]);
	let totalEvents = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let filtersExpanded = $state(false);
	let statusFilter = $state<'ongoing' | 'ended' | 'cancelled' | 'upcoming' | 'all'>('all');
	let typeFilter = $state<string>('all');

	// Edit/Delete modals
	let selectedEvent = $state<Event | null>(null);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let deleting = $state(false);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			currentUser = await getCurrentUser();
			// Load notification counts when user is loaded
			if (currentUser) {
				await loadNotificationCounts();
			}
			
			if (!isAdmin(currentUser)) {
				error = 'Access denied. Admin permissions required.';
				return;
			}

			await loadEvents();
		} catch (e: any) {
			console.error('Failed to load admin events:', e);
			error = e?.message || 'Failed to load events';
		} finally {
			loading = false;
		}
	}

	async function loadEvents() {
		try {
			const params: {
				limit?: number;
				skip?: number;
				status?: string;
				type?: string;
			} = {
				limit: 100
			};

			if (statusFilter !== 'all') {
				params.status = statusFilter;
			}

			if (typeFilter !== 'all') {
				params.type = typeFilter;
			}

			const response = await getAdminEvents(params);

			// Sort events: ongoing first, then by start date
			const sortedEvents = [...response.events].sort((a, b) => {
				// Status priority: ongoing = 0, upcoming = 1, ended = 2, cancelled = 3
				const getStatusPriority = (status: string) => {
					if (status === 'ongoing') return 0;
					if (status === 'upcoming') return 1;
					if (status === 'ended') return 2;
					if (status === 'cancelled') return 3;
					return 4;
				};

				const priorityA = getStatusPriority(a.status);
				const priorityB = getStatusPriority(b.status);

				if (priorityA !== priorityB) {
					return priorityA - priorityB;
				}

				// If same status, sort by start date (ascending)
				if (a.start_date && b.start_date) {
					return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
				}
				if (a.start_date) return -1;
				if (b.start_date) return 1;
				return 0;
			});

			events = sortedEvents;
			totalEvents = response.total;
		} catch (e: any) {
			throw new Error(e?.message || 'Failed to load events');
		}
	}

	$effect(() => {
		if (currentUser && isAdmin(currentUser)) {
			statusFilter; // Track filter changes
			typeFilter; // Track type filter changes
			loadEvents();
		}
	});

	function handleEdit(event: Event) {
		selectedEvent = event;
		showEditModal = true;
	}

	function handleDelete(event: Event) {
		selectedEvent = event;
		showDeleteModal = true;
	}

	async function handleConfirmDelete() {
		if (!selectedEvent || deleting) return;

		deleting = true;
		error = null;
		showDeleteModal = false;
		try {
			await deleteEvent(selectedEvent.id);
			await loadEvents(); // Reload list
			selectedEvent = null;
		} catch (e: any) {
			error = e?.message || 'Failed to delete event';
			showDeleteModal = true; // Keep modal open on error
		} finally {
			deleting = false;
		}
	}

	function handleEditSuccess() {
		showEditModal = false;
		loadEvents(); // Reload list
	}

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	const mobileMenuItems = $derived.by(() => {
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
					void goto('/messages');
				},
				badge: $unreadMessageCount > 0 ? $unreadMessageCount : undefined
			});
		}
		return items;
	});

	// Get unique event types for filter
	const eventTypes = $derived(() => {
		const types = new Set<string>();
		events.forEach((event) => {
			if (event.type) types.add(event.type);
		});
		return Array.from(types).sort();
	});
</script>

<svelte:head>
	<title>Admin - Manage Events</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<AppHeader
		title="Manage Events"
		subtitle="{totalEvents} total events • Admin View"
		{currentUser}
		showBackButton={true}
		backUrl="/admin"
		backLabel="Admin Dashboard"
		{mobileMenuItems}
	/>

	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<!-- Filters -->
		<div
			class="mb-6 rounded-xl bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:bg-gray-800/80 dark:ring-1 dark:ring-gray-700"
		>
			<div class="flex items-center justify-between">
				<button
					onclick={() => (filtersExpanded = !filtersExpanded)}
					class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {(statusFilter !==
					'all' || typeFilter !== 'all')
						? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
						: ''}"
				>
					<FontAwesomeIcon icon={faFilter} class="h-4 w-4" />
					<span class="hidden sm:inline">Filters</span>
					<FontAwesomeIcon icon={filtersExpanded ? faChevronUp : faChevronDown} class="h-3 w-3" />
				</button>
			</div>

			{#if filtersExpanded}
				<div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
								<option value="all">All Events</option>
								<option value="ongoing">Ongoing</option>
								<option value="upcoming">Upcoming</option>
								<option value="ended">Ended</option>
								<option value="cancelled">Cancelled</option>
							</select>
						</div>
						<div>
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
								<option value="all">All Types</option>
								{#each eventTypes as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-8 w-8 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading events...</span>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{error}
			</div>
		{:else if events.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl bg-white/90 p-12 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/90 dark:ring-gray-700"
			>
				<p class="text-sm text-gray-500 dark:text-gray-400">No events found.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each events as event}
					<div class="relative">
						<EventCard {event} />
						<!-- Admin Actions Overlay -->
						<div
							class="absolute top-2 right-2 flex gap-2 rounded-lg bg-white/90 p-1 shadow-lg backdrop-blur-sm dark:bg-gray-800/90"
						>
							<button
								onclick={() => handleEdit(event)}
								class="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
								title="Edit Event"
							>
								<FontAwesomeIcon icon={faPencil} class="h-4 w-4" />
							</button>
							<button
								onclick={() => handleDelete(event)}
								class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
								title="Delete Event"
							>
								<FontAwesomeIcon icon={faTrash} class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Edit Modal -->
	{#if selectedEvent}
		<EditEventModal
			isOpen={showEditModal}
			onClose={() => {
				showEditModal = false;
				selectedEvent = null;
			}}
			onSuccess={handleEditSuccess}
			event={selectedEvent}
		/>
	{/if}

	<!-- Delete Confirmation Modal -->
	<DeleteConfirmationModal
		isOpen={showDeleteModal}
		itemName={selectedEvent?.title || 'event'}
		onClose={() => {
			showDeleteModal = false;
			selectedEvent = null;
		}}
		onConfirm={handleConfirmDelete}
	/>
</div>

