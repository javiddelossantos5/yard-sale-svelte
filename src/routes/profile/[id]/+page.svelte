<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getUserProfile,
		getUserRatings,
		getCurrentUser,
		createRating,
		createReport,
		type CurrentUser,
		type Rating,
		type Report
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import RatingModal from '$lib/RatingModal.svelte';
	import ReportModal from '$lib/ReportModal.svelte';
	import MessageModal from '$lib/MessageModal.svelte';

	let profileUser = $state<CurrentUser | null>(null);
	let currentUser = $state<CurrentUser | null>(null);
	let ratings = $state<Rating[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Modal states
	let showRatingModal = $state(false);
	let showReportModal = $state(false);
	let showMessageModal = $state(false);

	let userId = $derived(parseInt($page.params.id || '0'));
	let isOwnProfile = $derived(currentUser?.id === userId);
	let canRate = $derived(currentUser && !isOwnProfile);

	onMount(async () => {
		if (isNaN(userId)) {
			error = 'Invalid user ID';
			loading = false;
			return;
		}

		try {
			// Load data with individual error handling
			await loadCurrentUser();
			await loadProfileUser();
			await loadRatings();
		} catch (err) {
			console.error('Error during profile loading:', err);
		} finally {
			// Always set loading to false
			loading = false;
		}
	});

	async function loadCurrentUser() {
		try {
			currentUser = await getCurrentUser();
		} catch (error) {
			console.warn('Failed to load current user:', error);
			currentUser = null;
		}
	}

	async function loadProfileUser() {
		try {
			profileUser = await getUserProfile(userId);
		} catch (err) {
			console.error('Failed to load profile user:', err);
			error = err instanceof Error ? err.message : 'Failed to load profile';
		}
	}

	async function loadRatings() {
		try {
			ratings = await getUserRatings(userId);
		} catch (error) {
			console.error('Failed to load ratings:', error);
			ratings = []; // Set empty array as fallback
		}
	}

	function handleRateUser() {
		const debugInfo = {
			timestamp: new Date().toISOString(),
			canRate,
			currentUserId: currentUser?.id,
			isOwnProfile,
			profileUserId: profileUser?.id,
			action: 'rate_user_clicked'
		};

		console.log('handleRateUser called:', debugInfo);
		localStorage.setItem('profile_debug', JSON.stringify(debugInfo));

		if (canRate) {
			showRatingModal = true;
			console.log('Rating modal opened');
			localStorage.setItem(
				'profile_debug',
				JSON.stringify({
					...debugInfo,
					action: 'modal_opened'
				})
			);
		} else {
			console.log('Cannot rate user:', { canRate, currentUser, isOwnProfile });
			localStorage.setItem(
				'profile_debug',
				JSON.stringify({
					...debugInfo,
					action: 'cannot_rate_user'
				})
			);
		}
	}

	function handleReportUser() {
		if (currentUser && !isOwnProfile) {
			showReportModal = true;
		}
	}

	function handleMessageUser() {
		if (currentUser && !isOwnProfile) {
			showMessageModal = true;
		}
	}

	function handleCloseMessageModal() {
		showMessageModal = false;
	}

	async function handleRatingSuccess() {
		const debugInfo = {
			timestamp: new Date().toISOString(),
			action: 'rating_success_callback',
			profileUserId: profileUser?.id
		};

		console.log('Rating submitted successfully, refreshing data...');
		localStorage.setItem('profile_debug', JSON.stringify(debugInfo));

		try {
			await Promise.all([loadRatings(), loadProfileUser()]);
			console.log('Data refreshed successfully');
			localStorage.setItem(
				'profile_debug',
				JSON.stringify({
					...debugInfo,
					action: 'data_refresh_success'
				})
			);
		} catch (error) {
			console.error('Error refreshing data after rating:', error);
			localStorage.setItem(
				'profile_debug',
				JSON.stringify({
					...debugInfo,
					action: 'data_refresh_error',
					error: error instanceof Error ? error.message : 'Unknown error'
				})
			);
		}
		showRatingModal = false;
	}

	async function handleReportSuccess() {
		showReportModal = false;
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{profileUser ? `${profileUser.full_name} - Profile` : 'User Profile'}</title>
	<meta name="description" content={profileUser?.bio || 'View user profile'} />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<header class="bg-white shadow-sm dark:bg-gray-800">
		<div class="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<button
					onclick={() => goto('/')}
					class="inline-flex items-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
				>
					<FontAwesomeIcon icon="arrow-left" class="h-5 w-5" />
				</button>
				<h1 class="text-lg font-semibold text-gray-900 dark:text-white">Profile</h1>
				<div class="w-9"></div>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-8 w-8 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading profile...</span>
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
		{:else if profileUser}
			<div class="space-y-6">
				<!-- Profile Header -->
				<div
					class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<div class="flex flex-col items-center text-center sm:flex-row sm:text-left">
						<!-- Avatar -->
						<div class="mb-4 sm:mr-6 sm:mb-0">
							<div
								class="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white"
							>
								{profileUser.full_name?.charAt(0).toUpperCase() || '?'}
							</div>
						</div>

						<!-- Profile Info -->
						<div class="flex-1">
							<div class="flex flex-col items-center sm:items-start">
								<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
									{profileUser.full_name || 'Unknown User'}
								</h1>
								<p class="text-gray-600 dark:text-gray-300">@{profileUser.username || 'unknown'}</p>

								<!-- Trust Metrics -->
								<div class="mt-3 flex flex-wrap items-center gap-4">
									{#if profileUser.average_rating !== undefined}
										<div class="flex items-center">
											<div class="flex items-center">
												{#each Array(5) as _, i}
													<FontAwesomeIcon
														icon={i < Math.floor(profileUser.average_rating || 0) ? 'star' : 'star'}
														class="h-4 w-4 {i < Math.floor(profileUser.average_rating || 0)
															? 'text-yellow-400'
															: 'text-gray-300 dark:text-gray-600'}"
													/>
												{/each}
											</div>
											<span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">
												{profileUser.average_rating?.toFixed(1)} ({profileUser.total_ratings || 0} reviews)
											</span>
										</div>
									{/if}
								</div>

								<!-- Location -->
								{#if profileUser.location && profileUser.location.city}
									<div class="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-300">
										<FontAwesomeIcon icon="map-marker-alt" class="mr-1 h-4 w-4" />
										{profileUser.location.city}, {profileUser.location.state}
									</div>
								{/if}
							</div>
						</div>

						<!-- Action Buttons -->
						<div class="mt-4 flex flex-col gap-2 sm:mt-0">
							{#if currentUser && !isOwnProfile}
								<button
									onclick={handleMessageUser}
									class="inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 active:scale-95"
								>
									<FontAwesomeIcon icon="envelope" class="mr-2 h-4 w-4" />
									Message User
								</button>
							{/if}

							{#if canRate}
								<button
									onclick={handleRateUser}
									class="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95"
								>
									<FontAwesomeIcon icon="star" class="mr-2 h-4 w-4" />
									Rate User
								</button>
							{/if}

							{#if currentUser && !isOwnProfile}
								<button
									onclick={handleReportUser}
									class="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
								>
									<FontAwesomeIcon icon="flag" class="mr-2 h-4 w-4" />
									Report
								</button>
							{/if}
						</div>
					</div>

					<!-- Bio -->
					{#if profileUser.bio}
						<div class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
							<p class="text-gray-700 dark:text-gray-300">{profileUser.bio}</p>
						</div>
					{/if}
				</div>

				<!-- Reviews -->
				{#if ratings.length > 0}
					<div
						class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
					>
						<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Reviews</h2>
						<div class="space-y-4">
							{#each ratings as rating}
								<div
									class="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0 dark:border-gray-700"
								>
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="flex items-center gap-2">
												<div class="flex items-center">
													{#each Array(5) as _, i}
														<FontAwesomeIcon
															icon="star"
															class="h-4 w-4 {i < rating.rating
																? 'text-yellow-400'
																: 'text-gray-300 dark:text-gray-600'}"
														/>
													{/each}
												</div>
												<span class="text-sm font-medium text-gray-900 dark:text-white">
													{rating.reviewer_username || 'Anonymous'}
												</span>
												<span class="text-xs text-gray-500 dark:text-gray-400">
													{formatDate(rating.created_at)}
												</span>
											</div>
											{#if rating.review_text}
												<p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
													{rating.review_text}
												</p>
											{/if}
											{#if rating.yard_sale_title}
												<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
													For: {rating.yard_sale_title}
												</p>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Modals -->
{#if showRatingModal && profileUser}
	<RatingModal
		isOpen={showRatingModal}
		ratedUserId={profileUser.id}
		ratedUserName={profileUser.full_name || 'Unknown User'}
		onClose={() => (showRatingModal = false)}
		onSuccess={handleRatingSuccess}
	/>
{/if}

{#if showReportModal && profileUser}
	<ReportModal
		isOpen={showReportModal}
		reportedUserId={profileUser.id}
		reportedUserName={profileUser.full_name || 'Unknown User'}
		onClose={() => (showReportModal = false)}
		onSuccess={handleReportSuccess}
	/>
{/if}

{#if showMessageModal && profileUser && currentUser}
	<MessageModal
		isOpen={showMessageModal}
		yardSaleId={0}
		yardSaleTitle="Profile Message"
		otherUserId={profileUser.id}
		otherUsername={profileUser.full_name || profileUser.username || 'Unknown User'}
		currentUserId={currentUser.id}
		onClose={handleCloseMessageModal}
	/>
{/if}
