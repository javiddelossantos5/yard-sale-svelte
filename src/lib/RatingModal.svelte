<script lang="ts">
	import { createRating } from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

	interface Props {
		isOpen: boolean;
		ratedUserId: number;
		ratedUserName: string;
		yardSaleId?: number;
		yardSaleTitle?: string;
		onClose: () => void;
		onSuccess: () => void;
	}

	let { isOpen, ratedUserId, ratedUserName, yardSaleId, yardSaleTitle, onClose, onSuccess }: Props =
		$props();

	let rating = $state(0);
	let reviewText = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	function closeModal() {
		if (!submitting) {
			onClose();
		}
	}

	async function handleSubmit(event?: Event) {
		// Prevent any default form submission behavior
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}

		if (rating === 0) {
			error = 'Please select a rating';
			return;
		}

		submitting = true;
		error = null;

		// Store debug info in localStorage to persist across page reloads
		const debugInfo = {
			timestamp: new Date().toISOString(),
			ratedUserId,
			rating,
			reviewText: reviewText.trim() || undefined,
			yardSaleId,
			action: 'starting_submission'
		};
		localStorage.setItem('rating_debug', JSON.stringify(debugInfo));

		try {
			console.log('Submitting rating:', debugInfo);

			await createRating(ratedUserId, rating, reviewText.trim() || undefined, yardSaleId);

			// Update debug info for success
			localStorage.setItem(
				'rating_debug',
				JSON.stringify({
					...debugInfo,
					action: 'submission_success',
					successTime: new Date().toISOString()
				})
			);

			console.log('Rating submitted successfully');

			// Update debug info for success
			localStorage.setItem(
				'rating_debug',
				JSON.stringify({
					...debugInfo,
					action: 'submission_success',
					successTime: new Date().toISOString()
				})
			);

			// Call success callback after a small delay to prevent immediate navigation
			setTimeout(() => {
				onSuccess();
			}, 100);
		} catch (err) {
			// Update debug info for error
			localStorage.setItem(
				'rating_debug',
				JSON.stringify({
					...debugInfo,
					action: 'submission_error',
					error: err instanceof Error ? err.message : 'Unknown error',
					errorTime: new Date().toISOString()
				})
			);

			console.error('Error submitting rating:', err);
			error = err instanceof Error ? err.message : 'Failed to submit rating';
		} finally {
			submitting = false;
		}
	}

	function setRating(value: number) {
		rating = value;
		error = null;
	}
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		aria-labelledby="modal-title"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="flex min-h-screen items-center justify-center px-4 py-8 text-center sm:block sm:p-0"
		>
			<!-- Background overlay -->
			<div
				class="bg-opacity-40 fixed inset-0 bg-gray-900 backdrop-blur-sm transition-opacity"
				onclick={(e) => {
					if (e.target === e.currentTarget) {
						closeModal();
					}
				}}
				aria-hidden="true"
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block w-full max-w-lg transform overflow-hidden rounded-3xl bg-white/95 text-left align-middle shadow-2xl backdrop-blur-xl transition-all duration-500 ease-out sm:my-8 dark:bg-gray-800/95"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="dialog"
				tabindex="-1"
			>
				<!-- Header -->
				<div
					class="border-b border-gray-200/50 bg-linear-to-r from-gray-50/80 to-gray-100/80 px-6 py-4 backdrop-blur-xl sm:px-8 sm:py-6 dark:border-gray-600/50 dark:from-gray-700/80 dark:to-gray-800/80"
				>
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-bold text-gray-900 dark:text-white" id="modal-title">
							Rate {ratedUserName}
						</h3>
						<button
							onclick={closeModal}
							class="rounded-2xl p-3 text-gray-500 transition-all duration-300 hover:scale-105 hover:bg-gray-200/60 hover:text-gray-700 active:scale-95 dark:text-gray-400 dark:hover:bg-gray-600/60 dark:hover:text-gray-200"
							disabled={submitting}
						>
							<FontAwesomeIcon icon="times" class="h-5 w-5" />
						</button>
					</div>
				</div>

				<!-- Content -->
				<div class="px-6 py-4 sm:px-8 sm:py-6">
					{#if yardSaleTitle}
						<div class="mb-6 rounded-2xl bg-blue-50/60 p-4 backdrop-blur-sm dark:bg-blue-900/20">
							<p class="text-sm text-gray-700 dark:text-gray-200">
								<span class="font-bold">Rating for:</span>
								<span class="font-semibold">{yardSaleTitle}</span>
							</p>
						</div>
					{/if}

					<!-- Star Rating -->
					<div class="mb-6 sm:mb-8">
						<label
							for="star-rating"
							class="mb-4 block text-sm font-bold text-gray-700 dark:text-gray-200"
						>
							Rating <span class="text-red-500">*</span>
						</label>
						<div
							id="star-rating"
							class="flex items-center justify-center space-x-2 rounded-2xl bg-gray-50/60 p-4 backdrop-blur-sm sm:p-6 dark:bg-gray-700/60"
							role="radiogroup"
							aria-label="Rating"
						>
							{#each Array(5) as _, i}
								<button
									onclick={() => setRating(i + 1)}
									class="group rounded-2xl p-2 transition-all duration-300 hover:scale-110 active:scale-95 {i <
									rating
										? 'bg-yellow-100/60 shadow-lg dark:bg-yellow-900/30'
										: 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60'}"
									disabled={submitting}
								>
									<FontAwesomeIcon
										icon="star"
										class="h-8 w-8 transition-all duration-300 sm:h-10 sm:w-10 {i < rating
											? 'text-yellow-500 drop-shadow-lg'
											: 'text-gray-300 group-hover:text-yellow-300 dark:text-gray-600'}"
									/>
								</button>
							{/each}
						</div>
						{#if rating > 0}
							<div class="mt-4 text-center">
								<div
									class="inline-flex items-center rounded-full bg-yellow-100/60 px-4 py-2 backdrop-blur-sm dark:bg-yellow-900/30"
								>
									<FontAwesomeIcon icon="star" class="mr-2 h-4 w-4 text-yellow-500" />
									<span class="text-sm font-bold text-yellow-700 dark:text-yellow-300">
										{rating === 1
											? 'Poor'
											: rating === 2
												? 'Fair'
												: rating === 3
													? 'Good'
													: rating === 4
														? 'Very Good'
														: 'Excellent'}
									</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Review Text -->
					<div class="mb-6 sm:mb-8">
						<label
							for="review-text"
							class="mb-4 block text-sm font-bold text-gray-700 dark:text-gray-200"
						>
							Review <span class="text-xs font-normal text-gray-500">(Optional)</span>
						</label>
						<textarea
							id="review-text"
							bind:value={reviewText}
							rows="4"
							placeholder="Share your experience with this user..."
							class="block w-full appearance-none rounded-2xl border-0 bg-white/80 px-6 py-4 text-gray-900 placeholder-gray-500 shadow-lg ring-1 ring-gray-200/50 backdrop-blur-sm transition-all duration-300 ring-inset focus:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700/80 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600/50 dark:focus:ring-blue-400"
							disabled={submitting}
						></textarea>
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="mb-6 rounded-2xl bg-red-100/60 p-4 backdrop-blur-sm dark:bg-red-900/30">
							<div class="flex items-center">
								<div
									class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-200/60 dark:bg-red-800/40"
								>
									<FontAwesomeIcon
										icon="exclamation-triangle"
										class="h-4 w-4 text-red-600 dark:text-red-400"
									/>
								</div>
								<p class="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- Footer -->
				<div
					class="border-t border-gray-200/50 bg-linear-to-r from-gray-50/80 to-gray-100/80 px-6 py-4 backdrop-blur-xl sm:px-8 sm:py-6 dark:border-gray-600/50 dark:from-gray-700/80 dark:to-gray-800/80"
				>
					<div class="flex justify-end space-x-4">
						<button
							onclick={closeModal}
							class="rounded-2xl border-2 border-gray-300 bg-white/80 px-6 py-3 text-sm font-bold text-gray-700 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95 dark:border-gray-600 dark:bg-gray-700/80 dark:text-gray-200 dark:hover:bg-gray-600/80"
							disabled={submitting}
						>
							Cancel
						</button>
						<button
							onclick={(e) => handleSubmit(e)}
							class="rounded-2xl bg-linear-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
							disabled={submitting || rating === 0}
							type="button"
						>
							{#if submitting}
								<FontAwesomeIcon icon="spinner" class="mr-2 h-4 w-4 animate-spin" />
								Submitting...
							{:else}
								Submit Rating
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
