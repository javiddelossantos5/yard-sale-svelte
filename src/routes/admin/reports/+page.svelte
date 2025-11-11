<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getNotifications,
		getCurrentUser,
		isAdmin,
		markNotificationAsRead,
		type CurrentUser,
		type Notification
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
		faFlag,
		faEye,
		faEyeSlash,
		faClock
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import AppHeader from '$lib/AppHeader.svelte';

	let currentUser = $state<CurrentUser | null>(null);
	let reports = $state<Notification[]>([]);
	let totalReports = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let mobileMenuOpen = $state(false);
	let unreadFilter = $state<'all' | 'unread'>('unread');

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
				loading = false;
				return;
			}

			await loadReports();
		} catch (e: any) {
			console.error('Failed to load reports:', e);
			error = e?.message || 'Failed to load reports';
		} finally {
			loading = false;
		}
	}

	async function loadReports() {
		try {
			const response = await getNotifications(1, 100, unreadFilter === 'unread');
			
			// Filter notifications to only show reports
			const reportNotifications = response.notifications.filter(
				(notif) => notif.type === 'report'
			);
			
			// Sort by created_at descending (newest first)
			reportNotifications.sort((a, b) => {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return dateB - dateA;
			});

			reports = reportNotifications;
			totalReports = reportNotifications.length;
		} catch (e: any) {
			throw new Error(e?.message || 'Failed to load reports');
		}
	}

	async function handleMarkAsRead(report: Notification) {
		if (report.is_read) return;
		
		try {
			await markNotificationAsRead(report.id);
			// Update local state
			report.is_read = true;
		} catch (e: any) {
			console.error('Failed to mark report as read:', e);
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function goToProfile(userId: string) {
		goto(`/profile/${userId}`);
	}

	function handleLogout() {
		logout();
	}

	$effect(() => {
		if (currentUser && isAdmin(currentUser)) {
			unreadFilter; // Track filter changes
			loadReports();
		}
	});

	const mobileMenuItems = $derived.by(() => {
		const items = [];
		if (currentUser && isAdmin(currentUser)) {
			items.push({
				label: 'Admin',
				icon: faShieldAlt,
				action: () => goto('/admin'),
				badge: undefined
			});
		}
		if (currentUser) {
			items.push({
				label: 'Messages',
				icon: faMessage,
				action: () => goto('/messages'),
				badge: $unreadMessageCount > 0 ? $unreadMessageCount : undefined
			});
		}
		return items;
	});
</script>

<svelte:head>
	<title>Reported Users - Admin - Yard Sale Finder</title>
	<meta name="description" content="View and manage user reports" />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<AppHeader
		title="Reported Users"
		subtitle="View and manage user reports"
		currentUser={currentUser}
		showBackButton={true}
		backUrl="/admin"
		backLabel="Admin Dashboard"
		{mobileMenuItems}
	/>

	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-center">
					<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
					<p class="mt-4 text-gray-600 dark:text-gray-400">Loading reports...</p>
				</div>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
				<p class="text-red-800 dark:text-red-200">{error}</p>
			</div>
		{:else}
			<!-- Filters -->
			<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-2">
					<button
						onclick={() => {
							unreadFilter = unreadFilter === 'unread' ? 'all' : 'unread';
						}}
						class="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						<FontAwesomeIcon
							icon={unreadFilter === 'unread' ? faEyeSlash : faEye}
							class="h-4 w-4"
						/>
						<span>{unreadFilter === 'unread' ? 'Unread Only' : 'All Reports'}</span>
					</button>
				</div>
				<div class="text-sm text-gray-600 dark:text-gray-400">
					Total: <span class="font-semibold">{totalReports}</span> report{totalReports !== 1 ? 's' : ''}
				</div>
			</div>

			<!-- Reports List -->
			{#if reports.length === 0}
				<div class="rounded-lg bg-white p-12 text-center shadow-sm dark:bg-gray-800 dark:ring-1 dark:ring-gray-700">
					<FontAwesomeIcon
						icon={faFlag}
						class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
					/>
					<p class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No reports found</p>
					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
						{unreadFilter === 'unread'
							? 'All reports have been reviewed.'
							: 'No reports have been submitted yet.'}
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each reports as report (report.id)}
						<div
							class="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 {report.is_read
								? 'opacity-75'
								: 'ring-2 ring-red-500/20'}"
						>
							<div class="p-6">
								<!-- Header -->
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-3">
											<FontAwesomeIcon
												icon={faFlag}
												class="h-5 w-5 text-red-600 dark:text-red-400"
											/>
											<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
												{report.title}
											</h3>
											{#if !report.is_read}
												<span
													class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-200"
												>
													New
												</span>
											{/if}
										</div>
										<div class="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
											<FontAwesomeIcon icon={faClock} class="h-3 w-3" />
											<span>{formatDate(report.created_at)}</span>
										</div>
									</div>
									{#if !report.is_read}
										<button
											onclick={() => handleMarkAsRead(report)}
											class="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
										>
											Mark as Read
										</button>
									{/if}
								</div>

								<!-- Message -->
								<div class="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
									<p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
										{report.message}
									</p>
								</div>

								<!-- Actions -->
								{#if report.related_user_id}
									<div class="mt-4 flex flex-wrap items-center gap-3">
										<button
											onclick={() => goToProfile(report.related_user_id!)}
											class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
										>
											<FontAwesomeIcon icon={faUser} class="h-4 w-4" />
											<span>View Reported User Profile</span>
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

