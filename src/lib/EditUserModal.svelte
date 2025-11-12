<script lang="ts">
	import { updateUser, deleteUser, type CurrentUser, type UserUpdateData } from './api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faShieldAlt, faUser, faTrash } from '@fortawesome/free-solid-svg-icons';

	let { isOpen, onClose, onSuccess, user } = $props<{
		isOpen: boolean;
		onClose: () => void;
		onSuccess: () => void;
		user: CurrentUser | null;
	}>();

	let formData = $state<UserUpdateData>({
		full_name: '',
		email: '',
		phone_number: '',
		company: '',
		city: '',
		state: '',
		zip_code: '',
		bio: '',
		is_active: true,
		permissions: 'user'
	});

	let newPassword = $state('');
	let confirmPassword = $state('');
	let showPasswordFields = $state(false);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let showDeleteConfirm = $state(false);
	let deleting = $state(false);

	// Initialize form data when modal opens
	$effect(() => {
		if (isOpen && user) {
			formData = {
				full_name: user.full_name || '',
				email: user.email || '',
				phone_number: user.phone_number || '',
				company: (user as any).company || '',
				city: user.location?.city || '',
				state: user.location?.state || '',
				zip_code: user.location?.zip || '',
				bio: user.bio || '',
				is_active: (user as any).is_active ?? true,
				permissions: user.permissions === 'admin' ? 'admin' : 'user'
			};
			newPassword = '';
			confirmPassword = '';
			showPasswordFields = false;
			error = null;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!user) {
			error = 'No user selected';
			return;
		}

		// Validate password if password fields are shown
		if (showPasswordFields) {
			if (newPassword && newPassword.length < 8) {
				error = 'Password must be at least 8 characters long';
				return;
			}
			if (newPassword && newPassword !== confirmPassword) {
				error = 'Passwords do not match';
				return;
			}
		}

		loading = true;
		error = null;

		try {
			// Clean up empty strings (convert to undefined for optional fields)
			const cleanedData: UserUpdateData = {
				...formData,
				company: formData.company?.trim() || undefined,
				phone_number: formData.phone_number?.trim() || undefined,
				city: formData.city?.trim() || undefined,
				state: formData.state?.trim() || undefined,
				zip_code: formData.zip_code?.trim() || undefined,
				bio: formData.bio?.trim() || undefined
			};

			// Only include password if it was provided
			if (showPasswordFields && newPassword && newPassword.trim() !== '') {
				cleanedData.password = newPassword.trim();
			}

			await updateUser(user.id, cleanedData);
			onSuccess();
			onClose();
			// Reset password fields
			newPassword = '';
			confirmPassword = '';
			showPasswordFields = false;
		} catch (e: any) {
			error = e?.message || 'Failed to update user';
		} finally {
			loading = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	async function handleDelete() {
		if (!user) {
			error = 'No user selected';
			return;
		}

		deleting = true;
		error = null;

		try {
			await deleteUser(user.id);
			onSuccess();
			onClose();
			showDeleteConfirm = false;
		} catch (e: any) {
			error = e?.message || 'Failed to delete user';
		} finally {
			deleting = false;
		}
	}
</script>

{#if isOpen && user}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		role="dialog"
		aria-modal="true"
		onclick={handleBackdropClick}
	>
		<div
			class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<div
				class="fixed inset-0 bg-black/50 backdrop-blur-sm"
				onclick={onClose}
				aria-hidden="true"
			></div>

			<div
				class="relative inline-block transform overflow-hidden rounded-2xl bg-white/95 text-left align-bottom shadow-2xl ring-1 ring-white/20 backdrop-blur-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle dark:bg-gray-800/95 dark:ring-gray-700/50"
			>
				<div
					class="border-b border-gray-200/50 bg-white/80 px-6 py-5 dark:border-gray-700/50 dark:bg-gray-800/80"
				>
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-semibold text-gray-900 dark:text-white">Edit User</h3>
						<button
							type="button"
							class="rounded-full bg-gray-100 p-2 text-gray-500 transition-all duration-200 hover:bg-gray-200 hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
							onclick={onClose}
						>
							<span class="sr-only">Close</span>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/></svg
							>
						</button>
					</div>
				</div>

				<form onsubmit={handleSubmit} class="bg-white/80 px-6 py-6 dark:bg-gray-800/80">
					{#if error}
						<div
							class="mb-6 rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800"
						>
							<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
						</div>
					{/if}

					<div class="max-h-[60vh] space-y-6 overflow-y-auto pr-2">
						<!-- User Info Header -->
						<div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
							<div class="flex items-center gap-3">
								<div
									class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white"
								>
									{user.full_name?.charAt(0).toUpperCase() || '?'}
								</div>
								<div class="min-w-0 flex-1">
									<h4 class="truncate text-base font-semibold text-gray-900 dark:text-white">
										{user.full_name || 'Unknown User'}
									</h4>
									<p class="truncate text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
								</div>
							</div>
						</div>

						<!-- Full Name -->
						<div>
							<label
								for="full_name"
								class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>Full Name</label
							>
							<input
								id="full_name"
								type="text"
								bind:value={formData.full_name}
								required
								class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								placeholder="Enter full name"
							/>
						</div>

						<!-- Email -->
						<div>
							<label
								for="email"
								class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>Email</label
							>
							<input
								id="email"
								type="email"
								bind:value={formData.email}
								required
								class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								placeholder="Enter email address"
							/>
						</div>

						<!-- Phone Number -->
						<div>
							<label
								for="phone_number"
								class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>Phone Number <span class="font-normal text-gray-400">(Optional)</span></label
							>
							<input
								id="phone_number"
								type="tel"
								bind:value={formData.phone_number}
								class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								placeholder="Enter phone number"
							/>
						</div>

						<!-- Company -->
						<div>
							<label
								for="company"
								class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>Company <span class="font-normal text-gray-400">(Optional)</span></label
							>
							<input
								id="company"
								type="text"
								maxlength="150"
								bind:value={formData.company}
								class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								placeholder="Enter company name"
							/>
						</div>

						<!-- Location Fields -->
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<!-- City -->
							<div>
								<label
									for="city"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>City</label
								>
								<input
									id="city"
									type="text"
									bind:value={formData.city}
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="City"
								/>
							</div>

							<!-- State -->
							<div>
								<label
									for="state"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>State</label
								>
								<input
									id="state"
									type="text"
									bind:value={formData.state}
									maxlength="2"
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="ST"
								/>
							</div>

							<!-- Zip Code -->
							<div>
								<label
									for="zip_code"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>Zip Code</label
								>
								<input
									id="zip_code"
									type="text"
									bind:value={formData.zip_code}
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="Zip code"
								/>
							</div>
						</div>

						<!-- Bio -->
						<div>
							<label
								for="bio"
								class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">Bio</label
							>
							<textarea
								id="bio"
								bind:value={formData.bio}
								rows="4"
								class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								placeholder="Enter bio"
							></textarea>
						</div>

						<!-- Is Active -->
						<div>
							<label class="flex items-center gap-3">
								<input
									type="checkbox"
									bind:checked={formData.is_active}
									class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
								/>
								<span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
									>Active User</span
								>
							</label>
							<p class="mt-1 ml-7 text-xs text-gray-500 dark:text-gray-400">
								Inactive users cannot log in or use the platform.
							</p>
						</div>

						<!-- Permissions -->
						<div>
							<label
								for="permissions"
								class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>Permissions</label
							>
							<select
								id="permissions"
								bind:value={formData.permissions}
								class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
							>
								<option value="user">User</option>
								<option value="admin">Admin</option>
							</select>
							<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
								Admin users have full access to manage users, items, and yard sales.
							</p>
						</div>

						<!-- Password Change Section -->
						<div class="border-t border-gray-200 pt-6 dark:border-gray-700">
							<div class="mb-4 flex items-center justify-between">
								<div>
									<h4 class="text-base font-semibold text-gray-900 dark:text-white">
										Change Password
									</h4>
									<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
										Leave blank to keep current password
									</p>
								</div>
								<button
									type="button"
									onclick={() => {
										showPasswordFields = !showPasswordFields;
										if (!showPasswordFields) {
											newPassword = '';
											confirmPassword = '';
										}
									}}
									class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
								>
									{showPasswordFields ? 'Cancel' : 'Change Password'}
								</button>
							</div>

							{#if showPasswordFields}
								<div class="space-y-4">
									<!-- New Password -->
									<div>
										<label
											for="new_password"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>New Password <span class="font-normal text-gray-400">(Optional)</span></label
										>
										<input
											id="new_password"
											type="password"
											bind:value={newPassword}
											placeholder="Enter new password (min 8 characters)"
											minlength="8"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<!-- Confirm Password -->
									<div>
										<label
											for="confirm_password"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Confirm Password <span class="font-normal text-gray-400">(Optional)</span
											></label
										>
										<input
											id="confirm_password"
											type="password"
											bind:value={confirmPassword}
											placeholder="Confirm new password"
											minlength="8"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- Actions -->
					<div class="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
						<div class="flex gap-3">
							<button
								type="button"
								onclick={onClose}
								class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={loading}
								class="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if loading}
									<span class="flex items-center justify-center gap-2">
										<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
										Updating...
									</span>
								{:else}
									Update User
								{/if}
							</button>
						</div>
						<!-- Delete Button -->
						<button
							type="button"
							onclick={() => {
								error = null;
								showDeleteConfirm = true;
							}}
							disabled={loading || deleting}
							class="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-all duration-200 hover:bg-red-100 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
						>
							<FontAwesomeIcon icon={faTrash} class="h-4 w-4" />
							Delete User
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	{#if showDeleteConfirm}
		<div class="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
			<div
				class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
			>
				<div
					class="fixed inset-0 bg-black/60 backdrop-blur-sm"
					onclick={() => {
						showDeleteConfirm = false;
						error = null;
					}}
					aria-hidden="true"
				></div>

				<div
					class="relative inline-block transform overflow-hidden rounded-2xl bg-white/95 text-left align-bottom shadow-2xl ring-1 ring-white/20 backdrop-blur-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle dark:bg-gray-800/95 dark:ring-gray-700/50"
				>
					<div
						class="border-b border-gray-200/50 bg-white/80 px-6 py-5 dark:border-gray-700/50 dark:bg-gray-800/80"
					>
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-semibold text-red-600 dark:text-red-400">Delete User</h3>
							<button
								type="button"
								class="rounded-full bg-gray-100 p-2 text-gray-500 transition-all duration-200 hover:bg-gray-200 hover:text-gray-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
								onclick={() => {
									showDeleteConfirm = false;
									error = null;
								}}
							>
								<span class="sr-only">Close</span>
								<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/></svg
								>
							</button>
						</div>
					</div>

					<div class="bg-white/80 px-6 py-6 dark:bg-gray-800/80">
						{#if error}
							<div
								class="mb-4 rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800"
							>
								<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
							</div>
						{/if}

						<div class="space-y-4">
							<p class="text-sm text-gray-700 dark:text-gray-300">
								Are you sure you want to delete <strong
									>{user?.full_name || user?.username || 'this user'}</strong
								>? This action cannot be undone.
							</p>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								This will permanently delete the user account and all associated data.
							</p>
						</div>

						<div class="mt-6 flex gap-3">
							<button
								type="button"
								onclick={() => {
									showDeleteConfirm = false;
									error = null;
								}}
								disabled={deleting}
								class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								Cancel
							</button>
							<button
								type="button"
								onclick={handleDelete}
								disabled={deleting}
								class="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if deleting}
									<span class="flex items-center justify-center gap-2">
										<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
									</span>
								{:else}
									Delete User
								{/if}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}
