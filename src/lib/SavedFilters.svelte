<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getSavedFilters,
		createSavedFilter,
		deleteSavedFilter,
		type SavedFilter
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faBookmark,
		faTrash,
		faChevronDown,
		faChevronUp,
		faPlus,
		faTimes
	} from '@fortawesome/free-solid-svg-icons';

	let {
		filterType,
		currentFilters = {},
		onLoadFilter = () => {},
		currentUser = null
	}: {
		filterType: 'yard_sale' | 'market_item' | 'event';
		currentFilters?: Record<string, any>;
		onLoadFilter?: (filters: Record<string, any>) => void;
		currentUser?: any; // CurrentUser | null
	} = $props();

	let savedFilters = $state<SavedFilter[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let showSaveModal = $state(false);
	let showList = $state(false);
	let filterName = $state('');
	let saving = $state(false);

	// Load saved filters when component mounts or when user logs in
	onMount(() => {
		if (currentUser) {
			loadSavedFilters();
		}
	});

	// Reload saved filters when user logs in (after component is mounted)
	$effect(() => {
		if (currentUser && filterType) {
			loadSavedFilters();
		} else if (!currentUser) {
			// Clear saved filters when user logs out
			savedFilters = [];
		}
	});

	async function loadSavedFilters() {
		if (!filterType) return;
		loading = true;
		error = null;
		try {
			savedFilters = await getSavedFilters(filterType);
		} catch (e: any) {
			error = e?.message || 'Failed to load saved filters';
			console.error('Error loading saved filters:', e);
		} finally {
			loading = false;
		}
	}

	async function handleSaveFilter() {
		if (!filterName.trim()) {
			error = 'Please enter a name for this filter';
			return;
		}

		saving = true;
		error = null;
		try {
			await createSavedFilter({
				filter_type: filterType,
				name: filterName.trim(),
				filters: currentFilters
			});
			filterName = '';
			showSaveModal = false;
			await loadSavedFilters();
		} catch (e: any) {
			error = e?.message || 'Failed to save filter';
			console.error('Error saving filter:', e);
		} finally {
			saving = false;
		}
	}

	async function handleDeleteFilter(filterId: string) {
		if (!confirm('Are you sure you want to delete this saved filter?')) {
			return;
		}

		try {
			await deleteSavedFilter(filterId);
			await loadSavedFilters();
		} catch (e: any) {
			error = e?.message || 'Failed to delete filter';
			console.error('Error deleting filter:', e);
		}
	}

	function handleLoadFilter(filter: SavedFilter) {
		onLoadFilter(filter.filters);
		showList = false;
	}

	function openSaveModal() {
		filterName = '';
		error = null;
		showSaveModal = true;
	}

	function closeSaveModal() {
		showSaveModal = false;
		filterName = '';
		error = null;
	}
</script>

<div class="relative">
	<!-- Save/Load Button -->
	<div class="flex items-center gap-2">
		<button
			onclick={openSaveModal}
			class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
			title="Save current filters"
		>
			<FontAwesomeIcon icon={faBookmark} class="h-4 w-4" />
			<span class="hidden sm:inline">Save Filters</span>
		</button>

		{#if savedFilters.length > 0}
			<div class="relative">
				<button
					onclick={() => (showList = !showList)}
					class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
					title="Load saved filters"
				>
					<FontAwesomeIcon icon={showList ? faChevronUp : faChevronDown} class="h-4 w-4" />
					<span class="hidden sm:inline">Saved ({savedFilters.length})</span>
				</button>

				{#if showList}
					<div
						class="absolute right-0 z-[9999] mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
					>
						<div class="max-h-64 overflow-y-auto p-2">
							{#each savedFilters as filter}
								<div
									class="group flex items-center justify-between rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
								>
									<button
										onclick={() => handleLoadFilter(filter)}
										class="flex-1 text-left text-sm text-gray-700 dark:text-gray-300"
									>
										<div class="font-medium">{filter.name}</div>
										<div class="text-xs text-gray-500 dark:text-gray-400">
											{new Date(filter.updated_at).toLocaleDateString()}
										</div>
									</button>
									<button
										onclick={() => handleDeleteFilter(filter.id)}
										class="ml-2 rounded p-1 text-red-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
										title="Delete filter"
									>
										<FontAwesomeIcon icon={faTrash} class="h-3 w-3" />
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Save Filter Modal -->
	{#if showSaveModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onclick={closeSaveModal}
			onkeydown={(e) => {
				if (e.key === 'Escape') closeSaveModal();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="save-filter-title"
			tabindex="-1"
		>
			<div
				class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<div class="mb-4 flex items-center justify-between">
					<h3 id="save-filter-title" class="text-lg font-semibold text-gray-900 dark:text-white">
						Save Filter
					</h3>
					<button
						onclick={closeSaveModal}
						class="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
						aria-label="Close"
					>
						<FontAwesomeIcon icon={faTimes} class="h-5 w-5" />
					</button>
				</div>

				{#if error}
					<div
						class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
					>
						{error}
					</div>
				{/if}

				<div class="mb-4">
					<label
						for="filter-name"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Filter Name
					</label>
					<input
						id="filter-name"
						type="text"
						bind:value={filterName}
						placeholder="e.g., Free Electronics"
						class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								handleSaveFilter();
							}
						}}
					/>
				</div>

				<div class="flex gap-3">
					<button
						onclick={closeSaveModal}
						class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
					>
						Cancel
					</button>
					<button
						onclick={handleSaveFilter}
						disabled={saving || !filterName.trim()}
						class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
