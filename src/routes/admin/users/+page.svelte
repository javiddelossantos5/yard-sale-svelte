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
		faBars,
		faHome,
		faStore,
		faUser,
		faArrowRightFromBracket,
		faMessage,
		faShieldAlt,
		faEnvelope,
		faPhone,
		faMapMarkerAlt,
		faPencil,
		faBuilding
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import EditUserModal from '$lib/EditUserModal.svelte';

	let currentUser = $state<CurrentUser | null>(null);
	let users = $state<CurrentUser[]>([]);
	let totalUsers = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let mobileMenuOpen = $state(false);
	let selectedUser = $state<CurrentUser | null>(null);
	let showEditModal = $state(false);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			currentUser = await getCurrentUser();
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
				limit: 100
			});
			console.log('Admin users response:', response);
			users = response.users || [];
			totalUsers = response.total || 0;
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
</script>

<svelte:head>
	<title>Admin - Manage Users</title>
</svelte:head>

<!-- DEBUG: Admin Users Page - Route: /admin/users -->
<div class="min-h-screen bg-gray-50 dark:bg-gray-900" data-page="admin-users">
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
							<h1 class="text-lg font-semibold text-gray-900 dark:text-white">Manage Users</h1>
							<p class="text-xs text-gray-500 dark:text-gray-400">{totalUsers} total</p>
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
										goToProfile(currentUser!.id);
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
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Manage Users</h1>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								{totalUsers} total users • Admin View
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
								onclick={() => goToProfile(currentUser!.id)}
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
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-8 w-8 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading users...</span>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{error}
			</div>
		{:else if users.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl bg-white/90 p-12 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/90 dark:ring-gray-700"
			>
				<p class="text-sm text-gray-500 dark:text-gray-400">No users found.</p>
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
											</span>
										</div>
									{/if}
								</div>

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

