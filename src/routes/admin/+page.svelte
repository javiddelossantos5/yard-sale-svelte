<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getAdminDashboardStats,
		getCurrentUser,
		isAdmin,
		type CurrentUser,
		type AdminDashboardStats
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faChartBar,
		faStore,
		faHome,
		faUsers,
		faShieldAlt,
		faArrowRight,
		faBars,
		faUser,
		faArrowRightFromBracket,
		faMessage,
		faHeart,
		faCalendar,
		faFlag
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';

	let currentUser = $state<CurrentUser | null>(null);
	let stats = $state<AdminDashboardStats | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let mobileMenuOpen = $state(false);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			currentUser = await getCurrentUser();

			// Debug: Log user info to check admin status
			console.log('Current User:', {
				username: currentUser.username,
				permissions: currentUser.permissions,
				isAdmin: isAdmin(currentUser)
			});

			// Check if user is admin
			if (!isAdmin(currentUser)) {
				error = `Access denied. Admin permissions required. Current permissions: ${currentUser.permissions || 'none'}`;
				return;
			}

			// Load dashboard stats
			stats = await getAdminDashboardStats();
		} catch (e: any) {
			console.error('Failed to load admin dashboard:', e);
			error = e?.message || 'Failed to load admin dashboard';
		} finally {
			loading = false;
		}
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
	<title>Admin Dashboard - Yard Sale Finder</title>
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
							onclick={() => goto('/')}
							class="rounded-lg transition-opacity hover:opacity-80 active:scale-95"
							aria-label="Go to home"
						>
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-8 w-8 rounded-lg object-cover"
							/>
						</button>
						<div>
							<h1 class="text-lg font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
							<p class="text-xs text-gray-500 dark:text-gray-400">Platform Management</p>
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
									goto('/');
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon
									icon={faHome}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
								Home
							</button>
							<button
								onclick={() => {
									goto('/market');
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon
									icon={faStore}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
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
									<FontAwesomeIcon
										icon={faMessage}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									Messages
								</button>
								<button
									onclick={() => {
										goToProfile();
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faUser}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
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
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
							<p class="text-sm text-gray-600 dark:text-gray-400">Platform Management</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<button
							onclick={() => goto('/')}
							class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
						>
							<FontAwesomeIcon icon={faHome} class="mr-2 h-4 w-4" />
							Home
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
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-8 w-8 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading dashboard...</span>
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
		{:else if stats}
			<div class="space-y-6">
				<!-- Stats Overview -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<!-- Total Users -->
					<div
						class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
					>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
								<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
									{stats.total_users.toLocaleString()}
								</p>
							</div>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20"
							>
								<FontAwesomeIcon icon={faUsers} class="h-6 w-6 text-blue-600 dark:text-blue-400" />
							</div>
						</div>
					</div>

					<!-- Total Items -->
					<div
						class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
					>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
								<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
									{stats.total_items.toLocaleString()}
								</p>
								<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
									{stats.active_items} active
								</p>
							</div>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20"
							>
								<FontAwesomeIcon
									icon={faStore}
									class="h-6 w-6 text-green-600 dark:text-green-400"
								/>
							</div>
						</div>
					</div>

					<!-- Total Yard Sales -->
					<div
						class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
					>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Yard Sales</p>
								<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
									{stats.total_yard_sales.toLocaleString()}
								</p>
								<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
									{stats.active_yard_sales} active
								</p>
							</div>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20"
							>
								<FontAwesomeIcon
									icon={faHome}
									class="h-6 w-6 text-purple-600 dark:text-purple-400"
								/>
							</div>
						</div>
					</div>

					<!-- Admin Users -->
					<div
						class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
					>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Admin Users</p>
								<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
									{stats.admin_users.toLocaleString()}
								</p>
							</div>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600"
							>
								<FontAwesomeIcon icon={faShieldAlt} class="h-6 w-6 text-white" />
							</div>
						</div>
					</div>
				</div>

				<!-- Recent Activity -->
				<div
					class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
						Recent Activity (Last 7 Days)
					</h2>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
							<p class="text-sm font-medium text-gray-600 dark:text-gray-400">New Items</p>
							<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
								{stats.recent_activity.items_last_7_days}
							</p>
						</div>
						<div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
							<p class="text-sm font-medium text-gray-600 dark:text-gray-400">New Yard Sales</p>
							<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
								{stats.recent_activity.yard_sales_last_7_days}
							</p>
						</div>
						<div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
							<p class="text-sm font-medium text-gray-600 dark:text-gray-400">New Events</p>
							<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
								{stats.recent_activity.events_last_7_days}
							</p>
						</div>
						<div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
							<p class="text-sm font-medium text-gray-600 dark:text-gray-400">New Users</p>
							<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
								{stats.recent_activity.users_last_7_days}
							</p>
						</div>
					</div>
				</div>

				<!-- Quick Actions -->
				<div
					class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<button
							onclick={() => goto('/admin/items')}
							class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20"
								>
									<FontAwesomeIcon
										icon={faStore}
										class="h-5 w-5 text-green-600 dark:text-green-400"
									/>
								</div>
								<div class="text-left">
									<p class="font-semibold text-gray-900 dark:text-white">Manage Items</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">View & edit all items</p>
								</div>
							</div>
							<FontAwesomeIcon
								icon={faArrowRight}
								class="h-5 w-5 text-gray-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
							/>
						</button>

						<button
							onclick={() => goto('/admin/yard-sales')}
							class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-purple-500 hover:bg-purple-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:border-purple-500 dark:hover:bg-purple-900/20"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20"
								>
									<FontAwesomeIcon
										icon={faHome}
										class="h-5 w-5 text-purple-600 dark:text-purple-400"
									/>
								</div>
								<div class="text-left">
									<p class="font-semibold text-gray-900 dark:text-white">Manage Yard Sales</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">View & edit all yard sales</p>
								</div>
							</div>
							<FontAwesomeIcon
								icon={faArrowRight}
								class="h-5 w-5 text-gray-400 transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400"
							/>
						</button>

						<button
							onclick={() => goto('/admin/users')}
							class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20"
								>
									<FontAwesomeIcon
										icon={faUsers}
										class="h-5 w-5 text-blue-600 dark:text-blue-400"
									/>
								</div>
								<div class="text-left">
									<p class="font-semibold text-gray-900 dark:text-white">Manage Users</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">View all users</p>
								</div>
							</div>
							<FontAwesomeIcon
								icon={faArrowRight}
								class="h-5 w-5 text-gray-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
							/>
						</button>

						<button
							onclick={() => goto('/admin/events')}
							class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-purple-500 hover:bg-purple-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:border-purple-500 dark:hover:bg-purple-900/20"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20"
								>
									<FontAwesomeIcon
										icon={faCalendar}
										class="h-5 w-5 text-purple-600 dark:text-purple-400"
									/>
								</div>
								<div class="text-left">
									<p class="font-semibold text-gray-900 dark:text-white">Manage Events</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">View & edit all events</p>
								</div>
							</div>
							<FontAwesomeIcon
								icon={faArrowRight}
								class="h-5 w-5 text-gray-400 transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400"
							/>
						</button>

						<button
							onclick={() => goto('/admin/reports')}
							class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-red-500 hover:bg-red-50 dark:border-gray-700 dark:bg-gray-700 dark:hover:border-red-500 dark:hover:bg-red-900/20"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20"
								>
									<FontAwesomeIcon icon={faFlag} class="h-5 w-5 text-red-600 dark:text-red-400" />
								</div>
								<div class="text-left">
									<p class="font-semibold text-gray-900 dark:text-white">Reported Users</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">View all reports</p>
								</div>
							</div>
							<FontAwesomeIcon
								icon={faArrowRight}
								class="h-5 w-5 text-gray-400 transition-colors group-hover:text-red-600 dark:group-hover:text-red-400"
							/>
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
