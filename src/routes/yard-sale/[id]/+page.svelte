<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getYardSaleById,
		getComments,
		addComment,
		deleteYardSale,
		type YardSale,
		type Comment
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

	let yardSale: YardSale | null = null;
	let comments: Comment[] = [];
	let loading = true;
	let error: string | null = null;
	let newComment = '';
	let submittingComment = false;

	// Message modal state
	let showMessageModal = false;
	let currentUserId = 1; // This should come from auth context in a real app

	// Edit modal state
	let showEditModal = false;
	let isOwner = false;

	// Delete confirmation modal state
	let showDeleteModal = false;

	$: yardSaleId = parseInt($page.params.id || '0');

	onMount(async () => {
		if (isNaN(yardSaleId)) {
			error = 'Invalid yard sale ID';
			loading = false;
			return;
		}

		try {
			await loadYardSale();
			await loadComments();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load yard sale';
		} finally {
			loading = false;
		}
	});

	async function loadYardSale() {
		yardSale = await getYardSaleById(yardSaleId);
		// Check if current user is the owner
		// For now, we'll assume user ID 1 is the current user
		// In a real app, this would come from the auth context
		isOwner = yardSale?.owner_id === currentUserId;
	}

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
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
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
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						></path>
					</svg>
					Back
				</button>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading yard sale...</span>
			</div>
		{/if}

		<!-- Error State -->
		{#if error}
			<div class="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
				<div class="flex">
					<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error loading yard sale</h3>
						<p class="mt-1 text-sm text-red-700">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Yard Sale Details -->
		{#if yardSale && !loading}
			<div class="space-y-6">
				<!-- Main Content -->
				<div
					class="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<div class="p-6 sm:p-8">
						<!-- Title and Location -->
						<div class="mb-8">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<h1
										class="mb-6 text-2xl leading-tight font-bold text-gray-900 sm:text-3xl dark:text-white"
									>
										{yardSale.title}
									</h1>

									<!-- Status Banner -->
									{#if yardSale}
										{@const status = getYardSaleStatus(yardSale)}
										{@const statusMessage = getYardSaleStatusMessage(yardSale)}
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
															d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
													<span class="font-semibold">Upcoming</span>
													<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
												</div>
											{:else if status === 'active'}
												<div
													class="inline-flex items-center rounded-full bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/10 dark:text-green-300"
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
															d="M13 10V3L4 14h7v7l9-11h-7z"
														/>
													</svg>
													<span class="font-semibold">Active Now</span>
													<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
												</div>
											{:else if status === 'on_break'}
												<div class="space-y-2">
													<div
														class="inline-flex items-center rounded-full bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 dark:bg-orange-900/10 dark:text-orange-300"
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
																d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
															/>
														</svg>
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
								</div>

								<!-- Owner Actions -->
								{#if isOwner}
									<div class="ml-4 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
										<button
											onclick={handleEditYardSale}
											class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
													d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
												></path>
											</svg>
											Edit
										</button>
										<button
											onclick={handleDeleteYardSale}
											class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-all hover:bg-red-50 active:scale-95 dark:border-red-600 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-900/30"
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
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												></path>
											</svg>
											Delete
										</button>
									</div>
								{/if}
							</div>

							<div class="flex items-center text-gray-600 dark:text-gray-300">
								<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									></path>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									></path>
								</svg>
								<span class="text-lg"
									>{yardSale.address}, {yardSale.city}, {yardSale.state} {yardSale.zip_code}</span
								>
							</div>
						</div>

						<!-- Date and Time -->
						<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div class="flex items-center text-gray-600 dark:text-gray-300">
								<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									></path>
								</svg>
								<div>
									<div class="font-medium text-gray-900 dark:text-white">Date</div>
									<div class="text-sm">{getDateRange()}</div>
								</div>
							</div>

							<div class="flex items-center text-gray-600 dark:text-gray-300">
								<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									></path>
								</svg>
								<div>
									<div class="font-medium text-gray-900 dark:text-white">Time</div>
									<div class="text-sm">{getTimeRange()}</div>
								</div>
							</div>
						</div>

						<!-- Title -->
						<div class="mb-6">
							<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Title</h2>
							<p class="leading-relaxed text-gray-700 dark:text-gray-300">{yardSale.title}</p>
						</div>

						<!-- Description -->
						<div class="mb-6">
							<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Description</h2>
							<p class="leading-relaxed text-gray-700 dark:text-gray-300">{yardSale.description}</p>
						</div>

						<!-- Categories -->
						<div class="mb-6">
							<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Categories</h2>
							<div class="flex flex-wrap gap-2">
								{#each yardSale.categories as category}
									<span
										class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
									>
										{category}
									</span>
								{/each}
							</div>
						</div>

						<!-- Price and Payment -->
						<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
									Price Range
								</h3>
								<div class="flex items-center text-green-600 dark:text-green-400">
									<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
										></path>
									</svg>
									<span class="text-lg font-medium">{yardSale.price_range}</span>
								</div>
							</div>

							<div>
								<h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
									Payment Methods
								</h3>
								<div class="flex flex-wrap gap-2">
									{#each yardSale.payment_methods as method}
										<div
											class="inline-flex items-center rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
										>
											{#if method.toLowerCase().includes('cash')}
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
														d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
													/>
												</svg>
											{:else if method.toLowerCase().includes('venmo')}
												<svg class="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
													<path
														d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM12 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"
													/>
												</svg>
											{:else if method.toLowerCase().includes('paypal')}
												<svg class="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
													<path
														d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.105-.633c-.89-4.31-3.712-6.067-7.63-6.067H6.28c-.524 0-.968.382-1.05.9L2.47 20.597h4.606l1.12-7.106a.641.641 0 0 1 .633-.74h2.19c4.298 0 7.664-1.747 8.647-6.797.03-.149.054-.294.077-.437.292-1.867-.002-3.137-1.012-4.287z"
													/>
												</svg>
											{:else if method.toLowerCase().includes('zelle')}
												<svg class="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
													<path
														d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
													/>
												</svg>
											{:else if method.toLowerCase().includes('apple')}
												<svg class="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
													<path
														d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
													/>
												</svg>
											{:else if method.toLowerCase().includes('google')}
												<svg class="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
													<path
														d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
													/>
													<path
														d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
													/>
													<path
														d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
													/>
													<path
														d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
													/>
												</svg>
											{:else if method.toLowerCase().includes('card') || method
													.toLowerCase()
													.includes('credit') || method.toLowerCase().includes('debit')}
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
														d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
													/>
												</svg>
											{:else if method.toLowerCase().includes('check')}
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
														d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
											{:else}
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
														d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
													/>
												</svg>
											{/if}
											{method}
										</div>
									{/each}
								</div>
							</div>
						</div>

						<!-- Contact Information -->
						<div class="border-t border-gray-200 pt-6 dark:border-gray-700">
							<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
								Contact Information
							</h2>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<div class="text-sm font-medium text-gray-500 dark:text-gray-400">
										Contact Person
									</div>
									<div class="text-lg text-gray-900 dark:text-white">{yardSale.contact_name}</div>
								</div>

								{#if yardSale.contact_phone}
									<div>
										<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</div>
										<a
											href="tel:{yardSale.contact_phone}"
											class="text-lg text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
										>
											{yardSale.contact_phone}
										</a>
									</div>
								{/if}

								{#if yardSale.contact_email}
									<div>
										<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Email</div>
										<a
											href="mailto:{yardSale.contact_email}"
											class="text-lg text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
										>
											{yardSale.contact_email}
										</a>
									</div>
								{/if}
							</div>

							<!-- Action Buttons -->
							<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
								{#if yardSale.contact_phone}
									{@const isDisabled = !isYardSaleActive(yardSale) || yardSale.status === 'closed'}
									<a
										href={isDisabled ? '#' : `tel:${yardSale.contact_phone}`}
										onclick={isDisabled ? (e) => e.preventDefault() : undefined}
										class="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto {isDisabled
											? 'cursor-not-allowed opacity-50'
											: ''}"
									>
										<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
											></path>
										</svg>
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
										class="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-green-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 sm:w-auto dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
									>
										<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
											></path>
										</svg>
										{yardSale.status === 'closed'
											? 'Closed'
											: !isYardSaleActive(yardSale)
												? 'Event Ended'
												: 'Send Message'}
									</button>
								{/if}

								<!-- Get Directions Button -->
								<button
									onclick={() => {
										if (yardSale) {
											const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
											openDirections(fullAddress);
										}
									}}
									class="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-indigo-600 active:scale-95 sm:w-auto dark:bg-indigo-600 dark:hover:bg-indigo-700"
									title={`Get directions in ${getPlatformName()}`}
								>
									<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
									Get Directions
								</button>
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
