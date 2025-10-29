<script lang="ts">
	import { createYardSale, updateYardSale, type YardSaleCreate, type YardSale } from './api';
	import ImageUpload from './ImageUpload.svelte';

	let {
		isOpen,
		onClose,
		onSuccess,
		yardSale = null
	} = $props<{
		isOpen: boolean;
		onClose: () => void;
		onSuccess: () => void;
		yardSale?: YardSale | null;
	}>();

	const isEditing = yardSale !== null;

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
		payment_methods: [],
		status: 'active',
		status_reason: '',
		venmo_url: '',
		facebook_url: '',
		photos: []
	});

	let loading = $state(false);
	let error = $state<string | null>(null);
	let availablePaymentMethods = $state<any[]>([
		{ id: 'cash', name: 'Cash', icon: 'dollar-sign', icon_type: 'solid' },
		{ id: 'credit-card', name: 'Credit Card', icon: 'credit-card', icon_type: 'solid' },
		{ id: 'debit-card', name: 'Debit Card', icon: 'credit-card', icon_type: 'solid' },
		{ id: 'venmo', name: 'Venmo', icon: 'check-circle', icon_type: 'solid' },
		{ id: 'paypal', name: 'PayPal', icon: 'paypal', icon_type: 'brand' },
		{ id: 'zelle', name: 'Zelle', icon: 'check-circle', icon_type: 'solid' },
		{ id: 'apple', name: 'Apple Pay', icon: 'apple', icon_type: 'brand' },
		{ id: 'google', name: 'Google Pay', icon: 'google', icon_type: 'brand' },
		{ id: 'square', name: 'Square', icon: 'credit-card', icon_type: 'solid' }
	]);

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

	// Payment methods are now hardcoded and always available

	// Initialize form data when yardSale changes
	$effect(() => {
		if (yardSale && isOpen) {
			formData = {
				title: yardSale.title,
				description: yardSale.description,
				start_date: yardSale.start_date,
				end_date: yardSale.end_date || '',
				start_time: yardSale.start_time,
				end_time: yardSale.end_time,
				address: yardSale.address,
				city: yardSale.city,
				state: yardSale.state,
				zip_code: yardSale.zip_code,
				contact_name: yardSale.contact_name,
				contact_phone: yardSale.contact_phone || '',
				contact_email: yardSale.contact_email || '',
				allow_messages: yardSale.allow_messages,
				categories: yardSale.categories || [],
				price_range: yardSale.price_range || '',
				payment_methods: yardSale.payment_methods || [],
				status: yardSale.status || 'active',
				status_reason: yardSale.status_reason || '',
				venmo_url: yardSale.venmo_url || '',
				facebook_url: yardSale.facebook_url || '',
				photos: yardSale.photos || []
			};
		} else if (!yardSale && isOpen) {
			resetForm();
		}
	});

	// Helper function to format Venmo URL
	function formatVenmoUrl(url: string): string {
		if (!url.trim()) return url;

		// If it already has a protocol, return as is
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}

		// Add https:// if it doesn't have a protocol
		return `https://${url}`;
	}

	function formatFacebookUrl(url: string): string {
		if (!url.trim()) return url;

		// If it already has a protocol, return as is
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}

		// Add https:// if it doesn't have a protocol
		return `https://${url}`;
	}

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
			// Format the Venmo URL and filter photos before submission
			const formattedData = {
				...formData,
				venmo_url: formData.venmo_url ? formatVenmoUrl(formData.venmo_url) : '',
				facebook_url: formData.facebook_url ? formatFacebookUrl(formData.facebook_url) : '',
				photos: (formData.photos || []).filter((photo) => photo && photo.trim() !== '')
			};

			if (isEditing && yardSale) {
				await updateYardSale(yardSale.id, formattedData);
			} else {
				await createYardSale(formattedData);
			}
			onSuccess();
			onClose();
			resetForm();
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: `Failed to ${isEditing ? 'update' : 'create'} yard sale`;
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
			payment_methods: [],
			status: 'active',
			status_reason: '',
			venmo_url: '',
			facebook_url: '',
			photos: []
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
				class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
				onclick={onClose}
				aria-hidden="true"
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block transform overflow-hidden rounded-2xl bg-white/95 text-left align-bottom shadow-2xl ring-1 ring-white/20 backdrop-blur-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle dark:bg-gray-800/95 dark:ring-gray-700/50"
			>
				<!-- Header -->
				<div
					class="border-b border-gray-200/50 bg-white/80 px-6 py-5 dark:border-gray-700/50 dark:bg-gray-800/80"
				>
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-semibold text-gray-900 dark:text-white" id="modal-title">
							{isEditing ? 'Edit Yard Sale' : 'Post New Yard Sale'}
						</h3>
						<button
							type="button"
							class="rounded-full bg-gray-100 p-2 text-gray-500 transition-all duration-200 hover:bg-gray-200 hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
							onclick={onClose}
						>
							<span class="sr-only">Close</span>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
				<form onsubmit={handleSubmit} class="max-h-[70vh] overflow-y-auto">
					<div class="bg-white/80 px-6 py-6 dark:bg-gray-800/80">
						<!-- Error Message -->
						{#if error}
							<div
								class="mb-6 rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800"
							>
								<div class="flex">
									<div class="shrink-0">
										<svg
											class="h-5 w-5 text-red-500"
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
										<h3 class="text-sm font-semibold text-red-800 dark:text-red-200">Error</h3>
										<div class="mt-1 text-sm text-red-700 dark:text-red-300">
											<p>{error}</p>
										</div>
									</div>
								</div>
							</div>
						{/if}

						<div class="space-y-6">
							<!-- Title -->
							<div>
								<label
									for="title"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Title <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="title"
									bind:value={formData.title}
									required
									class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="e.g., Spring Cleaning Yard Sale"
								/>
							</div>

							<!-- Description -->
							<div>
								<label
									for="description"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Description <span class="text-xs text-gray-400">(Optional)</span>
								</label>
								<textarea
									id="description"
									bind:value={formData.description}
									rows="4"
									class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="Describe what you're selling..."
								></textarea>
							</div>

							<!-- Date and Time Section -->
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<!-- Start Date -->
								<div>
									<label
										for="start_date"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										Start Date <span class="text-red-500">*</span>
									</label>
									<input
										type="date"
										id="start_date"
										bind:value={formData.start_date}
										required
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
									/>
								</div>

								<!-- End Date -->
								<div>
									<label
										for="end_date"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										End Date <span class="text-xs text-gray-400">(Optional)</span>
									</label>
									<input
										type="date"
										id="end_date"
										bind:value={formData.end_date}
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
									/>
								</div>

								<!-- Start Time -->
								<div>
									<label
										for="start_time"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										Start Time <span class="text-red-500">*</span>
									</label>
									<input
										type="time"
										id="start_time"
										bind:value={formData.start_time}
										required
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
									/>
								</div>

								<!-- End Time -->
								<div>
									<label
										for="end_time"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										End Time <span class="text-red-500">*</span>
									</label>
									<input
										type="time"
										id="end_time"
										bind:value={formData.end_time}
										required
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
									/>
								</div>
							</div>

							<!-- Address -->
							<div>
								<label
									for="address"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Address <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="address"
									bind:value={formData.address}
									required
									class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									placeholder="123 Main Street"
								/>
							</div>

							<!-- Location Section -->
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<!-- City -->
								<div>
									<label
										for="city"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										City <span class="text-red-500">*</span>
									</label>
									<input
										type="text"
										id="city"
										bind:value={formData.city}
										required
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										placeholder="Anytown"
									/>
								</div>

								<!-- State -->
								<div>
									<label
										for="state"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										State <span class="text-red-500">*</span>
									</label>
									<select
										id="state"
										bind:value={formData.state}
										required
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
									>
										<option value="">Select State</option>
										{#each states as state}
											<option value={state}>{state}</option>
										{/each}
									</select>
								</div>

								<!-- ZIP Code -->
								<div>
									<label
										for="zip_code"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										ZIP Code <span class="text-red-500">*</span>
									</label>
									<input
										type="text"
										id="zip_code"
										bind:value={formData.zip_code}
										required
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										placeholder="12345"
									/>
								</div>
							</div>

							<!-- Contact Information Section -->
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<!-- Contact Name -->
								<div>
									<label
										for="contact_name"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										Contact Name <span class="text-red-500">*</span>
									</label>
									<input
										type="text"
										id="contact_name"
										bind:value={formData.contact_name}
										required
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										placeholder="Your Name"
									/>
								</div>

								<!-- Contact Phone -->
								<div>
									<label
										for="contact_phone"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										Phone <span class="text-xs text-gray-400">(Optional)</span>
									</label>
									<input
										type="tel"
										id="contact_phone"
										bind:value={formData.contact_phone}
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										placeholder="(555) 123-4567"
									/>
								</div>

								<!-- Contact Email -->
								<div>
									<label
										for="contact_email"
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									>
										Email <span class="text-xs text-gray-400">(Optional)</span>
									</label>
									<input
										type="email"
										id="contact_email"
										bind:value={formData.contact_email}
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										placeholder="your@email.com"
									/>
								</div>
							</div>

							<!-- Price Range -->
							<div>
								<label
									for="price_range"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Price Range <span class="text-xs text-gray-400">(Optional)</span>
								</label>
								<select
									id="price_range"
									bind:value={formData.price_range}
									class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
								>
									<option value="">Select Price Range</option>
									{#each priceRanges as range}
										<option value={range}>{range}</option>
									{/each}
								</select>
							</div>

							<!-- Categories -->
							<div>
								<label
									class="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									for="categories"
								>
									Categories <span class="text-xs text-gray-400">(Optional)</span>
								</label>
								<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
									{#each categories as category}
										<label
											class="flex items-center rounded-lg bg-gray-50 p-3 transition-colors duration-200 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
											for="category-{category}"
										>
											<input
												id="category-{category}"
												type="checkbox"
												checked={formData.categories?.includes(category) || false}
												onchange={(e) => handleCategoryChange(category, e)}
												class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
											/>
											<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300"
												>{category}</span
											>
										</label>
									{/each}
								</div>
							</div>

							<!-- Payment Methods -->
							<div>
								<label
									class="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									for="payment-methods"
								>
									Payment Methods <span class="text-xs text-gray-400">(Optional)</span>
								</label>
								<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
									{#each availablePaymentMethods as method}
										<label
											class="flex items-center rounded-lg bg-gray-50 p-3 transition-colors duration-200 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
											for="payment-{method.id}"
										>
											<input
												id="payment-{method.id}"
												type="checkbox"
												checked={formData.payment_methods?.includes(method.name) || false}
												onchange={(e) => handlePaymentMethodChange(method.name, e)}
												class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
											/>
											<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300"
												>{method.name}</span
											>
										</label>
									{/each}
								</div>
							</div>

							<!-- Venmo URL -->
							<div>
								<label
									for="venmo-url"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Venmo URL <span class="text-xs text-gray-400">(Optional)</span>
								</label>
								<input
									id="venmo-url"
									type="url"
									bind:value={formData.venmo_url}
									onblur={() => {
										if (
											formData.venmo_url &&
											!formData.venmo_url.startsWith('http://') &&
											!formData.venmo_url.startsWith('https://')
										) {
											formData.venmo_url = `https://${formData.venmo_url}`;
										}
									}}
									oninput={() => {
										// Venmo URL is independent of payment methods
									}}
									placeholder="https://venmo.com/your-username"
									class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								/>
								<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
									Add your Venmo profile URL to allow customers to pay directly
								</p>
							</div>

							<!-- Facebook Marketplace URL -->
							<div>
								<label
									for="facebook-url"
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
								>
									Facebook Marketplace URL <span class="text-xs text-gray-400">(Optional)</span>
								</label>
								<input
									id="facebook-url"
									type="url"
									bind:value={formData.facebook_url}
									onblur={() => {
										if (
											formData.facebook_url &&
											!formData.facebook_url.startsWith('http://') &&
											!formData.facebook_url.startsWith('https://')
										) {
											formData.facebook_url = `https://${formData.facebook_url}`;
										}
									}}
									placeholder="https://www.facebook.com/marketplace/item/..."
									class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								/>
								<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
									Link to your Facebook Marketplace listing for additional advertising
								</p>
							</div>

							<!-- Images -->
							<div>
								<label class="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
									Photos <span class="text-xs text-gray-400">(Optional)</span>
								</label>
								<ImageUpload
									images={formData.photos || []}
									maxImages={10}
									onImagesChange={(images) => {
										formData.photos = images;
									}}
								/>
							</div>

							<!-- Allow Messages -->
							<div>
								<label
									class="flex items-center rounded-lg bg-gray-50 p-4 transition-colors duration-200 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
								>
									<input
										type="checkbox"
										bind:checked={formData.allow_messages}
										class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
									/>
									<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300"
										>Allow messages through the app</span
									>
								</label>
							</div>

							<!-- Status -->
							<div>
								<label
									class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
									for="status"
								>
									Status <span class="text-red-500">*</span>
								</label>
								<select
									id="status"
									bind:value={formData.status}
									class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
								>
									<option value="active">Active</option>
									<option value="on_break">On Break</option>
									<option value="closed">Closed</option>
								</select>
							</div>

							<!-- Status Reason -->
							{#if formData.status === 'on_break' || formData.status === 'closed'}
								<div>
									<label
										class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
										for="status-reason"
									>
										Status Reason <span class="text-xs text-gray-400">(Optional)</span>
									</label>
									<input
										id="status-reason"
										type="text"
										bind:value={formData.status_reason}
										placeholder="e.g., Taking a lunch break, All items sold, etc."
										class="block w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
									/>
								</div>
							{/if}
						</div>
					</div>

					<!-- Footer -->
					<div
						class="border-t border-gray-200/50 bg-gray-50/80 px-6 py-4 sm:flex sm:flex-row-reverse dark:border-gray-700/50 dark:bg-gray-700/80"
					>
						<button
							type="submit"
							disabled={loading}
							class="inline-flex w-full justify-center rounded-xl border border-transparent bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto"
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
								{isEditing ? 'Updating...' : 'Creating...'}
							{:else}
								{isEditing ? 'Update Yard Sale' : 'Create Yard Sale'}
							{/if}
						</button>
						<button
							type="button"
							onclick={onClose}
							class="mt-3 inline-flex w-full justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 sm:mt-0 sm:ml-3 sm:w-auto dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
