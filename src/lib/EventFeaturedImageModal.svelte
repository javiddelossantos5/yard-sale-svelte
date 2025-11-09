<script lang="ts">
	import {
		getEventImages,
		setEventFeaturedImage,
		removeEventFeaturedImage,
		getAuthenticatedImageUrl,
		type EventImagesResponse
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faXmark, faStar, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons';

	let {
		isOpen,
		eventId,
		onClose,
		onSuccess
	}: {
		isOpen: boolean;
		eventId: string;
		onClose: () => void;
		onSuccess?: () => void;
	} = $props();

	let images = $state<EventImagesResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let saving = $state(false);
	let selectedImage: string | null = $state(null);
	let selectedType: 'gallery' | 'uploaded' | 'current' | null = $state(null);

	$effect(() => {
		if (isOpen && eventId) {
			loadImages();
		} else {
			// Reset state when modal closes
			images = null;
			loading = true;
			error = null;
			selectedImage = null;
			selectedType = null;
		}
	});

	async function loadImages() {
		loading = true;
		error = null;
		try {
			images = await getEventImages(eventId);
			console.log('Loaded images:', images);
			// Set current featured image as selected if it exists
			if (images.featured_image) {
				selectedImage = images.featured_image;
				// Determine which type it is (compare normalized URLs)
				const featuredBase = normalizeUrl(images.featured_image);
				const inGallery = (images.event_gallery_urls || []).some(
					(url) => normalizeUrl(url) === featuredBase
				);
				const inUploaded = (images.images || []).some(
					(img) => normalizeUrl(img.url) === featuredBase
				);

				if (inGallery) {
					selectedType = 'gallery';
				} else if (inUploaded) {
					selectedType = 'uploaded';
				} else {
					selectedType = 'current';
				}
			}
		} catch (e: any) {
			console.error('Error loading images:', e);
			error = e?.message || 'Failed to load images';
		} finally {
			loading = false;
		}
	}

	function normalizeUrl(url: string | null | undefined): string {
		// Handle null/undefined/non-string values
		if (!url || typeof url !== 'string') {
			return '';
		}
		// Remove query parameters and normalize for comparison
		return url.split('?')[0];
	}

	function selectImage(imageUrl: string, type: 'gallery' | 'uploaded' | 'current') {
		selectedImage = imageUrl;
		selectedType = type;
		console.log('Selected image:', imageUrl, 'type:', type);
	}

	function extractImageKey(imageUrl: string | null | undefined): string | null {
		if (!imageUrl || typeof imageUrl !== 'string') return null;

		// Remove query parameters (e.g., ?token=xxx)
		const urlWithoutQuery = String(imageUrl).split('?')[0];

		// Try to extract image key from various URL patterns
		// Pattern 1: /image-proxy/images/user_id/filename.jpg
		let match = urlWithoutQuery.match(/image-proxy\/(images\/.+)$/);
		if (match && match[1]) {
			return match[1];
		}

		// Pattern 2: image-proxy/images/user_id/filename.jpg (without leading slash)
		match = urlWithoutQuery.match(/image-proxy\/(images\/.+)/);
		if (match && match[1]) {
			return match[1];
		}

		// Pattern 3: Direct images/user_id/filename.jpg
		match = urlWithoutQuery.match(/(images\/.+)$/);
		if (match && match[1]) {
			return match[1];
		}

		return null;
	}

	async function saveFeaturedImage() {
		if (!selectedImage || !images) return;

		saving = true;
		error = null;

		try {
			// Determine which method to use
			let request: { image_url?: string; image_key?: string; photo_index?: number } = {};

			if (selectedType === 'gallery') {
				// Find the index in the gallery_urls array (compare URLs without query params)
				const selectedUrlBase = normalizeUrl(selectedImage);
				const galleryUrls = images.event_gallery_urls || [];
				const index = galleryUrls.findIndex((url) => normalizeUrl(url) === selectedUrlBase);

				if (index !== -1) {
					request.photo_index = index;
				} else {
					// If not found in gallery, try to extract key or use URL
					const imageKey = extractImageKey(selectedImage);
					if (imageKey) {
						request.image_key = imageKey;
					} else {
						request.image_url = normalizeUrl(selectedImage);
					}
				}
			} else if (selectedType === 'uploaded') {
				// Extract image key from URL
				const imageKey = extractImageKey(selectedImage);
				if (imageKey) {
					request.image_key = imageKey;
				} else {
					request.image_url = normalizeUrl(selectedImage);
				}
			} else if (selectedType === 'current') {
				// For current featured image, try to find it in gallery first
				const selectedUrlBase = normalizeUrl(selectedImage);
				let galleryIndex = -1;
				const galleryUrls = images.event_gallery_urls || [];
				for (let i = 0; i < galleryUrls.length; i++) {
					if (normalizeUrl(galleryUrls[i]) === selectedUrlBase) {
						galleryIndex = i;
						break;
					}
				}

				if (galleryIndex !== -1) {
					request.photo_index = galleryIndex;
				} else {
					// Try to extract key from URL
					const imageKey = extractImageKey(selectedImage);
					if (imageKey) {
						request.image_key = imageKey;
					} else {
						request.image_url = normalizeUrl(selectedImage);
					}
				}
			}

			// Ensure at least one field is set
			if (
				!request.image_url &&
				request.image_key === undefined &&
				request.photo_index === undefined
			) {
				throw new Error('Invalid image selection');
			}

			console.log('Setting featured image with request:', request, 'for image:', selectedImage);
			const result = await setEventFeaturedImage(eventId, request);
			console.log('Featured image set successfully:', result);
			onSuccess?.();
			onClose();
		} catch (e: any) {
			console.error('Error setting featured image:', e);
			error = e?.message || 'Failed to set featured image';
		} finally {
			saving = false;
		}
	}

	async function removeFeaturedImage() {
		if (!confirm('Are you sure you want to remove the featured image?')) return;

		saving = true;
		error = null;

		try {
			await removeEventFeaturedImage(eventId);
			selectedImage = null;
			selectedType = null;
			onSuccess?.();
			onClose();
		} catch (e: any) {
			error = e?.message || 'Failed to remove featured image';
		} finally {
			saving = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="featured-image-modal-title"
		tabindex="-1"
	>
		<div
			class="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-800"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700"
			>
				<h2
					id="featured-image-modal-title"
					class="text-xl font-semibold text-gray-900 dark:text-white"
				>
					Set Featured Image
				</h2>
				<button
					onclick={onClose}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					aria-label="Close modal"
				>
					<FontAwesomeIcon icon={faXmark} class="h-5 w-5" />
				</button>
			</div>

			<!-- Content -->
			<div class="overflow-y-auto p-6" style="max-height: calc(90vh - 140px)">
				{#if loading}
					<div class="flex items-center justify-center py-12">
						<FontAwesomeIcon icon={faSpinner} class="h-8 w-8 animate-spin text-blue-600" />
					</div>
				{:else if error}
					<div class="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				{:else if images}
					<div class="space-y-6">
						<!-- Current Featured Image -->
						{#if images.featured_image}
							<div>
								<h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
									Current Featured Image
								</h3>
								<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
									<button
										onclick={() => selectImage(images!.featured_image!, 'current')}
										class="group relative overflow-hidden rounded-xl border-2 transition-all {selectedImage ===
											images.featured_image && selectedType === 'current'
											? 'border-blue-600 ring-2 ring-blue-500 ring-offset-2'
											: 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}"
									>
										<img
											src={getAuthenticatedImageUrl(images.featured_image)}
											alt="Featured"
											class="aspect-square w-full object-cover"
										/>
										<div
											class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
										>
											<FontAwesomeIcon icon={faStar} class="h-6 w-6 text-yellow-400" />
										</div>
										{#if normalizeUrl(selectedImage || '') === normalizeUrl(images.featured_image || '') && selectedType === 'current'}
											<div
												class="absolute top-2 right-2 rounded-full bg-blue-600 p-1.5 text-white shadow-lg"
											>
												<FontAwesomeIcon icon={faStar} class="h-3 w-3" />
											</div>
										{/if}
									</button>
								</div>
							</div>
						{/if}

						<!-- Gallery Images from Event -->
						{#if images.event_gallery_urls && images.event_gallery_urls.length > 0}
							<div>
								<h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
									Event Gallery ({images.event_gallery_urls.length})
								</h3>
								<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
									{#each images.event_gallery_urls as galleryUrl, index}
										<button
											onclick={() => selectImage(galleryUrl, 'gallery')}
											class="group relative overflow-hidden rounded-xl border-2 transition-all {normalizeUrl(
												selectedImage || ''
											) === normalizeUrl(galleryUrl) && selectedType === 'gallery'
												? 'border-blue-600 ring-2 ring-blue-500 ring-offset-2'
												: 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}"
										>
											<img
												src={getAuthenticatedImageUrl(galleryUrl)}
												alt="Gallery image {index + 1}"
												class="aspect-square w-full object-cover"
											/>
											{#if normalizeUrl(selectedImage || '') === normalizeUrl(galleryUrl) && selectedType === 'gallery'}
												<div
													class="absolute top-2 right-2 rounded-full bg-blue-600 p-1.5 text-white shadow-lg"
												>
													<FontAwesomeIcon icon={faStar} class="h-3 w-3" />
												</div>
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Uploaded Images -->
						{#if images.images && images.images.length > 0}
							<div>
								<h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
									Your Uploaded Images ({images.images.length})
								</h3>
								<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
									{#each images.images as uploaded}
										<button
											onclick={() => selectImage(uploaded.url, 'uploaded')}
											class="group relative overflow-hidden rounded-xl border-2 transition-all {normalizeUrl(
												selectedImage || ''
											) === normalizeUrl(uploaded.url) && selectedType === 'uploaded'
												? 'border-blue-600 ring-2 ring-blue-500 ring-offset-2'
												: 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}"
										>
											<img
												src={getAuthenticatedImageUrl(uploaded.url)}
												alt={uploaded.filename || 'Uploaded'}
												class="aspect-square w-full object-cover"
											/>
											{#if normalizeUrl(selectedImage || '') === normalizeUrl(uploaded.url) && selectedType === 'uploaded'}
												<div
													class="absolute top-2 right-2 rounded-full bg-blue-600 p-1.5 text-white shadow-lg"
												>
													<FontAwesomeIcon icon={faStar} class="h-3 w-3" />
												</div>
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						{#if (!images.event_gallery_urls || images.event_gallery_urls.length === 0) && (!images.images || images.images.length === 0) && !images.featured_image}
							<div class="py-12 text-center">
								<p class="text-sm text-gray-500 dark:text-gray-400">
									No images available. Add images to your event first.
								</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700"
			>
				<div>
					{#if images?.featured_image}
						<button
							onclick={removeFeaturedImage}
							disabled={saving}
							class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
						>
							<FontAwesomeIcon icon={faTrash} class="h-4 w-4" />
							Remove Featured Image
						</button>
					{/if}
				</div>
				<div class="flex gap-3">
					<button
						onclick={onClose}
						disabled={saving}
						class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						Cancel
					</button>
					<button
						onclick={saveFeaturedImage}
						disabled={!selectedImage ||
							saving ||
							(normalizeUrl(selectedImage || '') === normalizeUrl(images?.featured_image || '') &&
								selectedType === 'current')}
						class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if saving}
							<FontAwesomeIcon icon={faSpinner} class="h-4 w-4 animate-spin" />
							Saving...
						{:else}
							<FontAwesomeIcon icon={faStar} class="h-4 w-4" />
							Set as Featured
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

