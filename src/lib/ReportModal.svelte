<script lang="ts">
	import { createReport } from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

	interface Props {
		isOpen: boolean;
		reportedUserId?: number;
		reportedUserName?: string;
		reportedYardSaleId?: number;
		reportedYardSaleTitle?: string;
		onClose: () => void;
		onSuccess: () => void;
	}

	let {
		isOpen,
		reportedUserId,
		reportedUserName,
		reportedYardSaleId,
		reportedYardSaleTitle,
		onClose,
		onSuccess
	}: Props = $props();

	let reportType = $state<'scam' | 'inappropriate' | 'spam' | 'other'>('scam');
	let description = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const reportTypes = [
		{ value: 'scam', label: 'Scam', description: 'Fraudulent or deceptive behavior' },
		{
			value: 'inappropriate',
			label: 'Inappropriate Content',
			description: 'Offensive or inappropriate content'
		},
		{ value: 'spam', label: 'Spam', description: 'Repetitive or unwanted content' },
		{ value: 'other', label: 'Other', description: 'Other violations or concerns' }
	];

	function closeModal() {
		if (!submitting) {
			onClose();
		}
	}

	async function handleSubmit() {
		if (!description.trim()) {
			error = 'Please provide a detailed description';
			return;
		}

		submitting = true;
		error = null;

		try {
			await createReport(reportType, description.trim(), reportedUserId, reportedYardSaleId);
			onSuccess();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to submit report';
		} finally {
			submitting = false;
		}
	}

	function setReportType(type: 'scam' | 'inappropriate' | 'spam' | 'other') {
		reportType = type;
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
							Report {reportedUserName || 'Content'}
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
					{#if reportedYardSaleTitle}
						<p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
							Reporting: <span class="font-medium">{reportedYardSaleTitle}</span>
						</p>
					{/if}

					<!-- Report Type -->
					<div class="mb-6">
						<label
							for="report-type-group"
							class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Report Type *
						</label>
						<div
							id="report-type-group"
							class="space-y-2"
							role="radiogroup"
							aria-label="Report Type"
						>
							{#each reportTypes as type}
								<label
									class="flex cursor-pointer items-start rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
								>
									<input
										type="radio"
										name="reportType"
										value={type.value}
										checked={reportType === type.value}
										onchange={() =>
											setReportType(type.value as 'scam' | 'inappropriate' | 'spam' | 'other')}
										class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
										disabled={submitting}
									/>
									<div class="ml-3 flex-1">
										<div class="text-sm font-medium text-gray-900 dark:text-white">
											{type.label}
										</div>
										<div class="text-xs text-gray-600 dark:text-gray-300">
											{type.description}
										</div>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<!-- Description -->
					<div class="mb-6">
						<label
							for="description"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Detailed Description *
						</label>
						<textarea
							id="description"
							bind:value={description}
							rows="4"
							placeholder="Please provide specific details about what you're reporting..."
							class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
							disabled={submitting}
						></textarea>
						<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
							Please be as specific as possible to help us investigate your report.
						</p>
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
							class="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={submitting || !description.trim()}
						>
							{#if submitting}
								<FontAwesomeIcon icon="spinner" class="mr-2 h-4 w-4 animate-spin" />
								Submitting...
							{:else}
								Submit Report
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
