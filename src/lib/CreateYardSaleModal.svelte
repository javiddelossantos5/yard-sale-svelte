<script lang="ts">
	import { createYardSale, type YardSaleCreate } from './api';

	let { isOpen, onClose, onSuccess } = $props<{
		isOpen: boolean;
		onClose: () => void;
		onSuccess: () => void;
	}>();

	// Form data
	let formData = $state<YardSaleCreate>({
		title: '',
		description: '',
		start_date: '',
		end_date: '',
		start_time: '',
		end_time: '',
		address: '',
		city: '',
		state: '',
		zip_code: '',
		contact_name: '',
		contact_phone: '',
		contact_email: '',
		allow_messages: true,
		categories: [],
		price_range: '',
		payment_methods: []
	});

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Available options
	const states = [
		'AL',
		'AK',
		'AZ',
		'AR',
		'CA',
		'CO',
		'CT',
		'DE',
		'FL',
		'GA',
		'HI',
		'ID',
		'IL',
		'IN',
		'IA',
		'KS',
		'KY',
		'LA',
		'ME',
		'MD',
		'MA',
		'MI',
		'MN',
		'MS',
		'MO',
		'MT',
		'NE',
		'NV',
		'NH',
		'NJ',
		'NM',
		'NY',
		'NC',
		'ND',
		'OH',
		'OK',
		'OR',
		'PA',
		'RI',
		'SC',
		'SD',
		'TN',
		'TX',
		'UT',
		'VT',
		'VA',
		'WA',
		'WV',
		'WI',
		'WY'
	];

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

	const priceRanges = [
		'Under $10',
		'$10-$25',
		'$25-$50',
		'$50-$100',
		'$100-$250',
		'$250+',
		'Negotiable'
	];

	const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Check', 'Venmo', 'PayPal', 'Zelle'];

	async function handleSubmit(event: Event) {
		event.preventDefault();

		// Basic validation
		if (
			!formData.title.trim() ||
			!formData.start_date ||
			!formData.start_time ||
			!formData.end_time ||
			!formData.address.trim() ||
			!formData.city.trim() ||
			!formData.state ||
			!formData.zip_code.trim() ||
			!formData.contact_name.trim()
		) {
			error = 'Please fill in all required fields';
			return;
		}

		loading = true;
		error = null;

		try {
			await createYardSale(formData);
			onSuccess();
			onClose();
			resetForm();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create yard sale';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			title: '',
			description: '',
			start_date: '',
			end_date: '',
			start_time: '',
			end_time: '',
			address: '',
			city: '',
			state: '',
			zip_code: '',
			contact_name: '',
			contact_phone: '',
			contact_email: '',
			allow_messages: true,
			categories: [],
			price_range: '',
			payment_methods: []
		};
	}

	function handleCategoryChange(category: string, event: Event) {
		const target = event.target as HTMLInputElement;
		const checked = target.checked;
		if (checked) {
			formData.categories = [...(formData.categories || []), category];
		} else {
			formData.categories = (formData.categories || []).filter((c) => c !== category);
		}
	}

	function handlePaymentMethodChange(method: string, event: Event) {
		const target = event.target as HTMLInputElement;
		const checked = target.checked;
		if (checked) {
			formData.payment_methods = [...(formData.payment_methods || []), method];
		} else {
			formData.payment_methods = (formData.payment_methods || []).filter((m) => m !== method);
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
				class="bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity"
				onclick={onClose}
				aria-hidden="true"
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle"
			>
				<!-- Header -->
				<div class="border-b border-gray-200 bg-white px-6 py-4">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-medium text-gray-900" id="modal-title">Post New Yard Sale</h3>
						<button
							type="button"
							class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
							onclick={onClose}
						>
							<span class="sr-only">Close</span>
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>

				<!-- Form -->
				<form onsubmit={handleSubmit} class="max-h-96 overflow-y-auto">
					<div class="bg-white px-6 py-4">
						<!-- Error Message -->
						{#if error}
							<div class="mb-4 rounded-md bg-red-50 p-4">
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
											></path>
										</svg>
									</div>
									<div class="ml-3">
										<h3 class="text-sm font-medium text-red-800">Error</h3>
										<div class="mt-2 text-sm text-red-700">
											<p>{error}</p>
										</div>
									</div>
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<!-- Title -->
							<div class="sm:col-span-2">
								<label for="title" class="block text-sm font-medium text-gray-700">Title *</label>
								<input
									type="text"
									id="title"
									bind:value={formData.title}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
									placeholder="e.g., Spring Cleaning Yard Sale"
								/>
							</div>

							<!-- Description -->
							<div class="sm:col-span-2">
								<label for="description" class="block text-sm font-medium text-gray-700"
									>Description</label
								>
								<textarea
									id="description"
									bind:value={formData.description}
									rows="3"
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
									placeholder="Describe what you're selling..."
								></textarea>
							</div>

							<!-- Start Date -->
							<div>
								<label for="start_date" class="block text-sm font-medium text-gray-700"
									>Start Date *</label
								>
								<input
									type="date"
									id="start_date"
									bind:value={formData.start_date}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								/>
							</div>

							<!-- End Date -->
							<div>
								<label for="end_date" class="block text-sm font-medium text-gray-700"
									>End Date</label
								>
								<input
									type="date"
									id="end_date"
									bind:value={formData.end_date}
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								/>
							</div>

							<!-- Start Time -->
							<div>
								<label for="start_time" class="block text-sm font-medium text-gray-700"
									>Start Time *</label
								>
								<input
									type="time"
									id="start_time"
									bind:value={formData.start_time}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								/>
							</div>

							<!-- End Time -->
							<div>
								<label for="end_time" class="block text-sm font-medium text-gray-700"
									>End Time *</label
								>
								<input
									type="time"
									id="end_time"
									bind:value={formData.end_time}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								/>
							</div>

							<!-- Address -->
							<div class="sm:col-span-2">
								<label for="address" class="block text-sm font-medium text-gray-700"
									>Address *</label
								>
								<input
									type="text"
									id="address"
									bind:value={formData.address}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
									placeholder="123 Main Street"
								/>
							</div>

							<!-- City -->
							<div>
								<label for="city" class="block text-sm font-medium text-gray-700">City *</label>
								<input
									type="text"
									id="city"
									bind:value={formData.city}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
									placeholder="Anytown"
								/>
							</div>

							<!-- State -->
							<div>
								<label for="state" class="block text-sm font-medium text-gray-700">State *</label>
								<select
									id="state"
									bind:value={formData.state}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								>
									<option value="">Select State</option>
									{#each states as state}
										<option value={state}>{state}</option>
									{/each}
								</select>
							</div>

							<!-- ZIP Code -->
							<div>
								<label for="zip_code" class="block text-sm font-medium text-gray-700"
									>ZIP Code *</label
								>
								<input
									type="text"
									id="zip_code"
									bind:value={formData.zip_code}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
									placeholder="12345"
								/>
							</div>

							<!-- Contact Name -->
							<div>
								<label for="contact_name" class="block text-sm font-medium text-gray-700"
									>Contact Name *</label
								>
								<input
									type="text"
									id="contact_name"
									bind:value={formData.contact_name}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
									placeholder="Your Name"
								/>
							</div>

							<!-- Contact Phone -->
							<div>
								<label for="contact_phone" class="block text-sm font-medium text-gray-700"
									>Phone</label
								>
								<input
									type="tel"
									id="contact_phone"
									bind:value={formData.contact_phone}
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
									placeholder="(555) 123-4567"
								/>
							</div>

							<!-- Contact Email -->
							<div>
								<label for="contact_email" class="block text-sm font-medium text-gray-700"
									>Email</label
								>
								<input
									type="email"
									id="contact_email"
									bind:value={formData.contact_email}
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
									placeholder="your@email.com"
								/>
							</div>

							<!-- Price Range -->
							<div>
								<label for="price_range" class="block text-sm font-medium text-gray-700"
									>Price Range</label
								>
								<select
									id="price_range"
									bind:value={formData.price_range}
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								>
									<option value="">Select Price Range</option>
									{#each priceRanges as range}
										<option value={range}>{range}</option>
									{/each}
								</select>
							</div>

							<!-- Categories -->
							<div class="sm:col-span-2">
								<label class="block text-sm font-medium text-gray-700">Categories</label>
								<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
									{#each categories as category}
										<label class="flex items-center" for="category-{category}">
											<input
												id="category-{category}"
												type="checkbox"
												checked={formData.categories?.includes(category) || false}
												onchange={(e) => handleCategoryChange(category, e)}
												class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<span class="ml-2 text-sm text-gray-700">{category}</span>
										</label>
									{/each}
								</div>
							</div>

							<!-- Payment Methods -->
							<div class="sm:col-span-2">
								<label class="block text-sm font-medium text-gray-700">Payment Methods</label>
								<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
									{#each paymentMethods as method}
										<label class="flex items-center" for="payment-{method}">
											<input
												id="payment-{method}"
												type="checkbox"
												checked={formData.payment_methods?.includes(method) || false}
												onchange={(e) => handlePaymentMethodChange(method, e)}
												class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<span class="ml-2 text-sm text-gray-700">{method}</span>
										</label>
									{/each}
								</div>
							</div>

							<!-- Allow Messages -->
							<div class="sm:col-span-2">
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={formData.allow_messages}
										class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									/>
									<span class="ml-2 text-sm text-gray-700">Allow messages through the app</span>
								</label>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<div class="border-t border-gray-200 bg-gray-50 px-6 py-3 sm:flex sm:flex-row-reverse">
						<button
							type="submit"
							disabled={loading}
							class="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
						>
							{#if loading}
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
								Creating...
							{:else}
								Create Yard Sale
							{/if}
						</button>
						<button
							type="button"
							onclick={onClose}
							class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
