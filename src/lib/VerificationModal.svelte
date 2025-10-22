<script lang="ts">
	import { requestVerification } from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faEnvelope, faPhone, faIdCard, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSuccess: () => void;
	}

	let { isOpen, onClose, onSuccess }: Props = $props();

	let selectedType = $state<'email' | 'phone' | 'identity' | 'address'>('email');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	const verificationTypes = [
		{
			value: 'email',
			label: 'Email Verification',
			description: 'Verify your email address',
			icon: faEnvelope,
			details: "We'll send a verification link to your registered email address."
		},
		{
			value: 'phone',
			label: 'Phone Verification',
			description: 'Verify your phone number',
			icon: faPhone,
			details: "We'll send a verification code via SMS to your phone number."
		},
		{
			value: 'identity',
			label: 'Identity Verification',
			description: 'Verify your identity',
			icon: faIdCard,
			details: 'Upload a government-issued ID for identity verification.'
		},
		{
			value: 'address',
			label: 'Address Verification',
			description: 'Verify your address',
			icon: faMapMarkerAlt,
			details: 'Provide proof of address (utility bill, bank statement, etc.).'
		}
	];

	function closeModal() {
		if (!submitting) {
			onClose();
		}
	}

	async function handleSubmit() {
		submitting = true;
		error = null;
		success = null;

		try {
			await requestVerification(selectedType);
			success = `${verificationTypes.find((t) => t.value === selectedType)?.label} request submitted successfully!`;
			setTimeout(() => {
				onSuccess();
			}, 2000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to submit verification request';
		} finally {
			submitting = false;
		}
	}

	function setType(type: 'email' | 'phone' | 'identity' | 'address') {
		selectedType = type;
		error = null;
		success = null;
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
				class="relative inline-block w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle dark:bg-gray-800"
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
							Get Verified
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
					<p class="mb-6 text-sm text-gray-600 dark:text-gray-300">
						Choose a verification type to increase your trust score and show other users that you're
						a verified member.
					</p>

					<!-- Verification Types -->
					<div class="mb-6">
						<label
							for="verification-type-group"
							class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Verification Type *
						</label>
						<div
							id="verification-type-group"
							class="space-y-3"
							role="radiogroup"
							aria-label="Verification Type"
						>
							{#each verificationTypes as type}
								<label
									class="flex cursor-pointer items-start rounded-xl border p-4 transition-all hover:bg-gray-50 dark:hover:bg-gray-700 {selectedType ===
									type.value
										? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
										: 'border-gray-200 dark:border-gray-600'}"
								>
									<input
										type="radio"
										name="verificationType"
										value={type.value}
										checked={selectedType === type.value}
										onchange={() =>
											setType(type.value as 'email' | 'phone' | 'identity' | 'address')}
										class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
										disabled={submitting}
									/>
									<div class="ml-3 flex-1">
										<div class="flex items-center">
											<FontAwesomeIcon
												icon={type.icon}
												class="mr-2 h-5 w-5 {selectedType === type.value
													? 'text-blue-600 dark:text-blue-400'
													: 'text-gray-400 dark:text-gray-500'}"
											/>
											<div>
												<div class="text-sm font-medium text-gray-900 dark:text-white">
													{type.label}
												</div>
												<div class="text-xs text-gray-600 dark:text-gray-300">
													{type.description}
												</div>
											</div>
										</div>
										<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
											{type.details}
										</p>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<!-- Success Message -->
					{#if success}
						<div class="mb-4 rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
							<div class="flex">
								<FontAwesomeIcon icon="check-circle" class="h-5 w-5 text-green-400" />
								<div class="ml-3">
									<p class="text-sm text-green-700 dark:text-green-300">{success}</p>
								</div>
							</div>
						</div>
					{/if}

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
							disabled={submitting}
						>
							{#if submitting}
								<FontAwesomeIcon icon="spinner" class="mr-2 h-4 w-4 animate-spin" />
								Submitting...
							{:else}
								Request Verification
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
