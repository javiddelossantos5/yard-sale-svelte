<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	
	// Debug: Log when component is created
	console.log('[AdminUsers] Component created/loaded. Current path:', typeof window !== 'undefined' ? window.location.pathname : 'SSR');
	import {
		getAdminUsers,
		getCurrentUser,
		isAdmin,
		type CurrentUser,
		type AdminUsersResponse
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faChevronLeft,
		faHome,
		faStore,
		faUser,
		faMessage,
		faShieldAlt,
		faEnvelope,
		faPhone,
		faMapMarkerAlt,
		faPencil,
		faBuilding,
		faFilter,
		faCheckCircle,
		faTimesCircle,
		faFlag,
		faChevronDown,
		faChevronUp,
		faHeart
	} from '@fortawesome/free-solid-svg-icons';
	import AppHeader from '$lib/AppHeader.svelte';
	import { unreadMessageCount, loadNotificationCounts } from '$lib/notifications';
	import EditUserModal from '$lib/EditUserModal.svelte';

	let currentUser = $state<CurrentUser | null>(null);
	let users = $state<CurrentUser[]>([]);
	let totalUsers = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedUser = $state<CurrentUser | null>(null);
	let showEditModal = $state(false);
	
	// Filters
	let filtersExpanded = $state(false);
	let isActiveFilter = $state<'all' | 'active' | 'inactive'>('all');
	let searchTerm = $state('');
	let zipFilter = $state('');
	let cityFilter = $state('');
	let stateFilter = $state('');
	let permissionsFilter = $state<'all' | 'admin' | 'user'>('all');

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
			console.log('Current user loaded:', { username: currentUser.username, permissions: currentUser.permissions });

			if (!isAdmin(currentUser)) {
				error = `Access denied. Admin permissions required. Current permissions: ${currentUser.permissions || 'none'}`;
				loading = false;
				return;
			}

			await loadUsers();
		} catch (e: any) {
			console.error('Failed to load admin users:', e);
			error = e?.message || 'Failed to load users';
		} finally {
			loading = false;
		}
	}

	async function loadUsers() {
		try {
			console.log('Loading admin users...');
			const response = await getAdminUsers({
				limit: 100,
				search: searchTerm.trim() || undefined
			});
			console.log('Admin users response:', response);
			
			// Apply client-side filters
			let filteredUsers = response.users || [];
			
			// Filter by is_active
			if (isActiveFilter === 'active') {
				filteredUsers = filteredUsers.filter((u) => u.is_active !== false);
			} else if (isActiveFilter === 'inactive') {
				filteredUsers = filteredUsers.filter((u) => u.is_active === false);
			}
			
			// Filter by zip code
			if (zipFilter.trim()) {
				filteredUsers = filteredUsers.filter((u) => 
					u.location?.zip?.toLowerCase().includes(zipFilter.trim().toLowerCase())
				);
			}
			
			// Filter by city
			if (cityFilter.trim()) {
				filteredUsers = filteredUsers.filter((u) => 
					u.location?.city?.toLowerCase().includes(cityFilter.trim().toLowerCase())
				);
			}
			
			// Filter by state
			if (stateFilter.trim()) {
				filteredUsers = filteredUsers.filter((u) => 
					u.location?.state?.toLowerCase().includes(stateFilter.trim().toLowerCase())
				);
			}
			
			// Filter by permissions
			if (permissionsFilter === 'admin') {
				filteredUsers = filteredUsers.filter((u) => u.permissions === 'admin');
			} else if (permissionsFilter === 'user') {
				filteredUsers = filteredUsers.filter((u) => u.permissions !== 'admin');
			}
			
			users = filteredUsers;
			totalUsers = filteredUsers.length;
		} catch (e: any) {
			console.error('Error in loadUsers:', e);
			throw new Error(e?.message || 'Failed to load users');
		}
	}

	function goToProfile(userId: string) {
		goto(`/profile/${userId}`);
	}

	function handleLogout() {
		logout(); // logout() now handles redirect automatically
	}

	function handleEditUser(user: CurrentUser, e: Event) {
		e.preventDefault();
		e.stopPropagation();
		selectedUser = user;
		showEditModal = true;
	}

	function handleEditSuccess() {
		// Reload users after successful update
		loadUsers();
	}

	function viewReportsForUser(userId: string) {
		goto(`/admin/reports?user=${userId}`);
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

	// React to filter changes
	$effect(() => {
		if (currentUser && isAdmin(currentUser)) {
			isActiveFilter;
			searchTerm;
			zipFilter;
			cityFilter;
			stateFilter;
			permissionsFilter;
			loadUsers();
		}
	});
</script>

<svelte:head>
	<title>Admin - Manage Users</title>
</svelte:head>

<!-- DEBUG: Admin Users Page - Route: /admin/users -->
<div class="min-h-screen bg-gray-50 dark:bg-gray-900" data-page="admin-users">
	<AppHeader
		title="Manage Users"
		subtitle="{totalUsers} total users • Admin View"
		{currentUser}
		showBackButton={true}
		backUrl="/admin"
		backLabel="Admin Dashboard"
		{mobileMenuItems}
	/>

	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-8 w-8 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading users...</span>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{error}
			</div>
		{:else}
			<!-- Filters Section -->
			<div class="mb-6 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800 dark:ring-1 dark:ring-gray-700">
				<button
					onclick={() => (filtersExpanded = !filtersExpanded)}
					class="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
				>
					<div class="flex items-center gap-2">
						<FontAwesomeIcon icon={faFilter} class="h-4 w-4 text-gray-600 dark:text-gray-400" />
						<span class="font-medium text-gray-900 dark:text-white">Filters</span>
					</div>
					<FontAwesomeIcon
						icon={filtersExpanded ? faChevronUp : faChevronDown}
						class="h-4 w-4 text-gray-600 dark:text-gray-400"
					/>
				</button>

				{#if filtersExpanded}
					<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<!-- Search -->
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
								Search
							</label>
							<input
								type="text"
								bind:value={searchTerm}
								placeholder="Username, name, email..."
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
							/>
						</div>

						<!-- Active Status Filter -->
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
								Account Status
							</label>
							<select
								bind:value={isActiveFilter}
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
							>
								<option value="all">All Users</option>
								<option value="active">Active Only</option>
								<option value="inactive">Inactive Only</option>
							</select>
						</div>

						<!-- Permissions Filter -->
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
								Permissions
							</label>
							<select
								bind:value={permissionsFilter}
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
							>
								<option value="all">All</option>
								<option value="admin">Admin</option>
								<option value="user">User</option>
							</select>
						</div>

						<!-- City Filter -->
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
								City
							</label>
							<input
								type="text"
								bind:value={cityFilter}
								placeholder="Filter by city..."
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
							/>
						</div>

						<!-- State Filter -->
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
								State
							</label>
							<input
								type="text"
								bind:value={stateFilter}
								placeholder="Filter by state..."
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
							/>
						</div>

						<!-- Zip Code Filter -->
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
								Zip Code
							</label>
							<input
								type="text"
								bind:value={zipFilter}
								placeholder="Filter by zip..."
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
							/>
						</div>
					</div>
				{/if}
			</div>

			{#if users.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-3xl bg-white/90 p-12 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/90 dark:ring-gray-700"
				>
					<p class="text-sm text-gray-500 dark:text-gray-400">No users found matching your filters.</p>
				</div>
			{:else}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each users as user}
					<div
						class="group relative rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700 dark:hover:ring-gray-600"
					>
						<!-- Edit Button -->
						<button
							onclick={(e) => handleEditUser(user, e)}
							class="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 opacity-0 transition-all duration-200 hover:bg-blue-200 hover:scale-110 group-hover:opacity-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
							aria-label="Edit user permissions"
							title="Edit permissions"
						>
							<FontAwesomeIcon icon={faPencil} class="h-3.5 w-3.5" />
						</button>

						<button
							onclick={() => goToProfile(user.id)}
							class="w-full text-left"
						>
							<div class="flex items-start gap-4">
							<!-- Avatar -->
							<div
								class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xl font-bold text-white"
							>
								{user.full_name?.charAt(0).toUpperCase() || '?'}
							</div>

							<!-- User Info -->
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<h3 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
										{user.full_name || 'Unknown User'}
									</h3>
									{#if user.permissions === 'admin'}
										<div
											class="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-0.5 text-xs font-bold text-white"
											title="Admin"
										>
											<FontAwesomeIcon icon={faShieldAlt} class="h-3 w-3" />
											<span>Admin</span>
										</div>
									{/if}
									<!-- Active Status Badge -->
									{#if user.is_active === false}
										<div
											class="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 dark:bg-red-900/30 dark:text-red-200"
											title="Account Inactive"
										>
											<FontAwesomeIcon icon={faTimesCircle} class="h-3 w-3" />
											<span>Inactive</span>
										</div>
									{:else if user.is_active === true}
										<div
											class="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800 dark:bg-green-900/30 dark:text-green-200"
											title="Account Active"
										>
											<FontAwesomeIcon icon={faCheckCircle} class="h-3 w-3" />
											<span>Active</span>
										</div>
									{/if}
								</div>
								<p class="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>

								<!-- Contact Info -->
								<div class="mt-3 space-y-1.5">
									{#if user.email}
										<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
											<FontAwesomeIcon icon={faEnvelope} class="h-3 w-3" />
											<span class="truncate">{user.email}</span>
										</div>
									{/if}
									{#if user.phone_number}
										<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
											<FontAwesomeIcon icon={faPhone} class="h-3 w-3" />
											<span>{user.phone_number}</span>
										</div>
									{/if}
									{#if (user as any).company}
										<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
											<FontAwesomeIcon icon={faBuilding} class="h-3 w-3" />
											<span class="truncate">{(user as any).company}</span>
										</div>
									{/if}
									{#if user.location?.city || user.location?.state}
										<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
											<FontAwesomeIcon icon={faMapMarkerAlt} class="h-3 w-3" />
											<span>
												{#if user.location.city}
													{user.location.city}
													{#if user.location.state}, {/if}
												{/if}
												{#if user.location.state}
													{user.location.state}
												{/if}
												{#if user.location.zip}
													{' '}{user.location.zip}
												{/if}
											</span>
										</div>
									{/if}
								</div>

								<!-- Inactive User Actions -->
								{#if user.is_active === false}
									<div class="mt-3">
										<button
											onclick={(e) => {
												e.stopPropagation();
												viewReportsForUser(user.id);
											}}
											class="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
										>
											<FontAwesomeIcon icon={faFlag} class="h-3 w-3" />
											<span>View Reports</span>
										</button>
									</div>
								{/if}

								<!-- Rating -->
								{#if user.average_rating !== undefined && user.average_rating !== null}
									<div class="mt-3 flex items-center gap-2">
										<div class="flex items-center gap-1">
											{#each Array(5) as _, i}
												<FontAwesomeIcon
													icon="star"
													class="h-3 w-3 {i < Math.round(user.average_rating!)
														? 'text-yellow-400'
														: 'text-gray-300 dark:text-gray-600'}"
												/>
											{/each}
										</div>
										<span class="text-xs text-gray-600 dark:text-gray-400">
											{user.average_rating.toFixed(1)}
											{#if user.total_ratings}
												({user.total_ratings})
											{/if}
										</span>
									</div>
								{/if}
							</div>
						</div>
						</button>
					</div>
				{/each}
			</div>
			{/if}
		{/if}
	</div>

	<!-- Edit User Modal -->
	<EditUserModal
		isOpen={showEditModal}
		onClose={() => {
			showEditModal = false;
			selectedUser = null;
		}}
		onSuccess={handleEditSuccess}
		user={selectedUser}
	/>
</div>

