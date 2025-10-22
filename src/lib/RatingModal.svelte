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

	async function handleSubmit() {
		if (rating === 0) {
			error = 'Please select a rating';
			return;
		}

		submitting = true;
		error = null;

		try {
			await createRating(ratedUserId, rating, reviewText.trim() || undefined, yardSaleId);
			onSuccess();
		} catch (err) {
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
			class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<!-- Background overlay -->
			<div
				class="bg-opacity-30 fixed inset-0 bg-gray-500 transition-opacity"
				onclick={(e) => {
					if (e.target === e.currentTarget) {
						closeModal();
					}
				}}
				aria-hidden="true"
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle dark:bg-gray-800"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="dialog"
				tabindex="-1"
			>
				<!-- Header -->
				<div
					class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-600 dark:bg-gray-800"
				>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white" id="modal-title">
							Rate {ratedUserName}
						</h3>
						<button
							onclick={closeModal}
							class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
							disabled={submitting}
						>
							<FontAwesomeIcon icon="times" class="h-5 w-5" />
						</button>
					</div>
				</div>

				<!-- Content -->
				<div class="px-6 py-4">
					{#if yardSaleTitle}
						<p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
							Rating for: <span class="font-medium">{yardSaleTitle}</span>
						</p>
					{/if}

					<!-- Star Rating -->
					<div class="mb-6">
						<label
							for="star-rating"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Rating *
						</label>
						<div
							id="star-rating"
							class="flex items-center space-x-1"
							role="radiogroup"
							aria-label="Rating"
						>
							{#each Array(5) as _, i}
								<button
									onclick={() => setRating(i + 1)}
									class="rounded p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
									disabled={submitting}
								>
									<FontAwesomeIcon
										icon="star"
										class="h-8 w-8 {i < rating
											? 'text-yellow-400'
											: 'text-gray-300 dark:text-gray-600'}"
									/>
								</button>
							{/each}
						</div>
						{#if rating > 0}
							<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
								{rating === 1
									? 'Poor'
									: rating === 2
										? 'Fair'
										: rating === 3
											? 'Good'
											: rating === 4
												? 'Very Good'
												: 'Excellent'}
							</p>
						{/if}
					</div>

					<!-- Review Text -->
					<div class="mb-6">
						<label
							for="review-text"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Review <span class="text-xs text-gray-400">(Optional)</span>
						</label>
						<textarea
							id="review-text"
							bind:value={reviewText}
							rows="4"
							placeholder="Share your experience with this user..."
							class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
							disabled={submitting}
						></textarea>
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="mb-4 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
							<div class="flex">
								<FontAwesomeIcon icon="exclamation-triangle" class="h-5 w-5 text-red-400" />
								<div class="ml-3">
									<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Footer -->
				<div
					class="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-600 dark:bg-gray-700"
				>
					<div class="flex justify-end space-x-3">
						<button
							onclick={closeModal}
							class="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
							disabled={submitting}
						>
							Cancel
						</button>
						<button
							onclick={handleSubmit}
							class="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={submitting || rating === 0}
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
