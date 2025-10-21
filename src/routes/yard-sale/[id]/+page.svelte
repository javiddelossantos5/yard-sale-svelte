<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getYardSaleById,
		getComments,
		addComment,
		deleteYardSale,
		getCurrentUser,
		type YardSale,
		type Comment,
		type CurrentUser
	} from '$lib/api';
	import MessageModal from '$lib/MessageModal.svelte';
	import EditYardSaleModal from '$lib/EditYardSaleModal.svelte';
	import DeleteConfirmationModal from '$lib/DeleteConfirmationModal.svelte';
	import { getAccessToken } from '$lib/auth';
	import {
		getYardSaleStatus,
		getYardSaleStatusMessage,
		getTimeRemainingMessage,
		isYardSaleActive
	} from '$lib/yardSaleUtils';
	import { openDirections, getPlatformName } from '$lib/mapsUtils';
	import { isYardSaleVisited, toggleYardSaleVisited } from '$lib/visitedYardSales';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { getPaymentMethodIcon } from '$lib/paymentUtils';

	let yardSale = $state<YardSale | null>(null);
	let comments = $state<Comment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let availablePaymentMethods = $state<any[]>([
		{ id: 'cash', name: 'Cash', icon: 'dollar-sign', icon_type: 'solid' },
		{ id: 'credit-card', name: 'Credit Card', icon: 'credit-card', icon_type: 'solid' },
		{ id: 'debit-card', name: 'Debit Card', icon: 'credit-card', icon_type: 'solid' },
		{ id: 'venmo', name: 'Venmo', icon: 'check-circle', icon_type: 'solid' },
		{ id: 'paypal', name: 'PayPal', icon: 'paypal', icon_type: 'brand' },
		{ id: 'zelle', name: 'Zelle', icon: 'check-circle', icon_type: 'solid' },
		{ id: 'apple', name: 'Apple Pay', icon: 'apple', icon_type: 'brand' },
		{ id: 'google', name: 'Google Pay', icon: 'google', icon_type: 'brand' },
		{ id: 'square', name: 'Square', icon: 'credit-card', icon_type: 'solid' }
	]);
	let newComment = $state('');
	let submittingComment = $state(false);

	// Message modal state
	let showMessageModal = $state(false);
	let currentUser = $state<CurrentUser | null>(null);
	let currentUserId = $derived(currentUser?.id || null);

	// Visited state
	let isVisited = $state(false);

	// Edit modal state
	let showEditModal = $state(false);
	let isOwner = $state(false);

	// Debug: Watch for changes in isOwner
	$effect(() => {
		console.log('=== OWNERSHIP DEBUG ===');
		console.log('isOwner changed to:', isOwner);
		console.log('currentUserId:', currentUserId);
		console.log('yardSale?.owner_id:', yardSale?.owner_id);
		console.log('currentUser:', currentUser);
		console.log('========================');
	});

	// Delete confirmation modal state
	let showDeleteModal = $state(false);

	let yardSaleId = $derived(parseInt($page.params.id || '0'));

	onMount(async () => {
		if (isNaN(yardSaleId)) {
			error = 'Invalid yard sale ID';
			loading = false;
			return;
		}

		try {
			await loadCurrentUser();
			await loadYardSale();
			await loadComments();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load yard sale';
		} finally {
			loading = false;
		}
	});

	async function loadCurrentUser() {
		try {
			currentUser = await getCurrentUser();
			console.log('Current user loaded:', currentUser);
			console.log('Current user ID:', currentUser?.id);
		} catch (error) {
			console.warn('Failed to load current user:', error);
			console.warn('Error details:', error);
			// User might not be logged in, that's okay
			// Set currentUser to null to indicate no user is logged in
			currentUser = null;
		}
	}

	async function loadYardSale() {
		yardSale = await getYardSaleById(yardSaleId);
		console.log('Yard sale loaded:', yardSale);
		console.log('Yard sale owner_id:', yardSale?.owner_id);
		console.log('Current user ID:', currentUserId);

		// Check if current user is the owner
		console.log('Comparing owner_id:', yardSale?.owner_id, 'with currentUserId:', currentUserId);
		console.log('owner_id type:', typeof yardSale?.owner_id);
		console.log('currentUserId type:', typeof currentUserId);
		console.log('Strict equality:', yardSale?.owner_id === currentUserId);
		console.log('Loose equality:', yardSale?.owner_id == currentUserId);

		isOwner = yardSale?.owner_id === currentUserId;
		console.log('Is owner?', isOwner);

		// Initialize visited state
		if (yardSale) {
			isVisited = isYardSaleVisited(yardSale.id);
		}
	}

	// Update ownership when current user changes
	$effect(() => {
		if (yardSale && currentUserId !== null) {
			console.log('Re-evaluating ownership due to currentUserId change');
			console.log('yardSale.owner_id:', yardSale.owner_id);
			console.log('currentUserId:', currentUserId);
			const newIsOwner = yardSale.owner_id === currentUserId;
			console.log('New isOwner value:', newIsOwner);
			isOwner = newIsOwner;
		}
	});

	// Ownership calculation is now handled by the reactive effect above

	async function loadComments() {
		comments = await getComments(yardSaleId);
	}

	async function handleSubmitComment() {
		if (!newComment.trim() || submittingComment) return;

		submittingComment = true;
		try {
			const comment = await addComment(yardSaleId, newComment.trim());
			comments = [...comments, comment];
			newComment = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add comment';
		} finally {
			submittingComment = false;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatTime(timeString: string): string {
		return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function getDateRange(): string {
		if (!yardSale) return '';
		const startDate = formatDate(yardSale.start_date);
		if (yardSale.end_date) {
			const endDate = formatDate(yardSale.end_date);
			return `${startDate} - ${endDate}`;
		}
		return startDate;
	}

	function getTimeRange(): string {
		if (!yardSale) return '';
		const startTime = formatTime(yardSale.start_time);
		const endTime = formatTime(yardSale.end_time);
		return `${startTime} - ${endTime}`;
	}

	function formatPhoneNumber(phone: string): string {
		// Remove all non-digit characters
		const cleaned = phone.replace(/\D/g, '');

		// Check if it's a 10-digit US phone number
		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
		}

		// Check if it's an 11-digit number starting with 1
		if (cleaned.length === 11 && cleaned.startsWith('1')) {
			return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
		}

		// Return original if it doesn't match expected format
		return phone;
	}

	function formatCommentDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function handleSendMessage() {
		if (yardSale && yardSale.allow_messages) {
			showMessageModal = true;
		}
	}

	function handleCloseMessageModal() {
		showMessageModal = false;
	}

	function handleEditYardSale() {
		showEditModal = true;
	}

	function handleCloseEditModal() {
		showEditModal = false;
	}

	async function handleEditSuccess() {
		// Reload yard sale data after successful edit
		await loadYardSale();
	}

	function handleDeleteYardSale() {
		showDeleteModal = true;
	}

	function handleCloseDeleteModal() {
		showDeleteModal = false;
	}

	function handleToggleVisited() {
		if (yardSale) {
			isVisited = toggleYardSaleVisited(yardSale.id);
			// Trigger a page refresh to update the main page sorting
			// This is a simple solution - in a more complex app, you'd use a global state manager
			setTimeout(() => {
				window.dispatchEvent(new CustomEvent('visitedStatusChanged'));
			}, 100);
		}
	}

	async function handleConfirmDelete() {
		if (!yardSale) return;

		try {
			await deleteYardSale(yardSale.id);
			// Redirect to main page after successful deletion
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete yard sale';
			// Keep the modal open so user can try again or cancel
		}
	}
</script>

<svelte:head>
	<title>{yardSale ? `${yardSale.title} - Yard Sale Finder` : 'Yard Sale Details'}</title>
	<meta name="description" content={yardSale?.description || 'View yard sale details'} />
	<style>
		:global(html, body) {
			background-color: rgb(249 250 251); /* bg-gray-50 */
		}
		:global(.dark html, .dark body) {
			background-color: rgb(17 24 39); /* bg-gray-900 */
		}
	</style>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900" style="min-height: 100vh;">
	<!-- Header -->
	<header
		class="border-b bg-white/80 shadow-sm backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/80"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-4">
				<button
					onclick={() => goto('/')}
					class="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-95 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
				>
					<FontAwesomeIcon icon="arrow-left" class="mr-2 h-4 w-4" />
					Back
				</button>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-12 w-12 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading yard sale...</span>
			</div>
		{/if}

		<!-- Error State -->
		{#if error}
			<div class="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
				<div class="flex">
					<FontAwesomeIcon icon="exclamation-triangle" class="h-5 w-5 text-red-400" />
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error loading yard sale</h3>
						<p class="mt-1 text-sm text-red-700">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Yard Sale Details -->
		{#if yardSale && !loading}
			<div class="mx-auto max-w-4xl space-y-8">
				<!-- Hero Section -->
				<div
					class="relative overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<div class="px-8 py-12 sm:px-12 sm:py-16">
						<!-- Header with Actions -->
						<div class="mb-8 flex items-start justify-between">
							<div class="flex-1">
								<!-- Visited Indicator -->
								{#if isVisited}
									<div class="mb-4">
										<div
											class="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
										>
											<FontAwesomeIcon icon="check" class="mr-2 h-4 w-4" />
											<span class="font-medium">Already Visited</span>
										</div>
									</div>
								{/if}

								<!-- Status Banner -->
								{#if yardSale}
									{@const status = getYardSaleStatus(yardSale)}
									{@const timeRemaining = getTimeRemainingMessage(yardSale)}

									<div class="mb-6">
										{#if status === 'expired'}
											<div
												class="inline-flex items-center rounded-full bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-900/10 dark:text-red-300"
											>
												<svg
													class="mr-2 h-4 w-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
												<span class="font-semibold">Expired</span>
												<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
											</div>
										{:else if status === 'upcoming'}
											<div
												class="inline-flex items-center rounded-full bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 dark:bg-blue-900/10 dark:text-blue-300"
											>
												<FontAwesomeIcon icon="clock" class="mr-2 h-4 w-4" />
												<span class="font-semibold">Upcoming</span>
												<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
											</div>
										{:else if status === 'active'}
											<div
												class="inline-flex items-center rounded-full bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/10 dark:text-green-300"
											>
												<FontAwesomeIcon icon="check-circle" class="mr-2 h-4 w-4" />
												<span class="font-semibold">Active Now</span>
												<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
											</div>
										{:else if status === 'on_break'}
											<div class="space-y-2">
												<div
													class="inline-flex items-center rounded-full bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 dark:bg-orange-900/10 dark:text-orange-300"
												>
													<FontAwesomeIcon icon="clock" class="mr-2 h-4 w-4" />
													<span class="font-semibold">On Break</span>
													<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
												</div>
												{#if yardSale.status_reason}
													<div class="text-sm text-orange-600 dark:text-orange-400">
														{yardSale.status_reason}
													</div>
												{/if}
											</div>
										{:else if status === 'closed'}
											<div class="space-y-2">
												<div
													class="inline-flex items-center rounded-full bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
												>
													<svg
														class="mr-2 h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
													<span class="font-semibold">Closed</span>
													<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
												</div>
												{#if yardSale.status_reason}
													<div class="text-sm text-gray-500 dark:text-gray-400">
														{yardSale.status_reason}
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{/if}

								<!-- Title -->
								<h1
									class="mb-6 text-3xl leading-tight font-bold text-gray-900 sm:text-4xl dark:text-white"
								>
									{yardSale.title}
								</h1>

								<!-- Location -->
								<div class="flex items-center text-gray-600 dark:text-gray-300">
									<svg
										class="mr-3 h-5 w-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
									<button
										onclick={(e) => {
											e.stopPropagation();
											if (yardSale) {
												const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
												openDirections(fullAddress);
											}
										}}
										class="text-left text-lg font-medium text-blue-600 hover:text-blue-700 hover:underline focus:underline focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
										title={`Click to open in ${getPlatformName()}`}
									>
										{yardSale.address}, {yardSale.city}, {yardSale.state}
										{yardSale.zip_code}
									</button>
								</div>
							</div>

							<!-- Owner Actions -->
							{#if isOwner}
								<div class="ml-6 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
									<button
										onclick={handleEditYardSale}
										class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
									>
										<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
										Edit
									</button>
									<button
										onclick={handleDeleteYardSale}
										class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-medium text-red-700 transition-all hover:bg-red-50 active:scale-95 dark:border-red-600 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-900/30"
									>
										<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
										Delete
									</button>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Main Content Grid -->
				<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
					<!-- Left Column - Main Info -->
					<div class="space-y-8 lg:col-span-2">
						<!-- Date and Time Card -->
						<div
							class="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div class="flex items-start space-x-4">
									<div
										class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20"
									>
										<svg
											class="h-6 w-6 text-blue-600 dark:text-blue-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
									</div>
									<div>
										<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Date</h3>
										<p class="text-gray-600 dark:text-gray-300">{getDateRange()}</p>
									</div>
								</div>

								<div class="flex items-start space-x-4">
									<div
										class="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20"
									>
										<svg
											class="h-6 w-6 text-green-600 dark:text-green-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
									<div>
										<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Time</h3>
										<p class="text-gray-600 dark:text-gray-300">{getTimeRange()}</p>
									</div>
								</div>
							</div>
						</div>

						<!-- Description Card -->
						<div
							class="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Description</h2>
							<p class="leading-relaxed text-gray-700 dark:text-gray-300">{yardSale.description}</p>
						</div>

						<!-- Categories Card -->
						<div
							class="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Categories</h2>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
								{#each yardSale.categories as category}
									<span
										class="inline-flex items-center justify-center rounded-xl border border-gray-200/50 bg-blue-50/60 px-4 py-2 text-center text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md dark:border-gray-700/50 dark:bg-blue-900/20 dark:text-gray-200 dark:hover:bg-blue-900/30"
									>
										{category}
									</span>
								{/each}
							</div>
						</div>

						<!-- Contact Information Card -->
						<div
							class="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
								Contact Information
							</h2>
							<div class="flex flex-wrap gap-3">
								<!-- Contact Person Tag -->
								<div
									class="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
								>
									<FontAwesomeIcon icon="user" class="mr-2 h-4 w-4" />
									{yardSale.contact_name}
								</div>

								{#if yardSale.contact_phone}
									<!-- Phone Tag -->
									<a
										href="tel:{yardSale.contact_phone}"
										class="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-200 dark:bg-green-900/20 dark:text-green-200 dark:hover:bg-green-900/30"
									>
										<FontAwesomeIcon icon="phone" class="mr-2 h-4 w-4" />
										{formatPhoneNumber(yardSale.contact_phone)}
									</a>
								{/if}

								{#if yardSale.contact_email}
									<!-- Email Tag -->
									<a
										href="mailto:{yardSale.contact_email}"
										class="inline-flex items-center rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:hover:bg-purple-900/30"
									>
										<FontAwesomeIcon icon="envelope" class="mr-2 h-4 w-4" />
										{yardSale.contact_email}
									</a>
								{/if}
							</div>
						</div>
					</div>

					<!-- Right Column - Sidebar -->
					<div class="space-y-6">
						<!-- Price Range Card -->
						<div
							class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<div class="flex items-center space-x-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20"
								>
									<svg
										class="h-5 w-5 text-green-600 dark:text-green-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
										/>
									</svg>
								</div>
								<div>
									<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Price Range</h3>
									<p class="text-lg font-semibold text-gray-900 dark:text-white">
										{yardSale.price_range}
									</p>
								</div>
							</div>
						</div>

						<!-- Action Buttons Card -->
						<div
							class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Actions</h3>
							<div class="space-y-3">
								{#if yardSale.contact_phone}
									{@const isDisabled = !isYardSaleActive(yardSale) || yardSale.status === 'closed'}
									<a
										href={isDisabled ? '#' : `tel:${yardSale.contact_phone}`}
										onclick={isDisabled ? (e) => e.preventDefault() : undefined}
										class="flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 {isDisabled
											? 'cursor-not-allowed opacity-50'
											: ''}"
									>
										<FontAwesomeIcon icon="phone" class="mr-2 h-4 w-4" />
										{yardSale.status === 'closed'
											? 'Closed'
											: !isYardSaleActive(yardSale)
												? 'Event Ended'
												: 'Call Now'}
									</a>
								{/if}

								{#if yardSale.allow_messages}
									{@const isDisabled = !isYardSaleActive(yardSale) || yardSale.status === 'closed'}
									<button
										onclick={isDisabled ? undefined : handleSendMessage}
										disabled={isDisabled}
										class="flex w-full items-center justify-center rounded-full bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
									>
										<FontAwesomeIcon icon="envelope" class="mr-2 h-4 w-4" />
										{yardSale.status === 'closed'
											? 'Closed'
											: !isYardSaleActive(yardSale)
												? 'Event Ended'
												: 'Send Message'}
									</button>
								{/if}

								<!-- Get Directions Button -->
								<button
									onclick={(e) => {
										e.stopPropagation();
										if (yardSale) {
											const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
											openDirections(fullAddress);
										}
									}}
									class="flex w-full items-center justify-center rounded-full bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-700"
								>
									<FontAwesomeIcon icon="map-marker-alt" class="mr-2 h-4 w-4" />
									Get Directions
								</button>

								<!-- Visited Toggle Button - Only show for active/started yard sales -->
								{#if yardSale && getYardSaleStatus(yardSale) !== 'upcoming'}
									<button
										onclick={handleToggleVisited}
										class="flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-all active:scale-95 {isVisited
											? 'bg-gray-500 text-white hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700'
											: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}"
									>
										{#if isVisited}
											<FontAwesomeIcon icon="check" class="mr-2 h-4 w-4" />
											Visited
										{:else}
											<FontAwesomeIcon icon="eye" class="mr-2 h-4 w-4" />
											Mark Visited
										{/if}
									</button>
								{/if}
							</div>
						</div>

						<!-- Payment Methods Card -->
						<div
							class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
								Payment Methods
							</h3>
							<div class="space-y-3">
								{#each yardSale.payment_methods as method}
									{@const iconInfo = getPaymentMethodIcon(method, availablePaymentMethods)}
									{@const isVenmoWithUrl =
										method.toLowerCase().includes('venmo') && yardSale.venmo_url}
									{#if isVenmoWithUrl}
										<a
											href={yardSale.venmo_url}
											target="_blank"
											rel="noopener noreferrer"
											class="flex items-center space-x-3 rounded-lg bg-blue-500 p-3 transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
											title="Pay with Venmo"
										>
											<FontAwesomeIcon
												icon={iconInfo.iconType === 'brand'
													? ['fab', iconInfo.icon]
													: iconInfo.icon}
												class="h-5 w-5 text-white"
											/>
											<span class="font-medium text-white">{method}</span>
										</a>
									{:else}
										<div
											class="flex items-center space-x-3 rounded-lg bg-gray-200 p-3 dark:bg-gray-600"
										>
											<FontAwesomeIcon
												icon={iconInfo.iconType === 'brand'
													? ['fab', iconInfo.icon]
													: iconInfo.icon}
												class="h-5 w-5 text-gray-600 dark:text-gray-400"
											/>
											<span class="font-medium text-gray-700 dark:text-gray-200">{method}</span>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- Comments Section -->
				<div
					class="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<div class="border-b border-gray-200 px-6 py-6 sm:px-8 dark:border-gray-700">
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
							Comments ({comments.length})
						</h2>
					</div>

					<!-- Add Comment Form -->
					{#if yardSale && isYardSaleActive(yardSale)}
						<div class="border-b border-gray-200 px-6 py-6 sm:px-8 dark:border-gray-700">
							<form
								onsubmit={(e) => {
									e.preventDefault();
									handleSubmitComment();
								}}
							>
								<div class="mb-6">
									<label
										for="comment"
										class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Add a Comment
									</label>
									<textarea
										id="comment"
										bind:value={newComment}
										rows="4"
										placeholder="Ask a question or share your thoughts about this yard sale..."
										class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
										required
									></textarea>
								</div>
								<button
									type="submit"
									disabled={submittingComment || !newComment.trim()}
									class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{#if submittingComment}
										<svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Posting...
									{:else}
										Post Comment
									{/if}
								</button>
							</form>
						</div>
					{:else if yardSale}
						<!-- Expired Event Message -->
						<div class="border-b border-gray-200 px-6 py-6 sm:px-8 dark:border-gray-700">
							<div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
								<div class="flex">
									<svg
										class="h-5 w-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<div class="ml-3">
										<h3 class="text-sm font-medium text-gray-800 dark:text-gray-200">
											Comments Closed
										</h3>
										<div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
											<p>This yard sale has ended, so new comments are no longer being accepted.</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Comments List -->
					<div class="px-6 py-6 sm:px-8">
						{#if comments.length === 0}
							<div class="py-8 text-center">
								<svg
									class="mx-auto h-12 w-12 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
									></path>
								</svg>
								<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
									No comments yet
								</h3>
								<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Be the first to ask a question or share your thoughts!
								</p>
							</div>
						{:else}
							<div class="space-y-6">
								{#each comments as comment (comment.id)}
									<div
										class="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0 dark:border-gray-700"
									>
										<div class="flex items-start space-x-3">
											<div class="shrink-0">
												<div
													class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20"
												>
													<span class="text-sm font-medium text-blue-600 dark:text-blue-400">
														{comment.username.charAt(0).toUpperCase()}
													</span>
												</div>
											</div>
											<div class="min-w-0 flex-1">
												<div class="flex items-center space-x-2">
													<p class="text-sm font-medium text-gray-900 dark:text-white">
														{comment.username}
													</p>
													<span class="text-sm text-gray-500 dark:text-gray-400">•</span>
													<time
														class="text-sm text-gray-500 dark:text-gray-400"
														datetime={comment.created_at}
													>
														{formatCommentDate(comment.created_at)}
													</time>
												</div>
												<div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
													<p>{comment.content}</p>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Message Modal -->
	{#if yardSale}
		<MessageModal
			isOpen={showMessageModal}
			yardSaleId={yardSale.id}
			yardSaleTitle={yardSale.title}
			otherUserId={isOwner ? currentUserId : yardSale.owner_id}
			otherUsername={isOwner ? 'You' : yardSale.owner_username}
			{currentUserId}
			onClose={handleCloseMessageModal}
		/>
	{/if}

	<!-- Edit Yard Sale Modal -->
	{#if yardSale && showEditModal}
		<EditYardSaleModal
			isOpen={showEditModal}
			{yardSale}
			onClose={handleCloseEditModal}
			onSuccess={handleEditSuccess}
		/>
	{/if}

	<!-- Delete Confirmation Modal -->
	<DeleteConfirmationModal
		isOpen={showDeleteModal}
		itemName="yard sale"
		onClose={handleCloseDeleteModal}
		onConfirm={handleConfirmDelete}
	/>
</div>
