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
		faBars,
		faHome,
		faStore,
		faUser,
		faArrowRightFromBracket,
		faMessage
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';

	let currentUser = $state<CurrentUser | null>(null);
	let items = $state<MarketItem[]>([]);
	let totalItems = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let filtersExpanded = $state(false);
	let statusFilter = $state<'active' | 'sold' | 'hidden' | 'all'>('all');
	let mobileMenuOpen = $state(false);

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

			if (statusFilter !== 'all') {
				params.status = statusFilter;
			}

			const response = await getAdminItems(params);
			items = response.items;
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

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<svelte:head>
	<title>Admin - Manage Items</title>
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
					<div class="flex items-center space-x-3">
						<button
							onclick={() => goto('/admin')}
							class="rounded-lg transition-opacity hover:opacity-80 active:scale-95"
							aria-label="Back to admin dashboard"
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
						<img
							src="/icon2.png"
							alt="Yard Sale Finder Logo"
							class="h-8 w-8 rounded-lg object-cover"
						/>
						<div>
							<h1 class="text-lg font-semibold text-gray-900 dark:text-white">Manage Items</h1>
							<p class="text-xs text-gray-500 dark:text-gray-400">{totalItems} total</p>
						</div>
					</div>
					<button
						onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
						class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
						aria-label="Menu"
					>
						<FontAwesomeIcon icon={faBars} class="h-5 w-5 text-gray-700 dark:text-gray-300" />
					</button>
				</div>

				<!-- Mobile Menu -->
				{#if mobileMenuOpen}
					<div class="border-t border-gray-200 pt-4 pb-4 dark:border-gray-800">
						<div class="space-y-1">
							<button
								onclick={() => {
									goto('/admin');
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon icon={faHome} class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Admin Dashboard
							</button>
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
							<button
								onclick={() => {
									goto('/market');
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon icon={faStore} class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
								Marketplace
							</button>
							{#if currentUser}
								<button
									onclick={() => {
										goto('/messages');
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon icon={faMessage} class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
									Messages
								</button>
								<button
									onclick={() => {
										goToProfile();
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon icon={faUser} class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
									My Profile
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
					<div class="flex items-center space-x-4">
						<button
							onclick={() => goto('/admin')}
							class="rounded-xl transition-opacity hover:opacity-80 active:scale-95"
							aria-label="Back to admin dashboard"
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
						<button
							onclick={() => goto('/')}
							class="rounded-xl transition-opacity hover:opacity-80 active:scale-95"
							aria-label="Go to home"
						>
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-12 w-12 rounded-xl object-cover shadow-sm"
							/>
						</button>
						<div>
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Manage Items</h1>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								{totalItems} total items • Admin View
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<button
							onclick={() => goto('/admin')}
							class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
						>
							<FontAwesomeIcon icon={faHome} class="mr-2 h-4 w-4" />
							Dashboard
						</button>
						<button
							onclick={() => goto('/market')}
							class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
						>
							<FontAwesomeIcon icon={faStore} class="mr-2 h-4 w-4" />
							Marketplace
						</button>
						{#if currentUser}
							<button
								onclick={() => goto('/messages')}
								class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
								Messages
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
				</div>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<!-- Filters -->
		<div
			class="mb-6 rounded-xl bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:bg-gray-800/80 dark:ring-1 dark:ring-gray-700"
		>
			<div class="flex items-center justify-between">
				<button
					onclick={() => (filtersExpanded = !filtersExpanded)}
					class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {statusFilter !== 'all'
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
					<div class="relative">
						<MarketItemCard {item} />
						<!-- Admin Actions Overlay -->
						<div
							class="absolute top-2 right-2 flex gap-2 rounded-lg bg-white/90 p-1 shadow-lg backdrop-blur-sm dark:bg-gray-800/90"
						>
							<button
								onclick={() => handleEdit(item)}
								class="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
								title="Edit Item"
							>
								<FontAwesomeIcon icon={faPencil} class="h-4 w-4" />
							</button>
							<button
								onclick={() => handleDelete(item)}
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

