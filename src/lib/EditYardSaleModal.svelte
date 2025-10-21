<script lang="ts">
	import { createYardSale, updateYardSale, type YardSaleCreate, type YardSale } from './api';

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
		venmo_url: ''
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
				venmo_url: yardSale.venmo_url || ''
			};
		} else if (!yardSale && isOpen) {
			resetForm();
		}
	});

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
			if (isEditing && yardSale) {
				await updateYardSale(yardSale.id, formData);
			} else {
				await createYardSale(formData);
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
			venmo_url: ''
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
				class="bg-opacity-75 dark:bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity dark:bg-gray-900"
				onclick={onClose}
				aria-hidden="true"
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle dark:bg-gray-800"
			>
				<!-- Header -->
				<div
					class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800"
				>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-medium text-gray-900 dark:text-white" id="modal-title">
							{isEditing ? 'Edit Yard Sale' : 'Post New Yard Sale'}
						</h3>
						<button
							type="button"
							class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-400"
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
				<form onsubmit={handleSubmit} class="max-h-[70vh] overflow-y-auto">
					<div class="bg-white px-6 py-4 dark:bg-gray-800">
						<!-- Error Message -->
						{#if error}
							<div
								class="mb-4 rounded-md bg-red-50 p-4 dark:border dark:border-red-800 dark:bg-red-900/20"
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
											></path>
										</svg>
									</div>
									<div class="ml-3">
										<h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
										<div class="mt-2 text-sm text-red-700 dark:text-red-300">
											<p>{error}</p>
										</div>
									</div>
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<!-- Title -->
							<div class="sm:col-span-2 lg:col-span-3">
								<label
									for="title"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label
								>
								<input
									type="text"
									id="title"
									bind:value={formData.title}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="e.g., Spring Cleaning Yard Sale"
								/>
							</div>

							<!-- Description -->
							<div class="sm:col-span-2 lg:col-span-3">
								<label
									for="description"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									>Description</label
								>
								<textarea
									id="description"
									bind:value={formData.description}
									rows="4"
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="Describe what you're selling..."
								></textarea>
							</div>

							<!-- Start Date -->
							<div>
								<label
									for="start_date"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									>Start Date *</label
								>
								<input
									type="date"
									id="start_date"
									bind:value={formData.start_date}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>

							<!-- End Date -->
							<div>
								<label
									for="end_date"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label
								>
								<input
									type="date"
									id="end_date"
									bind:value={formData.end_date}
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>

							<!-- Start Time -->
							<div>
								<label
									for="start_time"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									>Start Time *</label
								>
								<input
									type="time"
									id="start_time"
									bind:value={formData.start_time}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>

							<!-- End Time -->
							<div>
								<label
									for="end_time"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									>End Time *</label
								>
								<input
									type="time"
									id="end_time"
									bind:value={formData.end_time}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
							</div>

							<!-- Address -->
							<div class="sm:col-span-2 lg:col-span-3">
								<label
									for="address"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									>Address *</label
								>
								<input
									type="text"
									id="address"
									bind:value={formData.address}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="123 Main Street"
								/>
							</div>

							<!-- City -->
							<div>
								<label for="city" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									>City *</label
								>
								<input
									type="text"
									id="city"
									bind:value={formData.city}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="Anytown"
								/>
							</div>

							<!-- State -->
							<div>
								<label
									for="state"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300">State *</label
								>
								<select
									id="state"
									bind:value={formData.state}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
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
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									>ZIP Code *</label
								>
								<input
									type="text"
									id="zip_code"
									bind:value={formData.zip_code}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="12345"
								/>
							</div>

							<!-- Contact Name -->
							<div>
								<label
									for="contact_name"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									>Contact Name *</label
								>
								<input
									type="text"
									id="contact_name"
									bind:value={formData.contact_name}
									required
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="Your Name"
								/>
							</div>

							<!-- Contact Phone -->
							<div>
								<label
									for="contact_phone"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label
								>
								<input
									type="tel"
									id="contact_phone"
									bind:value={formData.contact_phone}
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="(555) 123-4567"
								/>
							</div>

							<!-- Contact Email -->
							<div>
								<label
									for="contact_email"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label
								>
								<input
									type="email"
									id="contact_email"
									bind:value={formData.contact_email}
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="your@email.com"
								/>
							</div>

							<!-- Price Range -->
							<div>
								<label
									for="price_range"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									>Price Range</label
								>
								<select
									id="price_range"
									bind:value={formData.price_range}
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
								>
									<option value="">Select Price Range</option>
									{#each priceRanges as range}
										<option value={range}>{range}</option>
									{/each}
								</select>
							</div>

							<!-- Categories -->
							<div class="sm:col-span-2 lg:col-span-3">
								<label
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									for="categories">Categories</label
								>
								<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
									{#each categories as category}
										<label class="flex items-center" for="category-{category}">
											<input
												id="category-{category}"
												type="checkbox"
												checked={formData.categories?.includes(category) || false}
												onchange={(e) => handleCategoryChange(category, e)}
												class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<span class="ml-2 text-sm text-gray-700 dark:text-gray-300">{category}</span>
										</label>
									{/each}
								</div>
							</div>

							<!-- Payment Methods -->
							<div class="sm:col-span-2 lg:col-span-3">
								<label
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									for="payment-methods">Payment Methods</label
								>
								<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
									{#each paymentMethods as method}
										<label class="flex items-center" for="payment-{method}">
											<input
												id="payment-{method}"
												type="checkbox"
												checked={formData.payment_methods?.includes(method) || false}
												onchange={(e) => handlePaymentMethodChange(method, e)}
												class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<span class="ml-2 text-sm text-gray-700 dark:text-gray-300">{method}</span>
										</label>
									{/each}
								</div>
							</div>

							<!-- Venmo URL -->
							<div class="sm:col-span-2 lg:col-span-3">
								<label
									for="venmo-url"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Venmo URL (Optional)
								</label>
								<input
									id="venmo-url"
									type="url"
									bind:value={formData.venmo_url}
									placeholder="https://venmo.com/your-username"
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								/>
								<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Add your Venmo profile URL to allow customers to pay directly
								</p>
							</div>

							<!-- Allow Messages -->
							<div class="sm:col-span-2 lg:col-span-3">
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={formData.allow_messages}
										class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									/>
									<span class="ml-2 text-sm text-gray-700 dark:text-gray-300"
										>Allow messages through the app</span
									>
								</label>
							</div>

							<!-- Status -->
							<div class="sm:col-span-2 lg:col-span-3">
								<label
									class="block text-sm font-medium text-gray-700 dark:text-gray-300"
									for="status"
								>
									Status
								</label>
								<select
									id="status"
									bind:value={formData.status}
									class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
								>
									<option value="active">Active</option>
									<option value="on_break">On Break</option>
									<option value="closed">Closed</option>
								</select>
							</div>

							<!-- Status Reason -->
							{#if formData.status === 'on_break' || formData.status === 'closed'}
								<div class="sm:col-span-2 lg:col-span-3">
									<label
										class="block text-sm font-medium text-gray-700 dark:text-gray-300"
										for="status-reason"
									>
										Status Reason (Optional)
									</label>
									<input
										id="status-reason"
										type="text"
										bind:value={formData.status_reason}
										placeholder="e.g., Taking a lunch break, All items sold, etc."
										class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
									/>
								</div>
							{/if}
						</div>
					</div>

					<!-- Footer -->
					<div
						class="border-t border-gray-200 bg-gray-50 px-6 py-3 sm:flex sm:flex-row-reverse dark:border-gray-700 dark:bg-gray-700"
					>
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
								{isEditing ? 'Updating...' : 'Creating...'}
							{:else}
								{isEditing ? 'Update Yard Sale' : 'Create Yard Sale'}
							{/if}
						</button>
						<button
							type="button"
							onclick={onClose}
							class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
