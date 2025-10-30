<script lang="ts">
	import { createMarketItem, type MarketItemCreate } from './api';
	import ImageUpload from './ImageUpload.svelte';

	let { isOpen, onClose, onSuccess } = $props<{
		isOpen: boolean;
		onClose: () => void;
		onSuccess: () => void;
	}>();

	let formData = $state<MarketItemCreate>({
		name: '',
		description: '',
		price: 0,
		is_public: true,
		status: 'active',
		category: '',
		photos: [],
		featured_image: '',
		payment_methods: [],
		venmo_url: '',
		facebook_url: '',
		accepts_best_offer: false,
		contact_phone: '',
		contact_email: ''
	});

	let loading = $state(false);
	let error = $state<string | null>(null);

	const categories = [
		'Furniture',
		'Electronics',
		'Clothing',
		'Books',
		'Toys',
		'Kitchen Items',
		'Tools',
		'Sports Equipment',
		'Art & Decor',
		'Garden Items',
		'Antiques',
		'Collectibles',
		'Jewelry',
		'Home Improvement',
		'Automotive',
		'Other'
	];

	function normalizeUrl(url: string): string {
		if (!url?.trim()) return '';
		return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!formData.name.trim() || !formData.price || formData.price < 0) {
			error = 'Please provide a name and a valid price';
			return;
		}

		loading = true;
		error = null;
		try {
			const photos = (formData.photos || []).filter((p) => p && p.trim() !== '');
			const payload: MarketItemCreate = {
				...formData,
				photos,
				featured_image: photos[0] || '',
				venmo_url: normalizeUrl(formData.venmo_url || ''),
				facebook_url: normalizeUrl(formData.facebook_url || ''),
				accepts_best_offer: formData.accepts_best_offer ?? false
			};

			await createMarketItem(payload);
			onSuccess();
			onClose();
			resetForm();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create item';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			name: '',
			description: '',
			price: 0,
			is_public: true,
			status: 'active',
			category: '',
			photos: [],
			featured_image: '',
			payment_methods: [],
			venmo_url: '',
			facebook_url: '',
			accepts_best_offer: false,
			contact_phone: '',
			contact_email: ''
		};
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
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
						<h3 class="text-xl font-semibold text-gray-900 dark:text-white">Post New Item</h3>
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

				<form onsubmit={handleSubmit} class="max-h-[70vh] overflow-y-auto">
					<div class="bg-white/80 px-6 py-6 dark:bg-gray-800/80">
						{#if error}
							<div
								class="mb-6 rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800"
							>
								<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
							</div>
						{/if}

						<div class="space-y-6">
							<div>
								<label
									for="name"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>Name <span class="text-red-500">*</span></label
								>
								<input
									id="name"
									type="text"
									bind:value={formData.name}
									required
									placeholder="e.g., Dyson Vacuum"
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								/>
							</div>

							<div>
								<label
									for="description"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>Description <span class="text-gray-400 font-normal">(Optional)</span></label
								>
								<textarea
									id="description"
									rows="4"
									bind:value={formData.description}
									placeholder="Describe the item..."
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								></textarea>
							</div>

							<div>
								<label
									for="price"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>Price <span class="text-red-500">*</span></label
								>
								<input
									id="price"
									type="number"
									min="0"
									step="0.01"
									bind:value={formData.price}
									required
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
								/>
							</div>

							<label
								class="flex items-center rounded-lg bg-gray-50 p-4 transition-colors duration-200 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
							>
								<input
									type="checkbox"
									bind:checked={formData.accepts_best_offer}
									class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
								/>
								<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300"
									>Accept Best Offer</span
								>
							</label>

							<div>
								<label
									for="category"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>Category <span class="text-gray-400 font-normal">(Optional)</span></label
								>
								<select
									id="category"
									bind:value={formData.category}
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
								>
									<option value="">Select Category</option>
									{#each categories as category}
										<option value={category}>{category}</option>
									{/each}
								</select>
							</div>

							<div>
								<label class="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>Photos <span class="text-gray-400 font-normal">(Optional)</span></label
								>
								<ImageUpload
									images={formData.photos || []}
									maxImages={10}
									onImagesChange={(images) => {
										formData.photos = images;
										formData.featured_image = images[0] || '';
									}}
								/>
							</div>

							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<label
										for="venmo"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
										>Venmo URL <span class="text-gray-400 font-normal">(Optional)</span></label
									>
									<input
										id="venmo"
										type="url"
										bind:value={formData.venmo_url}
										onblur={() => (formData.venmo_url = normalizeUrl(formData.venmo_url))}
										placeholder="https://venmo.com/your-username"
										class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									/>
								</div>
								<div>
									<label
										for="facebook"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
										>Facebook Marketplace URL <span class="text-gray-400 font-normal">(Optional)</span></label
									>
									<input
										id="facebook"
										type="url"
										bind:value={formData.facebook_url}
										onblur={() => (formData.facebook_url = normalizeUrl(formData.facebook_url))}
										placeholder="https://www.facebook.com/marketplace/item/..."
										class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									/>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<label
										for="contact_phone"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
										>Contact Phone <span class="text-gray-400 font-normal">(Optional)</span></label
									>
									<input
										id="contact_phone"
										type="tel"
										bind:value={formData.contact_phone}
										placeholder="(555) 123-4567"
										class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									/>
								</div>
								<div>
									<label
										for="contact_email"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
										>Contact Email <span class="text-gray-400 font-normal">(Optional)</span></label
									>
									<input
										id="contact_email"
										type="email"
										bind:value={formData.contact_email}
										placeholder="seller@example.com"
										class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									/>
								</div>
							</div>

							<label
								class="flex items-center rounded-lg bg-gray-50 p-4 transition-colors duration-200 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
							>
								<input
									type="checkbox"
									bind:checked={formData.is_public}
									class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
								/>
								<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300"
									>Make this item publicly visible</span
								>
							</label>
						</div>
					</div>

					<div
						class="border-t border-gray-200/50 bg-gray-50/80 px-6 py-4 sm:flex sm:flex-row-reverse dark:border-gray-700/50 dark:bg-gray-700/80"
					>
						<button
							type="submit"
							disabled={loading}
							class="inline-flex w-full justify-center rounded-xl border border-transparent bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto"
						>
							{#if loading}
								<svg class="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"
									><circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle><path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path></svg
								>
								Posting...
							{:else}
								Post Item
							{/if}
						</button>
						<button
							type="button"
							onclick={onClose}
							class="mt-3 inline-flex w-full justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 sm:mt-0 sm:ml-3 sm:w-auto dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
							>Cancel</button
						>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
