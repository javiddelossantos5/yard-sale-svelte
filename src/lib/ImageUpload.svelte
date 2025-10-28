<script lang="ts">
	import {
		uploadImage,
		deleteImage,
		getUserImages,
		getAuthenticatedImageUrl,
		type UploadedImage
	} from './api';

	let {
		images = [],
		maxImages = 10,
		onImagesChange = () => {}
	}: {
		images?: string[];
		maxImages?: number;
		onImagesChange?: (images: string[]) => void;
	} = $props();

	let isDragOver = $state(false);
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let error = $state<string | null>(null);

	// Convert image URLs to UploadedImage objects for display
	let uploadedImages = $state<UploadedImage[]>([]);
	let allUserImages = $state<UploadedImage[]>([]);

	// Load user's uploaded images on mount
	$effect(() => {
		loadUserImages();
	});

	async function loadUserImages() {
		try {
			const userImages = await getUserImages();
			allUserImages = userImages;

			// Filter to only show images that are in the current images array
			const validImages = images.filter((url) => url && url.trim() !== '');
			uploadedImages = allUserImages.filter((img) => validImages.includes(img.url));
		} catch (err) {
			console.warn('Failed to load user images:', err);
		}
	}

	async function handleFileUpload(files: FileList | null) {
		if (!files || files.length === 0) return;

		const file = files[0];

		// Validate file type
		if (!file.type.startsWith('image/')) {
			error = 'Please select an image file';
			return;
		}

		// Validate file size (5MB limit)
		if (file.size > 5 * 1024 * 1024) {
			error = 'Image size must be less than 5MB';
			return;
		}

		// Check if we've reached the max number of images
		if (images.length >= maxImages) {
			error = `Maximum ${maxImages} images allowed`;
			return;
		}

		error = null;
		isUploading = true;
		uploadProgress = 0;

		try {
			// Simulate progress
			const progressInterval = setInterval(() => {
				uploadProgress = Math.min(uploadProgress + 10, 90);
			}, 100);

			const uploadedImage = await uploadImage(file);

			clearInterval(progressInterval);
			uploadProgress = 100;

			// Add the new image URL to the images array
			if (uploadedImage.url && uploadedImage.url.trim() !== '') {
				const newImages = [...images, uploadedImage.url];
				onImagesChange(newImages);

				// Refresh the user images to show the new upload
				await loadUserImages();
			}

			// Reset state
			setTimeout(() => {
				isUploading = false;
				uploadProgress = 0;
			}, 500);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to upload image';
			isUploading = false;
			uploadProgress = 0;
		}
	}

	async function removeImage(imageUrl: string) {
		try {
			// Find the image key from the uploaded images
			const image = uploadedImages.find((img) => img.url === imageUrl);
			if (image) {
				await deleteImage(image.key);
			}

			// Remove from local array
			const newImages = images.filter((url) => url !== imageUrl);
			onImagesChange(newImages);

			// Refresh the user images
			await loadUserImages();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete image';
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
		handleFileUpload(event.dataTransfer?.files || null);
	}

	function handleFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		handleFileUpload(target.files);
		target.value = ''; // Reset input
	}

	function addImage(imageUrl: string) {
		if (images.length < maxImages && !images.includes(imageUrl)) {
			const newImages = [...images, imageUrl];
			onImagesChange(newImages);
		}
	}
</script>

<div class="space-y-4">
	<!-- Upload Area -->
	<div
		class="relative rounded-xl border-2 border-dashed p-6 transition-all duration-200 {isDragOver
			? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
			: 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="button"
		tabindex="0"
		aria-label="Image upload area"
	>
		{#if isUploading}
			<!-- Upload Progress -->
			<div class="text-center">
				<div class="mx-auto mb-4 h-12 w-12">
					<svg class="h-12 w-12 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				</div>
				<p class="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading...</p>
				<div class="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
					<div
						class="h-2 rounded-full bg-blue-600 transition-all duration-300"
						style="width: {uploadProgress}%"
					></div>
				</div>
			</div>
		{:else}
			<!-- Upload Prompt -->
			<div class="text-center">
				<div class="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-full w-full">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
						></path>
					</svg>
				</div>
				<p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
					Drag and drop an image here, or click to select
				</p>
				<p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
					PNG, JPG, GIF up to 5MB • Max {maxImages} images
				</p>
				<input
					type="file"
					accept="image/*"
					onchange={handleFileInput}
					class="hidden"
					id="image-upload"
				/>
				<label
					for="image-upload"
					class="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						></path>
					</svg>
					Choose Image
				</label>
			</div>
		{/if}
	</div>

	<!-- Error Message -->
	{#if error}
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
		</div>
	{/if}

	<!-- Available Images to Add -->
	{#if allUserImages.length > 0}
		<div class="space-y-3">
			<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
				Available Images ({allUserImages.length - uploadedImages.length} available)
			</h4>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{#each allUserImages as image}
					{@const isSelected = images.includes(image.url)}
					{#if !isSelected && images.length < maxImages}
						<button
							type="button"
							class="group relative cursor-pointer"
							onclick={() => addImage(image.url)}
							aria-label="Add {image.filename} to yard sale"
						>
							<img
								src={getAuthenticatedImageUrl(image.url)}
								alt={image.filename}
								class="h-24 w-full rounded-lg border border-gray-200 object-cover opacity-60 transition-opacity duration-200 group-hover:opacity-100 dark:border-gray-700"
							/>
							<!-- Add Button -->
							<div class="absolute inset-0 flex items-center justify-center">
								<div
									class="rounded-full bg-blue-500 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
								>
									<svg
										class="h-4 w-4 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 6v6m0 0v6m0-6h6m-6 0H6"
										></path>
									</svg>
								</div>
							</div>
						</button>
					{/if}
				{/each}
			</div>
		</div>
	{/if}

	<!-- Selected Images -->
	{#if uploadedImages.length > 0}
		<div class="space-y-3">
			<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
				Selected Images ({uploadedImages.length}/{maxImages})
			</h4>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{#each uploadedImages as image, index}
					<div class="group relative">
						<img
							src={getAuthenticatedImageUrl(image.url)}
							alt={image.filename}
							class="h-24 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
						/>
						<!-- Remove Button -->
						<button
							type="button"
							onclick={() => removeImage(image.url)}
							class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-red-600"
							aria-label="Remove {image.filename}"
						>
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								></path>
							</svg>
						</button>
						<!-- Featured Image Badge -->
						{#if index === 0}
							<div
								class="absolute bottom-1 left-1 rounded bg-blue-500 px-2 py-1 text-xs text-white"
							>
								Featured
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
