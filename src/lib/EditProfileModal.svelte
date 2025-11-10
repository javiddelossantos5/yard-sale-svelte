<script lang="ts">
	import { updateUserProfile, getAuthenticatedImageUrl, getUserImages, uploadImage, type CurrentUser, type UploadedImage, type UserSelfUpdate } from './api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faTimes, faCamera, faTrash } from '@fortawesome/free-solid-svg-icons';

	let {
		isOpen,
		onClose,
		onSuccess,
		user
	}: {
		isOpen: boolean;
		onClose: () => void;
		onSuccess: () => void;
		user: CurrentUser | null;
	} = $props();

	let formData = $state<UserSelfUpdate>({
		full_name: '',
		phone_number: '',
		company: '',
		city: '',
		state: '',
		zip_code: '',
		bio: '',
		profile_picture: null
	});

	let loading = $state(false);
	let error = $state<string | null>(null);
	let isUploading = $state(false);
	let allUserImages = $state<UploadedImage[]>([]);
	let showImageSelector = $state(false);

	const states = [
		'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
		'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
		'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
		'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
		'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
	];

	// Initialize form data when modal opens or user changes
	$effect(() => {
		if (isOpen && user) {
			formData = {
				full_name: user.full_name || '',
				phone_number: user.phone_number || '',
				company: user.company || '',
				city: user.location?.city || '',
				state: user.location?.state || '',
				zip_code: user.location?.zip || '',
				bio: user.bio || '',
				profile_picture: user.profile_picture || null
			};
			loadUserImages();
		}
	});

	async function loadUserImages() {
		try {
			allUserImages = await getUserImages();
		} catch (err) {
			console.warn('Failed to load user images:', err);
		}
	}

	async function handleFileUpload(files: FileList | null) {
		if (!files || files.length === 0) return;

		const file = files[0];

		if (!file.type.startsWith('image/')) {
			error = 'Please select an image file';
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			error = 'Image size must be less than 5MB';
			return;
		}

		error = null;
		isUploading = true;

		try {
			const uploadedImage = await uploadImage(file);
			if (uploadedImage.url && uploadedImage.url.trim() !== '') {
				formData.profile_picture = uploadedImage.url;
				await loadUserImages();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to upload image';
		} finally {
			isUploading = false;
		}
	}

	function handleFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		handleFileUpload(target.files);
		target.value = '';
	}

	function selectImage(imageUrl: string) {
		formData.profile_picture = imageUrl;
		showImageSelector = false;
	}

	function removeProfilePicture() {
		formData.profile_picture = null;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = null;
		loading = true;

		try {
			// Clean up empty strings (convert to undefined for optional fields)
			const cleanedData: UserSelfUpdate = {
				...formData,
				company: formData.company?.trim() || undefined,
				phone_number: formData.phone_number?.trim() || undefined,
				city: formData.city?.trim() || undefined,
				state: formData.state?.trim() || undefined,
				zip_code: formData.zip_code?.trim() || undefined,
				bio: formData.bio?.trim() || undefined
			};
			await updateUserProfile(cleanedData);
			onSuccess();
			onClose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update profile';
		} finally {
			loading = false;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.classList.contains('modal-backdrop')) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop fixed inset-0 z-50 overflow-y-auto"
		role="dialog"
		aria-modal="true"
		onclick={handleBackdropClick}
	>
		<div
			class="flex min-h-screen items-end justify-center px-4 pt-6 pb-6 text-center sm:block sm:p-0"
		>
			<div
				class="fixed inset-0 bg-black/50 backdrop-blur-sm"
				aria-hidden="true"
			></div>

			<div
				class="relative inline-block w-full transform overflow-hidden rounded-t-2xl bg-white/95 text-left align-bottom shadow-2xl ring-1 ring-white/20 backdrop-blur-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:rounded-2xl sm:align-middle dark:bg-gray-800/95 dark:ring-gray-700/50"
			>
				<div
					class="border-b border-gray-200/50 bg-white/80 px-6 py-6 sm:py-5 dark:border-gray-700/50 dark:bg-gray-800/80"
				>
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-semibold text-gray-900 dark:text-white">Edit Profile</h3>
						<button
							type="button"
							class="rounded-full bg-gray-100 p-2 text-gray-500 transition-all duration-200 hover:bg-gray-200 hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
							onclick={onClose}
						>
							<span class="sr-only">Close</span>
							<FontAwesomeIcon icon={faTimes} class="h-5 w-5" />
						</button>
					</div>
				</div>

				<form onsubmit={handleSubmit} class="max-h-[85vh] overflow-y-auto sm:max-h-[70vh]">
					<div class="bg-white/80 px-6 py-8 sm:px-6 sm:py-6 dark:bg-gray-800/80">
						{#if error}
							<div
								class="mb-6 rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800"
							>
								<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
							</div>
						{/if}

						<div class="space-y-8 sm:space-y-6">
							<!-- Profile Picture Section -->
							<div>
								<label class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300">
									Profile Picture <span class="font-normal text-gray-400">(Optional)</span>
								</label>
								<div class="flex items-center gap-4">
									<!-- Current Profile Picture -->
									<div class="relative">
										{#if formData.profile_picture}
											<img
												src={getAuthenticatedImageUrl(formData.profile_picture)}
												alt="Profile"
												class="h-24 w-24 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
											/>
										{:else}
											<div
												class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white"
											>
												{formData.full_name?.charAt(0).toUpperCase() || '?'}
											</div>
										{/if}
										{#if formData.profile_picture}
											<button
												type="button"
												onclick={removeProfilePicture}
												class="absolute -right-2 -top-2 rounded-full bg-red-500 p-1.5 text-white shadow-lg transition-all hover:bg-red-600"
												aria-label="Remove profile picture"
											>
												<FontAwesomeIcon icon={faTrash} class="h-3 w-3" />
											</button>
										{/if}
									</div>

									<!-- Upload/Select Buttons -->
									<div class="flex flex-col gap-2">
										<label
											for="profile-picture-upload"
											class="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
										>
											<FontAwesomeIcon icon={faCamera} class="mr-2 h-4 w-4" />
											{isUploading ? 'Uploading...' : 'Upload New'}
										</label>
										<input
											id="profile-picture-upload"
											type="file"
											accept="image/*"
											onchange={handleFileInput}
											class="hidden"
											disabled={isUploading}
										/>
										<button
											type="button"
											onclick={() => (showImageSelector = !showImageSelector)}
											class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
										>
											Select from Uploaded
										</button>
									</div>
								</div>

								<!-- Image Selector -->
								{#if showImageSelector && allUserImages.length > 0}
									<div class="mt-4 grid grid-cols-4 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
										{#each allUserImages as image}
											<button
												type="button"
												onclick={() => selectImage(image.url)}
												class="relative overflow-hidden rounded-lg border-2 transition-all {formData.profile_picture ===
												image.url
													? 'border-blue-500 ring-2 ring-blue-500'
													: 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'}"
											>
												<img
													src={getAuthenticatedImageUrl(image.url)}
													alt={image.filename}
													class="h-20 w-full object-cover"
												/>
												{#if formData.profile_picture === image.url}
													<div
														class="absolute inset-0 flex items-center justify-center bg-blue-500/20"
													>
														<div
															class="rounded-full bg-blue-500 p-1 text-white"
														>
															<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
																<path
																	fill-rule="evenodd"
																	d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																	clip-rule="evenodd"
																/>
															</svg>
														</div>
													</div>
												{/if}
											</button>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Full Name -->
							<div>
								<label
									for="edit-full-name"
									class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
								>
									Full Name
								</label>
								<input
									id="edit-full-name"
									type="text"
									bind:value={formData.full_name}
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="Enter your full name"
								/>
							</div>

							<!-- Phone Number -->
							<div>
								<label
									for="edit-phone"
									class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
								>
									Phone Number <span class="font-normal text-gray-400">(Optional)</span>
								</label>
								<input
									id="edit-phone"
									type="tel"
									bind:value={formData.phone_number}
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="(555) 123-4567"
								/>
							</div>

							<!-- Company -->
							<div>
								<label
									for="edit-company"
									class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
								>
									Company <span class="font-normal text-gray-400">(Optional)</span>
								</label>
								<input
									id="edit-company"
									type="text"
									maxlength="150"
									bind:value={formData.company}
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="Enter your company name"
								/>
							</div>

							<!-- Location Section -->
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<!-- City -->
								<div>
									<label
										for="edit-city"
										class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
									>
										City
									</label>
									<input
										id="edit-city"
										type="text"
										bind:value={formData.city}
										class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										placeholder="City"
									/>
								</div>

								<!-- State -->
								<div>
									<label
										for="edit-state"
										class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
									>
										State
									</label>
									<select
										id="edit-state"
										bind:value={formData.state}
										class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
									>
										<option value="">Select State</option>
										{#each states as state}
											<option value={state}>{state}</option>
										{/each}
									</select>
								</div>

								<!-- Zip Code -->
								<div>
									<label
										for="edit-zip"
										class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
									>
										Zip Code
									</label>
									<input
										id="edit-zip"
										type="text"
										bind:value={formData.zip_code}
										class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										placeholder="12345"
									/>
								</div>
							</div>

							<!-- Bio -->
							<div>
								<label
									for="edit-bio"
									class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
								>
									Bio <span class="font-normal text-gray-400">(Optional)</span>
								</label>
								<textarea
									id="edit-bio"
									rows="4"
									bind:value={formData.bio}
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="Tell us about yourself..."
								></textarea>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<div
						class="border-t border-gray-200/50 bg-gray-50/80 px-6 py-6 sm:flex sm:flex-row-reverse sm:py-4 dark:border-gray-700/50 dark:bg-gray-700/80"
					>
						<button
							type="submit"
							disabled={loading}
							class="inline-flex w-full justify-center rounded-xl border border-transparent bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto sm:py-3.5"
						>
							{#if loading}
								<svg class="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
								Saving...
							{:else}
								Save Changes
							{/if}
						</button>
						<button
							type="button"
							onclick={onClose}
							class="mt-3 inline-flex w-full justify-center rounded-xl border border-gray-300 bg-white px-6 py-4 text-base font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 sm:mt-0 sm:ml-3 sm:w-auto sm:py-3.5 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

