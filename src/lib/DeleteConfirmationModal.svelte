<script lang="ts">
	let {
		isOpen,
		onClose,
		onConfirm,
		itemName = 'yard sale'
	} = $props<{
		isOpen: boolean;
		onClose: () => void;
		onConfirm: () => void;
		itemName?: string;
	}>();

	let isDeleting = $state(false);

	async function handleConfirm() {
		isDeleting = true;
		try {
			await onConfirm();
			onClose();
		} catch (error) {
			// Error handling is done in the parent component
		} finally {
			isDeleting = false;
		}
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
				class="bg-opacity-75 dark:bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity dark:bg-gray-900"
				onclick={onClose}
				aria-hidden="true"
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle dark:bg-gray-800"
			>
				<!-- Header -->
				<div
					class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800"
				>
					<div class="flex items-center">
						<div
							class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20"
						>
							<svg
								class="h-6 w-6 text-red-600 dark:text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<!-- Content -->
				<div class="bg-white px-6 py-4 dark:bg-gray-800">
					<div class="text-center">
						<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white" id="modal-title">
							Delete {itemName}
						</h3>
						<div class="mb-4">
							<p class="text-sm text-gray-500 dark:text-gray-400">
								Are you sure you want to delete this {itemName}? This action cannot be undone.
							</p>
						</div>

						<!-- Warning Box -->
						<div
							class="mb-6 rounded-md bg-red-50 p-4 dark:border dark:border-red-800 dark:bg-red-900/20"
						>
							<div class="flex">
								<div class="shrink-0">
									<svg
										class="h-5 w-5 text-red-400"
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
								</div>
								<div class="ml-3">
									<h4 class="text-sm font-medium text-red-800 dark:text-red-200">
										Permanent Deletion
									</h4>
									<div class="mt-2 text-sm text-red-700 dark:text-red-300">
										<p>
											This will permanently delete your {itemName} and all associated data including:
										</p>
										<ul class="mt-2 list-inside list-disc space-y-1">
											<li>All comments and messages</li>
											<li>Contact information</li>
											<li>Photos and descriptions</li>
											<li>Event details and location</li>
										</ul>
										<p class="mt-2 font-medium">This action cannot be reversed or undone.</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div
					class="border-t border-gray-200 bg-gray-50 px-6 py-3 sm:flex sm:flex-row-reverse dark:border-gray-700 dark:bg-gray-700"
				>
					<button
						type="button"
						onclick={handleConfirm}
						disabled={isDeleting}
						class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
					>
						{#if isDeleting}
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
							Deleting...
						{:else}
							<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
							Yes, Delete Permanently
						{/if}
					</button>
					<button
						type="button"
						onclick={onClose}
						disabled={isDeleting}
						class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
