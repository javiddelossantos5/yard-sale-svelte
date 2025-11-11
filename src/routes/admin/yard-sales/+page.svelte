<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getAdminYardSales,
		getCurrentUser,
		isAdmin,
		deleteYardSale,
		type YardSale,
		type CurrentUser,
		type AdminYardSalesResponse
	} from '$lib/api';
	import YardSaleCard from '$lib/YardSaleCard.svelte';
	import YardSaleModal from '$lib/YardSaleModal.svelte';
	import DeleteConfirmationModal from '$lib/DeleteConfirmationModal.svelte';
	import { getYardSaleStatus } from '$lib/yardSaleUtils';
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
	let yardSales = $state<YardSale[]>([]);
	let totalYardSales = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let filtersExpanded = $state(false);
	let statusFilter = $state<'active' | 'closed' | 'on_break' | 'all'>('all');

	// Edit/Delete modals
	let selectedYardSale = $state<YardSale | null>(null);
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

			await loadYardSales();
		} catch (e: any) {
			console.error('Failed to load admin yard sales:', e);
			error = e?.message || 'Failed to load yard sales';
		} finally {
			loading = false;
		}
	}

	async function loadYardSales() {
		try {
			const params: {
				limit?: number;
				skip?: number;
				status?: 'active' | 'closed' | 'on_break';
			} = {
				limit: 100
			};

			if (statusFilter !== 'all') {
				params.status = statusFilter;
			}

			const response = await getAdminYardSales(params);

			// Sort yard sales: active first, ended/closed/expired last
			const sortedYardSales = [...response.yard_sales].sort((a, b) => {
				const statusA = getYardSaleStatus(a);
				const statusB = getYardSaleStatus(b);

				// Status priority: active = 0, upcoming = 1, on_break = 2, closed = 3, expired = 4
				const getStatusPriority = (status: string) => {
					if (status === 'active') return 0;
					if (status === 'upcoming') return 1;
					if (status === 'on_break') return 2;
					if (status === 'closed') return 3;
					if (status === 'expired') return 4;
					return 5; // Unknown status goes last
				};

				const priorityA = getStatusPriority(statusA);
				const priorityB = getStatusPriority(statusB);

				if (priorityA !== priorityB) {
					return priorityA - priorityB; // Lower priority (active) comes first
				}

				// If same status, sort by start date (ascending)
				const dateA = new Date(a.start_date || '').getTime();
				const dateB = new Date(b.start_date || '').getTime();
				return dateA - dateB;
			});

			yardSales = sortedYardSales;
			totalYardSales = response.total;
		} catch (e: any) {
			throw new Error(e?.message || 'Failed to load yard sales');
		}
	}

	$effect(() => {
		if (currentUser && isAdmin(currentUser)) {
			statusFilter; // Track filter changes
			loadYardSales();
		}
	});

	function handleEdit(yardSale: YardSale) {
		selectedYardSale = yardSale;
		showEditModal = true;
	}

	function handleDelete(yardSale: YardSale) {
		selectedYardSale = yardSale;
		showDeleteModal = true;
	}

	async function handleConfirmDelete() {
		if (!selectedYardSale || deleting) return;

		deleting = true;
		error = null;
		showDeleteModal = false;
		try {
			await deleteYardSale(selectedYardSale.id);
			await loadYardSales(); // Reload list
			selectedYardSale = null;
		} catch (e: any) {
			error = e?.message || 'Failed to delete yard sale';
			showDeleteModal = true; // Keep modal open on error
		} finally {
			deleting = false;
		}
	}

	function handleEditSuccess() {
		showEditModal = false;
		loadYardSales(); // Reload list
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
	<title>Admin - Manage Yard Sales</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<AppHeader
		title="Manage Yard Sales"
		subtitle="{totalYardSales} total yard sales • Admin View"
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
								<option value="all">All Yard Sales</option>
								<option value="active">Active</option>
								<option value="closed">Closed</option>
								<option value="on_break">On Break</option>
							</select>
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-8 w-8 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading yard sales...</span>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{error}
			</div>
		{:else if yardSales.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl bg-white/90 p-12 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/90 dark:ring-gray-700"
			>
				<p class="text-sm text-gray-500 dark:text-gray-400">No yard sales found.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each yardSales as yardSale}
					<div class="group relative">
						<YardSaleCard {yardSale} />
						<!-- Admin Actions Overlay - positioned to avoid image controls -->
						<div
							class="absolute top-2 left-2 z-20 flex gap-2 rounded-lg bg-white/90 p-1 opacity-0 shadow-lg backdrop-blur-sm transition-opacity group-hover:opacity-100 dark:bg-gray-800/90"
						>
							<button
								onclick={(e) => {
									e.stopPropagation();
									handleEdit(yardSale);
								}}
								class="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
								title="Edit Yard Sale"
							>
								<FontAwesomeIcon icon={faPencil} class="h-4 w-4" />
							</button>
							<button
								onclick={(e) => {
									e.stopPropagation();
									handleDelete(yardSale);
								}}
								class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
								title="Delete Yard Sale"
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
	{#if selectedYardSale}
		<YardSaleModal
			isOpen={showEditModal}
			onClose={() => {
				showEditModal = false;
				selectedYardSale = null;
			}}
			onSuccess={handleEditSuccess}
			yardSale={selectedYardSale}
		/>
	{/if}

	<!-- Delete Confirmation Modal -->
	<DeleteConfirmationModal
		isOpen={showDeleteModal}
		itemName={selectedYardSale?.title || 'yard sale'}
		onClose={() => {
			showDeleteModal = false;
			selectedYardSale = null;
		}}
		onConfirm={handleConfirmDelete}
	/>
</div>
