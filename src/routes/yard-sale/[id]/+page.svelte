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
	<header class="border-b bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-4">
				<button
					onclick={() => goto('/')}
					class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						></path>
					</svg>
					Back to Yard Sales
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
			<div class="space-y-8">
				<!-- Main Content -->
				<div class="rounded-lg bg-white shadow-sm">
					<div class="p-8">
						<!-- Title and Location -->
						<div class="mb-6">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<h1 class="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
										{yardSale.title}
									</h1>
								</div>

								<!-- Owner Actions -->
								{#if isOwner}
									<div class="ml-4 flex space-x-2">
										<button
											onclick={handleEditYardSale}
											class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
											class="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:border-red-600 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
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

							<div class="flex items-center text-gray-600">
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
							<div class="flex items-center text-gray-600">
								<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									></path>
								</svg>
								<div>
									<div class="font-medium text-gray-900">Date</div>
									<div class="text-sm">{getDateRange()}</div>
								</div>
							</div>

							<div class="flex items-center text-gray-600">
								<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									></path>
								</svg>
								<div>
									<div class="font-medium text-gray-900">Time</div>
									<div class="text-sm">{getTimeRange()}</div>
								</div>
							</div>
						</div>

						<!-- Description -->
						<div class="mb-6">
							<h2 class="mb-3 text-xl font-semibold text-gray-900">Description</h2>
							<p class="leading-relaxed text-gray-700">{yardSale.description}</p>
						</div>

						<!-- Categories -->
						<div class="mb-6">
							<h2 class="mb-3 text-xl font-semibold text-gray-900">Categories</h2>
							<div class="flex flex-wrap gap-2">
								{#each yardSale.categories as category}
									<span
										class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
									>
										{category}
									</span>
								{/each}
							</div>
						</div>

						<!-- Price and Payment -->
						<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<h3 class="mb-2 text-lg font-semibold text-gray-900">Price Range</h3>
								<div class="flex items-center text-green-600">
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
								<h3 class="mb-2 text-lg font-semibold text-gray-900">Payment Methods</h3>
								<div class="text-gray-700">{yardSale.payment_methods.join(', ')}</div>
							</div>
						</div>

						<!-- Contact Information -->
						<div class="border-t pt-6">
							<h2 class="mb-4 text-xl font-semibold text-gray-900">Contact Information</h2>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<div class="text-sm font-medium text-gray-500">Contact Person</div>
									<div class="text-lg text-gray-900">{yardSale.contact_name}</div>
								</div>

								{#if yardSale.contact_phone}
									<div>
										<div class="text-sm font-medium text-gray-500">Phone</div>
										<a
											href="tel:{yardSale.contact_phone}"
											class="text-lg text-blue-600 hover:text-blue-800"
										>
											{yardSale.contact_phone}
										</a>
									</div>
								{/if}

								{#if yardSale.contact_email}
									<div>
										<div class="text-sm font-medium text-gray-500">Email</div>
										<a
											href="mailto:{yardSale.contact_email}"
											class="text-lg text-blue-600 hover:text-blue-800"
										>
											{yardSale.contact_email}
										</a>
									</div>
								{/if}
							</div>

							<!-- Action Buttons -->
							<div class="mt-6 flex flex-wrap gap-3">
								{#if yardSale.contact_phone}
									<a
										href="tel:{yardSale.contact_phone}"
										class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
									>
										<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
											></path>
										</svg>
										Call Now
									</a>
								{/if}

								{#if yardSale.allow_messages}
									<button
										onclick={handleSendMessage}
										class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
									>
										<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
											></path>
										</svg>
										Send Message
									</button>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Comments Section -->
				<div class="rounded-lg bg-white shadow-sm">
					<div class="border-b border-gray-200 px-8 py-6">
						<h2 class="text-xl font-semibold text-gray-900">
							Comments ({comments.length})
						</h2>
					</div>

					<!-- Add Comment Form -->
					<div class="border-b border-gray-200 px-8 py-6">
						<form
							onsubmit={(e) => {
								e.preventDefault();
								handleSubmitComment();
							}}
						>
							<div class="mb-4">
								<label for="comment" class="mb-2 block text-sm font-medium text-gray-700">
									Add a Comment
								</label>
								<textarea
									id="comment"
									bind:value={newComment}
									rows="3"
									placeholder="Ask a question or share your thoughts about this yard sale..."
									class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
									required
								></textarea>
							</div>
							<button
								type="submit"
								disabled={submittingComment || !newComment.trim()}
								class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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

					<!-- Comments List -->
					<div class="px-8 py-6">
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
								<h3 class="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
								<p class="mt-1 text-sm text-gray-500">
									Be the first to ask a question or share your thoughts!
								</p>
							</div>
						{:else}
							<div class="space-y-6">
								{#each comments as comment (comment.id)}
									<div class="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
										<div class="flex items-start space-x-3">
											<div class="shrink-0">
												<div
													class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100"
												>
													<span class="text-sm font-medium text-blue-600">
														{comment.username.charAt(0).toUpperCase()}
													</span>
												</div>
											</div>
											<div class="min-w-0 flex-1">
												<div class="flex items-center space-x-2">
													<p class="text-sm font-medium text-gray-900">{comment.username}</p>
													<span class="text-sm text-gray-500">•</span>
													<time class="text-sm text-gray-500" datetime={comment.created_at}>
														{formatCommentDate(comment.created_at)}
													</time>
												</div>
												<div class="mt-1 text-sm text-gray-700">
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
			otherUserId={yardSale.owner_id}
			otherUsername={yardSale.owner_username}
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
