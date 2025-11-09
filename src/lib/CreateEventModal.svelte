<script lang="ts">
	import { createEvent, type EventCreate, getAuthenticatedImageUrl } from './api';
	import ImageUpload from './ImageUpload.svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

	let { isOpen, onClose, onSuccess } = $props<{
		isOpen: boolean;
		onClose: () => void;
		onSuccess: () => void;
	}>();

	let formData = $state<EventCreate>({
		type: 'event',
		title: '',
		description: '',
		status: 'upcoming',
		is_public: true,
		is_free: false,
		comments_enabled: true
	});

	let loading = $state(false);
	let error = $state<string | null>(null);
	let showOptionalFields = $state(false);

	const eventTypes = [
		{ value: 'event', label: 'Event' },
		{ value: 'informational', label: 'Information' },
		{ value: 'advertisement', label: 'Advertisement' },
		{ value: 'announcement', label: 'Announcement' },
		{ value: 'lost_found', label: 'Lost & Found' },
		{ value: 'request_help', label: 'Request Help' },
		{ value: 'offer_help', label: 'Offer Help' },
		{ value: 'service_offer', label: 'Service Offer' }
	];

	const eventStatuses = [
		{ value: 'upcoming', label: 'Upcoming' },
		{ value: 'ongoing', label: 'Ongoing' },
		{ value: 'ended', label: 'Ended' },
		{ value: 'cancelled', label: 'Cancelled' }
	];

	const locationTypes = [
		{ value: 'indoor', label: 'Indoor' },
		{ value: 'outdoor', label: 'Outdoor' },
		{ value: 'virtual', label: 'Virtual' }
	];

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

	function normalizeUrl(url: string): string {
		if (!url?.trim()) return '';
		return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
	}

	// Sync is_free with price
	$effect(() => {
		if (formData.is_free) {
			formData.price = undefined;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!formData.title.trim()) {
			error = 'Please provide a title';
			return;
		}

		if (formData.price !== undefined && formData.price < 0) {
			error = 'Price must be >= 0';
			return;
		}

		loading = true;
		error = null;
		try {
			const galleryUrls = (formData.gallery_urls || []).filter((url) => url && url.trim() !== '');
			const tags = formData.tags?.filter((tag) => tag && tag.trim() !== '') || [];

			// Helper function to convert empty strings to undefined
			const cleanValue = (value: string | undefined | null): string | undefined => {
				return value && value.trim() !== '' ? value.trim() : undefined;
			};

			const payload: EventCreate = {
				type: formData.type,
				title: formData.title.trim(),
				description: cleanValue(formData.description),
				status: formData.status,
				is_public: formData.is_public,
				is_free: formData.is_free,
				comments_enabled: formData.comments_enabled,
				// Location fields
				address: cleanValue(formData.address),
				city: cleanValue(formData.city),
				state: cleanValue(formData.state),
				zip: cleanValue(formData.zip),
				location_type: cleanValue(formData.location_type) as
					| 'indoor'
					| 'outdoor'
					| 'virtual'
					| undefined,
				// Date & Time
				start_date: cleanValue(formData.start_date),
				end_date: cleanValue(formData.end_date),
				start_time: cleanValue(formData.start_time),
				end_time: cleanValue(formData.end_time),
				timezone: cleanValue(formData.timezone),
				// Pricing
				price: formData.is_free ? undefined : formData.price,
				// Category & Tags
				category: cleanValue(formData.category),
				tags: tags.length > 0 ? tags : undefined,
				age_restriction: cleanValue(formData.age_restriction),
				// Organizer Info
				organizer_name: cleanValue(formData.organizer_name),
				company: cleanValue(formData.company),
				contact_phone: cleanValue(formData.contact_phone),
				contact_email: cleanValue(formData.contact_email),
				// Social Links
				facebook_url: formData.facebook_url ? normalizeUrl(formData.facebook_url) : undefined,
				instagram_url: formData.instagram_url ? normalizeUrl(formData.instagram_url) : undefined,
				website: formData.website ? normalizeUrl(formData.website) : undefined,
				// Images
				gallery_urls: galleryUrls.length > 0 ? galleryUrls : undefined,
				featured_image: galleryUrls[0] || cleanValue(formData.featured_image)
			};

			await createEvent(payload);
			onSuccess();
			onClose();
			resetForm();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create event';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			type: 'event',
			title: '',
			description: '',
			status: 'upcoming',
			is_public: true,
			is_free: false,
			comments_enabled: true
		};
		showOptionalFields = false;
	}

	function addTag() {
		if (!formData.tags) formData.tags = [];
		const input = document.getElementById('tag-input') as HTMLInputElement;
		if (input && input.value.trim()) {
			formData.tags = [...formData.tags, input.value.trim()];
			input.value = '';
		}
	}

	function removeTag(index: number) {
		if (formData.tags) {
			formData.tags = formData.tags.filter((_, i) => i !== index);
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
		<div
			class="flex min-h-screen items-end justify-center px-4 pt-6 pb-6 text-center sm:block sm:p-0"
		>
			<div
				class="fixed inset-0 bg-black/50 backdrop-blur-sm"
				onclick={onClose}
				aria-hidden="true"
			></div>

			<div
				class="relative inline-block w-full transform overflow-hidden rounded-t-2xl bg-white/95 text-left align-bottom shadow-2xl ring-1 ring-white/20 backdrop-blur-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:rounded-2xl sm:align-middle dark:bg-gray-800/95 dark:ring-gray-700/50"
			>
				<div
					class="border-b border-gray-200/50 bg-white/80 px-6 py-6 sm:py-5 dark:border-gray-700/50 dark:bg-gray-800/80"
				>
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-semibold text-gray-900 dark:text-white">Create New Event</h3>
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
							<!-- Required Fields -->
							<div>
								<label
									for="title"
									class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
									>Title <span class="text-red-500">*</span></label
								>
								<input
									id="title"
									type="text"
									bind:value={formData.title}
									required
									maxlength="150"
									placeholder="e.g., Community Yard Sale"
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								/>
							</div>

							<div>
								<label
									for="description"
									class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
									>Description <span class="font-normal text-gray-400">(Optional)</span></label
								>
								<textarea
									id="description"
									rows="4"
									bind:value={formData.description}
									placeholder="Describe the event..."
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
								></textarea>
							</div>

							<div>
								<label
									for="type"
									class="mb-3 block text-sm font-semibold text-gray-700 sm:mb-2 dark:text-gray-300"
									>Event Type <span class="text-red-500">*</span></label
								>
								<select
									id="type"
									bind:value={formData.type}
									required
									class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-4 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3.5 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
								>
									{#each eventTypes as type}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
							</div>

							<!-- More Options Button -->
							<button
								type="button"
								onclick={() => (showOptionalFields = !showOptionalFields)}
								class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-4 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
							>
								<span>More Options</span>
								<FontAwesomeIcon
									icon={showOptionalFields ? faChevronUp : faChevronDown}
									class="h-4 w-4 transition-transform duration-200"
								/>
							</button>

							<!-- Optional Fields (Collapsible) -->
							{#if showOptionalFields}
								<div class="space-y-6 border-t border-gray-200 pt-6 dark:border-gray-700">
									<!-- Date & Time -->
									<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<div>
											<label
												for="start_date"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>Start Date <span class="font-normal text-gray-400">(Optional)</span></label
											>
											<input
												id="start_date"
												type="date"
												bind:value={formData.start_date}
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
											/>
										</div>
										<div>
											<label
												for="end_date"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>End Date <span class="font-normal text-gray-400">(Optional)</span></label
											>
											<input
												id="end_date"
												type="date"
												bind:value={formData.end_date}
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
											/>
										</div>
									</div>

									<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<div>
											<label
												for="start_time"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>Start Time <span class="font-normal text-gray-400">(Optional)</span></label
											>
											<input
												id="start_time"
												type="time"
												bind:value={formData.start_time}
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
											/>
										</div>
										<div>
											<label
												for="end_time"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>End Time <span class="font-normal text-gray-400">(Optional)</span></label
											>
											<input
												id="end_time"
												type="time"
												bind:value={formData.end_time}
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
											/>
										</div>
									</div>

									<div>
										<label
											for="timezone"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Timezone <span class="font-normal text-gray-400">(Optional)</span></label
										>
										<input
											id="timezone"
											type="text"
											bind:value={formData.timezone}
											placeholder="America/Denver"
											maxlength="50"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<!-- Location -->
									<div>
										<label
											for="address"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Address <span class="font-normal text-gray-400">(Optional)</span></label
										>
										<input
											id="address"
											type="text"
											bind:value={formData.address}
											placeholder="123 Main St"
											maxlength="255"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
										<div>
											<label
												for="city"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>City <span class="font-normal text-gray-400">(Optional)</span></label
											>
											<input
												id="city"
												type="text"
												bind:value={formData.city}
												placeholder="City"
												maxlength="100"
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
											/>
										</div>
										<div>
											<label
												for="state"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>State <span class="font-normal text-gray-400">(Optional)</span></label
											>
											<select
												id="state"
												bind:value={formData.state}
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
											>
												<option value="">Select State</option>
												{#each states as state}
													<option value={state}>{state}</option>
												{/each}
											</select>
										</div>
										<div>
											<label
												for="zip"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>ZIP <span class="font-normal text-gray-400">(Optional)</span></label
											>
											<input
												id="zip"
												type="text"
												bind:value={formData.zip}
												placeholder="84078"
												maxlength="10"
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
											/>
										</div>
									</div>

									<div>
										<label
											for="location_type"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Location Type <span class="font-normal text-gray-400">(Optional)</span
											></label
										>
										<select
											id="location_type"
											bind:value={formData.location_type}
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
										>
											<option value="">Select Location Type</option>
											{#each locationTypes as locationType}
												<option value={locationType.value}>{locationType.label}</option>
											{/each}
										</select>
									</div>

									<!-- Pricing -->
									<div>
										<label
											class="flex items-center rounded-lg bg-gray-50 p-5 transition-colors duration-200 hover:bg-gray-100 sm:p-4 dark:bg-gray-700 dark:hover:bg-gray-600"
										>
											<input
												type="checkbox"
												bind:checked={formData.is_free}
												class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
											/>
											<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300"
												>This event is free</span
											>
										</label>
									</div>

									{#if !formData.is_free}
										<div>
											<label
												for="price"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>Price <span class="font-normal text-gray-400">(Optional)</span></label
											>
											<input
												id="price"
												type="number"
												min="0"
												step="0.01"
												bind:value={formData.price}
												placeholder="0.00"
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-400"
											/>
										</div>
									{/if}

									<!-- Category & Tags -->
									<div>
										<label
											for="category"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Category <span class="font-normal text-gray-400">(Optional)</span></label
										>
										<input
											id="category"
											type="text"
											bind:value={formData.category}
											placeholder="e.g., community, music, sports"
											maxlength="50"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<div>
										<label
											for="tag-input"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Tags <span class="font-normal text-gray-400">(Optional)</span></label
										>
										<div class="flex gap-2">
											<input
												id="tag-input"
												type="text"
												placeholder="Add a tag"
												class="block flex-1 rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
												onkeydown={(e) => {
													if (e.key === 'Enter') {
														e.preventDefault();
														addTag();
													}
												}}
											/>
											<button
												type="button"
												onclick={addTag}
												class="rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-95"
											>
												Add
											</button>
										</div>
										{#if formData.tags && formData.tags.length > 0}
											<div class="mt-2 flex flex-wrap gap-2">
												{#each formData.tags as tag, index}
													<span
														class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
													>
														{tag}
														<button
															type="button"
															onclick={() => removeTag(index)}
															class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
														>
															×
														</button>
													</span>
												{/each}
											</div>
										{/if}
									</div>

									<div>
										<label
											for="age_restriction"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Age Restriction <span class="font-normal text-gray-400">(Optional)</span
											></label
										>
										<input
											id="age_restriction"
											type="text"
											bind:value={formData.age_restriction}
											placeholder="e.g., all, 18+, 21+"
											maxlength="20"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<!-- Organizer Info -->
									<div>
										<label
											for="organizer_name"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Organizer Name <span class="font-normal text-gray-400">(Optional)</span
											></label
										>
										<input
											id="organizer_name"
											type="text"
											bind:value={formData.organizer_name}
											placeholder="Your name or organization"
											maxlength="150"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<div>
										<label
											for="company"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Company/Organization <span class="font-normal text-gray-400">(Optional)</span
											></label
										>
										<input
											id="company"
											type="text"
											bind:value={formData.company}
											placeholder="Company or organization name"
											maxlength="150"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<div>
											<label
												for="contact_phone"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>Contact Phone <span class="font-normal text-gray-400">(Optional)</span
												></label
											>
											<input
												id="contact_phone"
												type="tel"
												bind:value={formData.contact_phone}
												placeholder="(555) 123-4567"
												maxlength="20"
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
											/>
										</div>
										<div>
											<label
												for="contact_email"
												class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
												>Contact Email <span class="font-normal text-gray-400">(Optional)</span
												></label
											>
											<input
												id="contact_email"
												type="email"
												bind:value={formData.contact_email}
												placeholder="contact@example.com"
												maxlength="150"
												class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
											/>
										</div>
									</div>

									<div>
										<label
											for="facebook_url"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Facebook URL <span class="font-normal text-gray-400">(Optional)</span></label
										>
										<input
											id="facebook_url"
											type="url"
											bind:value={formData.facebook_url}
											placeholder="https://facebook.com/..."
											maxlength="255"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<div>
										<label
											for="instagram_url"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Instagram URL <span class="font-normal text-gray-400">(Optional)</span
											></label
										>
										<input
											id="instagram_url"
											type="url"
											bind:value={formData.instagram_url}
											placeholder="https://instagram.com/..."
											maxlength="255"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<div>
										<label
											for="website"
											class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Website <span class="font-normal text-gray-400">(Optional)</span></label
										>
										<input
											id="website"
											type="url"
											bind:value={formData.website}
											placeholder="https://example.com"
											maxlength="255"
											class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
										/>
									</div>

									<!-- Image Upload -->
									<div>
										<label class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
											>Images <span class="font-normal text-gray-400">(Optional)</span></label
										>
										<ImageUpload
											images={formData.gallery_urls || []}
											maxImages={10}
											onImagesChange={(urls) => {
												formData.gallery_urls = urls;
											}}
										/>
									</div>

									<!-- Settings -->
									<label
										class="flex items-center rounded-lg bg-gray-50 p-5 transition-colors duration-200 hover:bg-gray-100 sm:p-4 dark:bg-gray-700 dark:hover:bg-gray-600"
									>
										<input
											type="checkbox"
											bind:checked={formData.is_public}
											class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
										/>
										<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300"
											>Make this event publicly visible</span
										>
									</label>

									<label
										class="flex items-center rounded-lg bg-gray-50 p-5 transition-colors duration-200 hover:bg-gray-100 sm:p-4 dark:bg-gray-700 dark:hover:bg-gray-600"
									>
										<input
											type="checkbox"
											bind:checked={formData.comments_enabled}
											class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
										/>
										<span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300"
											>Enable comments</span
										>
									</label>
								</div>
							{/if}
						</div>
					</div>

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
								Creating...
							{:else}
								Create Event
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
