<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getAdminItems,
		getCurrentUser,
		isAdmin,
		deleteMarketItem,
		type MarketItem,
		type CurrentUser,
		type AdminItemsResponse
	} from '$lib/api';
	import MarketItemCard from '$lib/MarketItemCard.svelte';
	import EditMarketItemModal from '$lib/EditMarketItemModal.svelte';
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
		faShieldAlt,
		faHeart
	} from '@fortawesome/free-solid-svg-icons';
	import AppHeader from '$lib/AppHeader.svelte';
	import { unreadMessageCount, loadNotificationCounts } from '$lib/notifications';

	let currentUser = $state<CurrentUser | null>(null);
	let items = $state<MarketItem[]>([]);
	let totalItems = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let filtersExpanded = $state(false);
	let statusFilter = $state<'active' | 'sold' | 'hidden' | 'pending' | 'all'>('all');

	// Edit/Delete modals
	let selectedItem = $state<MarketItem | null>(null);
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

			await loadItems();
		} catch (e: any) {
			console.error('Failed to load admin items:', e);
			error = e?.message || 'Failed to load items';
		} finally {
			loading = false;
		}
	}

	async function loadItems() {
		try {
			const params: {
				limit?: number;
				skip?: number;
				status?: 'active' | 'sold' | 'hidden';
			} = {
				limit: 100
			};

			if (statusFilter !== 'all' && statusFilter !== 'pending') {
				params.status = statusFilter;
			}

			const response = await getAdminItems(params);

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

				// If same status, sort by created_at (descending - newest first)
				const dateA = new Date(a.created_at || '').getTime();
				const dateB = new Date(b.created_at || '').getTime();
				return dateB - dateA;
			});

			items = sortedItems;
			totalItems = response.total;
		} catch (e: any) {
			throw new Error(e?.message || 'Failed to load items');
		}
	}

	$effect(() => {
		if (currentUser && isAdmin(currentUser)) {
			statusFilter; // Track filter changes
			loadItems();
		}
	});

	function handleEdit(item: MarketItem) {
		selectedItem = item;
		showEditModal = true;
	}

	function handleDelete(item: MarketItem) {
		selectedItem = item;
		showDeleteModal = true;
	}

	async function handleConfirmDelete() {
		if (!selectedItem || deleting) return;

		deleting = true;
		error = null;
		showDeleteModal = false;
		try {
			await deleteMarketItem(selectedItem.id);
			await loadItems(); // Reload list
			selectedItem = null;
		} catch (e: any) {
			error = e?.message || 'Failed to delete item';
			showDeleteModal = true; // Keep modal open on error
		} finally {
			deleting = false;
		}
	}

	function handleEditSuccess() {
		showEditModal = false;
		loadItems(); // Reload list
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
</script>

<svelte:head>
	<title>Admin - Manage Items</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<AppHeader
		title="Manage Items"
		subtitle="{totalItems} total items • Admin View"
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
					class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {statusFilter !==
					'all'
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
								<option value="all">All Items</option>
								<option value="active">Active</option>
								<option value="pending">Pending</option>
								<option value="sold">Sold</option>
								<option value="hidden">Hidden</option>
							</select>
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-8 w-8 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading items...</span>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{error}
			</div>
		{:else if items.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl bg-white/90 p-12 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/90 dark:ring-gray-700"
			>
				<p class="text-sm text-gray-500 dark:text-gray-400">No items found.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each items as item}
					<div class="group relative">
						<MarketItemCard {item} />
						<!-- Admin Actions Overlay - positioned to avoid image controls -->
						<div
							class="absolute top-2 left-2 z-20 flex gap-2 rounded-lg bg-white/90 p-1 opacity-0 shadow-lg backdrop-blur-sm transition-opacity group-hover:opacity-100 dark:bg-gray-800/90"
						>
							<button
								onclick={(e) => {
									e.stopPropagation();
									handleEdit(item);
								}}
								class="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
								title="Edit Item"
							>
								<FontAwesomeIcon icon={faPencil} class="h-4 w-4" />
							</button>
							<button
								onclick={(e) => {
									e.stopPropagation();
									handleDelete(item);
								}}
								class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
								title="Delete Item"
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
	{#if selectedItem}
		<EditMarketItemModal
			isOpen={showEditModal}
			onClose={() => {
				showEditModal = false;
				selectedItem = null;
			}}
			onSuccess={handleEditSuccess}
			item={selectedItem}
		/>
	{/if}

	<!-- Delete Confirmation Modal -->
	<DeleteConfirmationModal
		isOpen={showDeleteModal}
		itemName={selectedItem?.name || 'item'}
		onClose={() => {
			showDeleteModal = false;
			selectedItem = null;
		}}
		onConfirm={handleConfirmDelete}
	/>
</div>
