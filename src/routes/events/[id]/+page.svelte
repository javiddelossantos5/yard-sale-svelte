<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		getEventById,
		getEventComments,
		createEventComment,
		updateEvent,
		deleteEvent,
		getAuthenticatedImageUrl,
		getCurrentUser,
		getEventConversations,
		isAdmin,
		type Event,
		type EventComment,
		type EventConversation,
		type CurrentUser
	} from '$lib/api';
	import { goto } from '$app/navigation';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faFacebook, faInstagram } from '@fortawesome/free-brands-svg-icons';
	import {
		faChevronLeft,
		faChevronRight,
		faEnvelope,
		faPhone,
		faPencil,
		faTrash,
		faCalendar,
		faShieldAlt,
		faMapMarkerAlt,
		faClock,
		faTag,
		faDollarSign,
		faPaperPlane,
		faCommentDots,
		faStar,
		faMessage,
		faLink,
		faHeart
	} from '@fortawesome/free-solid-svg-icons';
	import EditEventModal from '$lib/EditEventModal.svelte';
	import DeleteConfirmationModal from '$lib/DeleteConfirmationModal.svelte';
	import EventFeaturedImageModal from '$lib/EventFeaturedImageModal.svelte';
	import EventMessageModal from '$lib/EventMessageModal.svelte';
	import AppHeader from '$lib/AppHeader.svelte';
	import { openDirections, getPlatformName } from '$lib/mapsUtils';
	import { unreadMessageCount, loadNotificationCounts } from '$lib/notifications';

	let event = $state<Event | null>(null);
	let comments = $state<EventComment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let newComment = $state('');
	let currentUser = $state<CurrentUser | null>(null);
	let isEditOpen = $state(false);
	let submittingComment = $state(false);
	let showDeleteModal = $state(false);
	let deleting = $state(false);
	let showFeaturedImageModal = $state(false);
	let showMessageModal = $state(false);
	let existingConversation = $state<EventConversation | null>(null);
	let checkingConversation = $state(false);
	let urlCopied = $state(false);

	// Image carousel state
	let currentImageIndex = $state(0);
	let touchStartX = $state(0);
	let touchEndX = $state(0);
	let showAllImages = $state(false);

	// Full-screen image viewer state
	let imageViewerOpen = $state(false);
	let viewerImageIndex = $state(0);

	function formatDateTime(iso: string): string {
		try {
			const d = new Date(iso);
			return new Intl.DateTimeFormat(undefined, {
				year: 'numeric',
				month: 'short',
				day: '2-digit',
				hour: 'numeric',
				minute: '2-digit'
			}).format(d);
		} catch {
			return iso;
		}
	}

	function formatDate(dateString: string | null | undefined): string {
		if (!dateString) return '';
		try {
			// Parse date-only strings (YYYY-MM-DD) as local date to avoid timezone issues
			// For date-only strings, parse as local date and format without timezone conversion
			// to preserve the intended date
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
				// Date-only format: parse as local date to avoid timezone shifts
				const [year, month, day] = dateString.split('-').map(Number);
				const date = new Date(year, month - 1, day);
				return date.toLocaleDateString('en-US', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric'
					// Don't use timeZone for date-only strings to avoid day shifts
				});
			} else {
				// Already has time component, parse normally and use timezone
				const date = new Date(dateString);
				return date.toLocaleDateString('en-US', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					timeZone: event?.timezone || 'America/Denver'
				});
			}
		} catch {
			return '';
		}
	}

	function formatTime(timeString: string | null | undefined): string {
		if (!timeString) return '';
		try {
			return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true,
				timeZone: event?.timezone || 'America/Denver'
			});
		} catch {
			return '';
		}
	}

	function hasCompleteAddress(): boolean {
		return !!(event?.address && event?.city && event?.state && event?.zip);
	}

	function formatAddress(): string {
		if (!event) return '';
		const parts: string[] = [];
		if (event.address && event.address.trim()) parts.push(event.address.trim());
		if (event.city && event.city.trim()) parts.push(event.city.trim());
		if (event.state && event.state.trim()) parts.push(event.state.trim());
		if (event.zip && event.zip.trim()) parts.push(event.zip.trim());
		return parts.join(', ');
	}

	function handleAddressClick() {
		if (event && hasCompleteAddress()) {
			const fullAddress = `${event.address}, ${event.city}, ${event.state} ${event.zip}`;
			openDirections(fullAddress);
		}
	}

	function hasCalendarInfo(): boolean {
		return !!(event?.start_date && event?.start_time);
	}

	function generateCalendarLink(): string {
		if (!event || !hasCalendarInfo()) return '';

		// Create start and end datetime strings in ISO format
		const startDateTime = `${event.start_date}T${event.start_time}`;
		const endDate = event.end_date || event.start_date;
		const endTime = event.end_time || event.start_time;
		const endDateTime = `${endDate}T${endTime}`;

		// Format dates for calendar URL (YYYYMMDDTHHMMSSZ format)
		const startDate = new Date(startDateTime);
		const endDateObj = new Date(endDateTime);

		const formatForCalendar = (date: Date) => {
			return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
		};

		const startFormatted = formatForCalendar(startDate);
		const endFormatted = formatForCalendar(endDateObj);

		// Create event details
		const title = encodeURIComponent(event.title);
		const description = encodeURIComponent(
			`${event.description || 'Event'}\n\n` +
				(event.address && event.city && event.state && event.zip
					? `Location: ${event.address}, ${event.city}, ${event.state} ${event.zip}\n`
					: '') +
				(event.contact_phone ? `Contact: ${event.contact_phone}\n` : '') +
				(event.contact_email ? `Email: ${event.contact_email}\n` : '') +
				(event.website ? `Website: ${event.website}` : '')
		);
		const location =
			event.address && event.city && event.state && event.zip
				? encodeURIComponent(`${event.address}, ${event.city}, ${event.state} ${event.zip}`)
				: '';

		// Generate Google Calendar URL
		const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${description}${location ? `&location=${location}` : ''}`;

		return googleCalendarUrl;
	}

	function addToCalendar() {
		const calendarUrl = generateCalendarLink();
		if (calendarUrl) {
			window.open(calendarUrl, '_blank');
		}
	}

	function formatPrice(price: number | null | undefined): string {
		if (price === null || price === undefined) return '';
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(price);
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'ongoing':
				return 'bg-green-600/90 text-white';
			case 'ended':
				return 'bg-gray-600/90 text-white';
			case 'cancelled':
				return 'bg-red-600/90 text-white';
			default:
				return 'bg-blue-600/90 text-white';
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'ongoing':
				return 'Ongoing';
			case 'ended':
				return 'Ended';
			case 'cancelled':
				return 'Cancelled';
			default:
				return 'Upcoming';
		}
	}

	function getTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			event: 'Event',
			informational: 'Information',
			advertisement: 'Advertisement',
			announcement: 'Announcement',
			lost_found: 'Lost & Found',
			request_help: 'Request Help',
			offer_help: 'Offer Help',
			service_offer: 'Service Offer',
			weather: 'Weather',
			job_posting: 'Job Posting'
		};
		return labels[type] || type;
	}

	function getEmploymentTypeLabel(type: string | null | undefined): string {
		if (!type) return '';
		const labels: Record<string, string> = {
			full_time: 'Full Time',
			part_time: 'Part Time',
			contract: 'Contract',
			temporary: 'Temporary',
			seasonal: 'Seasonal',
			internship: 'Internship'
		};
		return labels[type] || type;
	}

	function getRelativeTime(dateString: string): string {
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffSecs = Math.floor(diffMs / 1000);
			const diffMins = Math.floor(diffSecs / 60);
			const diffHours = Math.floor(diffMins / 60);
			const diffDays = Math.floor(diffHours / 24);

			if (diffSecs < 60) return 'just now';
			if (diffMins < 60) return `${diffMins}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			if (diffDays < 7) return `${diffDays}d ago`;
			return formatDateTime(dateString);
		} catch {
			return dateString;
		}
	}

	async function load() {
		loading = true;
		error = null;

		try {
			const id = $page.params.id || '';

			if (!id) {
				error = 'Invalid event ID';
				loading = false;
				return;
			}

			// Load user first (non-critical, can fail silently)
			try {
				currentUser = await getCurrentUser();
				// Load notification counts when user is loaded
				if (currentUser) {
					await loadNotificationCounts();
				}
			} catch (err) {
				currentUser = null;
			}

			// Load the event (critical - must succeed)
			try {
				event = await getEventById(id);
			} catch (err: any) {
				error = err?.message || 'Failed to load event';
				event = null;
				loading = false;
				return;
			}

			// Load comments (non-critical, can fail)
			if (id && event && event.comments_enabled) {
				try {
					comments = await getEventComments(id);
				} catch (err) {
					comments = [];
				}
			}

			// Check for existing conversation (non-critical, can fail)
			if (id && currentUser) {
				try {
					await checkExistingConversation(id);
				} catch (err) {
					// Don't throw - this is not critical
				}
			}
		} catch (e: any) {
			error = e?.message || 'Failed to load event';
			event = null;
		} finally {
			loading = false;
		}
	}

	async function checkExistingConversation(eventId: string) {
		if (!currentUser) return;
		checkingConversation = true;
		try {
			const conversations = await getEventConversations();
			const conv = conversations.find((c) => c.event_id === eventId);
			existingConversation = conv || null;
		} catch {
			// Ignore errors checking conversation
		} finally {
			checkingConversation = false;
		}
	}

	function viewConversation() {
		if (existingConversation) {
			goto(`/events/messages/${existingConversation.id}`);
		}
	}

	async function submitComment(e: SubmitEvent) {
		e.preventDefault();
		if (!event || !newComment.trim() || submittingComment || !event.comments_enabled) return;
		submittingComment = true;
		try {
			const created = await createEventComment(event.id, { content: newComment.trim() });
			comments = [...comments, created];
			newComment = '';
		} catch (e: any) {
			error = e?.message || 'Failed to post comment';
		} finally {
			submittingComment = false;
		}
	}

	async function handleEditSuccess() {
		await load();
	}

	function handleSetFeaturedImage() {
		if (currentUser && event && (currentUser.id === event.organizer_id || isAdmin(currentUser))) {
			showFeaturedImageModal = true;
		}
	}

	function handleCloseFeaturedImageModal() {
		showFeaturedImageModal = false;
	}

	async function handleFeaturedImageSuccess() {
		showFeaturedImageModal = false;
		await load();
	}

	async function handleMessageSuccess() {
		showMessageModal = false;
		// Refresh conversation check after sending message
		if (event) {
			await checkExistingConversation(event.id);
		}
		// Navigate to messages after sending
		goto('/messages?tab=events');
	}

	function handleDeleteEvent() {
		if (currentUser && event && (currentUser.id === event.organizer_id || isAdmin(currentUser))) {
			showDeleteModal = true;
		}
	}

	async function handleCopyUrl() {
		try {
			const url = window.location.href;
			await navigator.clipboard.writeText(url);
			urlCopied = true;
			setTimeout(() => {
				urlCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy URL:', err);
		}
	}

	function handleCloseDeleteModal() {
		showDeleteModal = false;
	}

	async function handleConfirmDelete() {
		if (!event || deleting) return;

		deleting = true;
		error = null;
		showDeleteModal = false;
		try {
			await deleteEvent(event.id);
			goto('/events');
		} catch (e: any) {
			error = e?.message || 'Failed to delete event';
			showDeleteModal = true;
		} finally {
			deleting = false;
		}
	}

	// Image carousel functions
	function getDisplayImages() {
		if (!event || !event.gallery_urls || event.gallery_urls.length === 0) return [];
		const images = event.gallery_urls;
		const featuredImage = event.featured_image;
		if (featuredImage && images.includes(featuredImage)) {
			return [featuredImage, ...images.filter((img) => img !== featuredImage)];
		}
		return images;
	}

	function nextImage() {
		const images = getDisplayImages();
		if (images.length > 0) {
			currentImageIndex = (currentImageIndex + 1) % images.length;
		}
	}

	function previousImage() {
		const images = getDisplayImages();
		if (images.length > 0) {
			currentImageIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
		}
	}

	function goToImage(index: number) {
		currentImageIndex = index;
	}

	function openImageViewer(index: number) {
		viewerImageIndex = index;
		imageViewerOpen = true;
	}

	function closeImageViewer() {
		imageViewerOpen = false;
	}

	function nextViewerImage() {
		const images = getDisplayImages();
		if (images.length > 0) {
			viewerImageIndex = (viewerImageIndex + 1) % images.length;
		}
	}

	function previousViewerImage() {
		const images = getDisplayImages();
		if (images.length > 0) {
			viewerImageIndex = viewerImageIndex === 0 ? images.length - 1 : viewerImageIndex - 1;
		}
	}

	// Touch handlers for mobile carousel
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}

	function handleTouchMove(e: TouchEvent) {
		touchEndX = e.touches[0].clientX;
	}

	function handleTouchEnd() {
		if (!touchStartX || !touchEndX) return;
		const diff = touchStartX - touchEndX;
		if (Math.abs(diff) > 50) {
			if (diff > 0) {
				nextImage();
			} else {
				previousImage();
			}
		}
	}

	const isOrganizer = $derived(
		!!(
			currentUser &&
			event &&
			currentUser.id &&
			event.organizer_id &&
			currentUser.id === event.organizer_id
		)
	);
	const canEdit = $derived(
		currentUser && event && (currentUser.id === event.organizer_id || isAdmin(currentUser))
	);

	// React to changes in the route parameter
	const eventId = $derived($page.params.id || '');

	$effect(() => {
		if (typeof window === 'undefined') return;

		const currentId = $page.params.id || '';

		if (currentId) {
			loading = true;
			error = null;
			event = null;
			comments = [];
			currentImageIndex = 0;
			imageViewerOpen = false;

			load().catch((err) => {
				error = err?.message || 'Failed to load event';
				loading = false;
			});
		} else {
			error = 'No event ID provided';
			loading = false;
		}
	});

	const mobileMenuItems = $derived.by(() => {
		const items: Array<{
			label: string;
			icon: any;
			action: () => void;
			badge?: number;
		}> = [];
		if (currentUser && isAdmin(currentUser)) {
			items.push({
				label: 'Admin',
				icon: faShieldAlt,
				action: () => {
					void goto('/admin');
				}
			});
		}
		if (currentUser) {
			items.push({
				label: 'Watched Items',
				icon: faHeart,
				action: () => {
					void goto('/market/watched');
				}
			});
			items.push({
				label: 'Messages',
				icon: faMessage,
				action: () => {
					void goto('/messages?tab=events');
				},
				badge: $unreadMessageCount > 0 ? $unreadMessageCount : undefined
			});
		}
		return items;
	});
</script>

<svelte:head>
	<title>{event ? `${event.title} - Events` : 'Event'}</title>
	<meta name="description" content={event?.description || 'View event details'} />
	<style>
		:global(html, body) {
			background-color: rgb(249 250 251);
		}
		:global(.dark html, .dark body) {
			background-color: rgb(17 24 39);
		}
	</style>
</svelte:head>

<!-- Event Detail Page -->
<div
	class="min-h-screen bg-gray-50 dark:bg-gray-900"
	style="min-height: 100vh;"
	data-page="event-detail"
>
	{#if loading}
		<div class="px-4 py-6 text-gray-600 dark:text-gray-300">Loading event...</div>
	{:else if error}
		<div class="px-4 py-6 text-red-600">
			<p class="font-semibold">Error loading event</p>
			<p class="text-sm">{error}</p>
			<button
				onclick={() => {
					error = null;
					load();
				}}
				class="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
			>
				Retry
			</button>
		</div>
	{:else if event}
		<AppHeader
			title={event.title}
			subtitle="Event"
			showBackButton={true}
			backUrl="/events"
			backLabel="Back to events"
			{currentUser}
			{mobileMenuItems}
		/>

		<!-- Event Details -->
		{#if event && !loading}
			<div class="mx-auto max-w-7xl space-y-6 sm:space-y-8">
				<!-- Hero Section -->
				<div
					class="relative overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<div class="px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
						<!-- Header with Actions -->
						<div
							class="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
						>
							<div class="min-w-0 flex-1">
								<!-- Status Banner -->
								<div class="mb-6 flex-shrink-0">
									<div class="flex flex-wrap items-center gap-2">
										<span
											class="inline-flex items-center rounded-full bg-purple-100 px-4 py-2.5 text-sm font-medium text-purple-700 dark:bg-purple-900/10 dark:text-purple-300"
										>
											{getTypeLabel(event.type)}
										</span>
										<span
											class="inline-flex items-center rounded-full px-4 py-2.5 text-sm font-medium backdrop-blur-md {getStatusColor(
												event.status
											)}"
										>
											{getStatusLabel(event.status)}
										</span>
										{#if event.is_free}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/10 dark:text-green-300"
											>
												<FontAwesomeIcon icon={faTag} class="h-3 w-3" />
												Free
											</span>
										{:else if event.price !== null && event.price !== undefined}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 dark:bg-blue-900/10 dark:text-blue-300"
											>
												<FontAwesomeIcon icon={faDollarSign} class="h-3 w-3" />
												${formatPrice(event.price)}
											</span>
										{/if}
									</div>
								</div>
							</div>

							<!-- Actions -->
							<div
								class="mt-4 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-nowrap sm:gap-3"
							>
								<!-- Copy URL Button (visible to everyone) -->
								<button
									onclick={handleCopyUrl}
									class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-gray-700 transition-all hover:bg-gray-50 active:scale-95 sm:flex-none sm:px-5 sm:py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
								>
									<FontAwesomeIcon icon={faLink} class="mr-2 h-4 w-4 shrink-0" />
									<span>{urlCopied ? 'Copied!' : 'Copy URL'}</span>
								</button>

								<!-- Owner Actions -->
								{#if canEdit}
									<button
										onclick={() => (isEditOpen = true)}
										class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-gray-700 transition-all hover:bg-gray-50 active:scale-95 sm:flex-none sm:px-5 sm:py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
									>
										<FontAwesomeIcon icon={faPencil} class="mr-2 h-4 w-4 shrink-0" />
										<span>Edit</span>
									</button>
									{#if event.gallery_urls && event.gallery_urls.length > 0}
										<button
											onclick={handleSetFeaturedImage}
											class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-gray-700 transition-all hover:bg-gray-50 active:scale-95 sm:flex-none sm:px-5 sm:py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
										>
											<FontAwesomeIcon icon={faStar} class="mr-2 h-4 w-4 shrink-0" />
											<span class="hidden sm:inline">Set Featured Image</span>
											<span class="sm:hidden">Featured</span>
										</button>
									{/if}
									<button
										onclick={handleDeleteEvent}
										disabled={deleting}
										class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-red-700 transition-all hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5 sm:py-3 dark:border-red-600 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-900/30"
									>
										<FontAwesomeIcon icon={faTrash} class="mr-2 h-4 w-4 shrink-0" />
										<span>{deleting ? 'Deleting...' : 'Delete'}</span>
									</button>
								{/if}
							</div>
						</div>

						<!-- Title and Content Section -->
						<div class="w-full">
							<!-- Title -->
							<h1
								class="mb-4 text-3xl leading-tight font-bold break-words text-gray-900 sm:text-4xl dark:text-white"
							>
								{event.title}
							</h1>

							<!-- Job Posting Fields -->
							{#if event.type === 'job_posting'}
								<div class="mb-6 space-y-2">
									{#if event.job_title}
										<div>
											<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
												{event.job_title}
											</h2>
										</div>
									{/if}
									{#if event.employment_type}
										<div>
											<span
												class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
											>
												{getEmploymentTypeLabel(event.employment_type)}
											</span>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Weather Fields -->
							{#if event.type === 'weather' && event.weather_conditions}
								<div class="mb-6">
									<div
										class="inline-flex items-center rounded-full bg-yellow-100 px-4 py-2 text-base font-semibold text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200"
									>
										{event.weather_conditions}
									</div>
								</div>
							{/if}

							<!-- Image Gallery -->
							{#if event.gallery_urls && event.gallery_urls.length > 0}
								{@const displayImages = getDisplayImages()}
								<div class="mb-6 w-full">
									{#if displayImages.length === 1}
										<button
											onclick={() => openImageViewer(0)}
											class="w-full overflow-hidden rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
										>
											<img
												src={getAuthenticatedImageUrl(displayImages[0])}
												alt={event.title}
												class="h-64 w-full object-cover sm:h-80"
												loading="lazy"
											/>
										</button>
									{:else}
										<!-- Mobile Carousel -->
										<div class="relative block sm:hidden">
											<div
												class="relative overflow-hidden rounded-2xl"
												ontouchstart={handleTouchStart}
												ontouchmove={handleTouchMove}
												ontouchend={handleTouchEnd}
											>
												<div
													class="flex transition-transform duration-300 ease-in-out"
													style="transform: translateX(-{currentImageIndex * 100}%)"
												>
													{#each displayImages as photo, index}
														<button
															onclick={() => openImageViewer(index)}
															class="min-w-full transition-transform active:scale-[0.98]"
														>
															<img
																src={getAuthenticatedImageUrl(photo)}
																alt="{event.title} - Image {index + 1}"
																class="h-64 w-full object-cover"
																loading="lazy"
															/>
														</button>
													{/each}
												</div>

												{#if displayImages.length > 1}
													<button
														onclick={previousImage}
														class="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70 active:scale-95 dark:bg-white/20 dark:hover:bg-white/30"
														aria-label="Previous image"
													>
														<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
													</button>
													<button
														onclick={nextImage}
														class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70 active:scale-95 dark:bg-white/20 dark:hover:bg-white/30"
														aria-label="Next image"
													>
														<FontAwesomeIcon icon={faChevronRight} class="h-5 w-5" />
													</button>
													<div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
														{#each displayImages as _, index}
															<button
																onclick={() => goToImage(index)}
																class="h-2 rounded-full transition-all {currentImageIndex === index
																	? 'w-6 bg-white'
																	: 'w-2 bg-white/50 hover:bg-white/75'}"
																aria-label="Go to image {index + 1}"
															></button>
														{/each}
													</div>
												{/if}
											</div>
										</div>

										<!-- Desktop Grid -->
										<div class="hidden sm:grid sm:grid-cols-2 sm:gap-3">
											{#each showAllImages ? displayImages : displayImages.slice(0, 4) as photo, index}
												<button
													onclick={() => openImageViewer(index)}
													class="overflow-hidden rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
												>
													<img
														src={getAuthenticatedImageUrl(photo)}
														alt="{event.title} - Image {index + 1}"
														class="h-32 w-full object-cover sm:h-40"
														loading="lazy"
													/>
												</button>
											{/each}
										</div>
										{#if displayImages.length > 4}
											<button
												onclick={() => (showAllImages = !showAllImages)}
												class="mt-2 hidden text-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 active:scale-95 sm:block dark:text-blue-400 dark:hover:text-blue-300"
											>
												{showAllImages ? 'Show Less' : `+${displayImages.length - 4} more images`}
											</button>
										{/if}
									{/if}
								</div>
							{/if}

							<!-- Organizer Information -->
							<div class="mb-6">
								<button
									onclick={() => event && goto(`/profile/${event.organizer_id}`)}
									class="group flex items-center rounded-2xl bg-gray-100/60 px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-blue-100/60 active:scale-95 dark:bg-gray-700/60 dark:hover:bg-blue-900/30"
								>
									{#if event.organizer_profile_picture && event.organizer_profile_picture.trim() !== ''}
										<img
											src={getAuthenticatedImageUrl(event.organizer_profile_picture)}
											alt={event.organizer_username}
											class="mr-3 h-8 w-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
											onerror={(e) => {
												const img = e.target as HTMLImageElement;
												img.style.display = 'none';
												const fallback = img.parentElement?.querySelector(
													'.organizer-fallback'
												) as HTMLElement;
												if (fallback) fallback.style.display = 'flex';
											}}
										/>
									{/if}
									<div
										class="organizer-fallback mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 {event.organizer_profile_picture &&
										event.organizer_profile_picture.trim() !== ''
											? 'hidden'
											: ''}"
									>
										<span class="text-sm font-bold text-white">
											{event.organizer_username.charAt(0).toUpperCase()}
										</span>
									</div>
									<div class="flex-1 text-left">
										<div class="flex items-center gap-2">
											<div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
												Organized by {event.organizer_username}
											</div>
											{#if event.organizer_is_admin}
												<div
													class="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
													title="Admin Verified"
												>
													<FontAwesomeIcon icon={faShieldAlt} class="h-2.5 w-2.5" />
													<span>Admin</span>
												</div>
											{/if}
										</div>
										{#if event.company}
											<p class="text-xs text-gray-600 dark:text-gray-400">{event.company}</p>
										{/if}
									</div>
									<FontAwesomeIcon
										icon={faChevronRight}
										class="ml-2 h-4 w-4 text-gray-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
									/>
								</button>
							</div>

							<!-- Location -->
							{#if formatAddress()}
								<div class="flex items-center text-gray-600 dark:text-gray-300">
									<svg
										class="mr-3 h-5 w-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
									{#if hasCompleteAddress()}
										<button
											onclick={handleAddressClick}
											class="text-left text-lg font-medium text-blue-600 hover:text-blue-700 hover:underline focus:underline focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
											title={`Click to open in ${getPlatformName()}`}
										>
											{formatAddress()}
										</button>
									{:else}
										<span class="text-lg font-medium">
											{formatAddress()}
										</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
				<!-- Hero Section closes above -->

				<!-- Main Content Grid -->
				<div class="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12">
					<!-- Left Column - Main Info -->
					<div class="space-y-6 sm:space-y-8 lg:col-span-8">
						<!-- Date and Time Card -->
						{#if event.start_date || event.start_time}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								{#if hasCalendarInfo()}
									<div class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
										{#if event.start_date}
											<button
												onclick={addToCalendar}
												class="group flex w-full items-start space-x-3 rounded-xl p-4 transition-all hover:bg-gray-50 active:bg-gray-100 sm:space-x-4 dark:hover:bg-gray-700/50 dark:active:bg-gray-700"
												title="Add to Calendar"
											>
												<div
													class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 transition-colors group-hover:bg-blue-100 sm:h-12 sm:w-12 dark:bg-blue-900/20 dark:group-hover:bg-blue-900/30"
												>
													<FontAwesomeIcon
														icon={faCalendar}
														class="h-5 w-5 text-blue-600 sm:h-6 sm:w-6 dark:text-blue-400"
													/>
												</div>
												<div class="flex-1 text-left">
													<div class="flex items-center gap-2">
														<h3
															class="text-base font-semibold text-gray-900 sm:text-lg dark:text-white"
														>
															Date
														</h3>
														<svg
															class="h-3 w-3 text-gray-400 transition-colors group-hover:text-gray-600 sm:h-4 sm:w-4 dark:group-hover:text-gray-300"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
															/>
														</svg>
													</div>
													<p class="mt-1 text-sm text-gray-600 sm:text-base dark:text-gray-300">
														{formatDate(event.start_date)}
														{#if event.end_date && event.end_date !== event.start_date}
															- {formatDate(event.end_date)}
														{/if}
													</p>
													<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
														Tap to add to calendar
													</p>
												</div>
											</button>
										{/if}
										{#if event.start_time}
											<button
												onclick={addToCalendar}
												class="group flex w-full items-start space-x-3 rounded-xl p-4 transition-all hover:bg-gray-50 active:bg-gray-100 sm:space-x-4 dark:hover:bg-gray-700/50 dark:active:bg-gray-700"
												title="Add to Calendar"
											>
												<div
													class="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 transition-colors group-hover:bg-green-100 sm:h-12 sm:w-12 dark:bg-green-900/20 dark:group-hover:bg-green-900/30"
												>
													<FontAwesomeIcon
														icon={faClock}
														class="h-5 w-5 text-green-600 sm:h-6 sm:w-6 dark:text-green-400"
													/>
												</div>
												<div class="flex-1 text-left">
													<div class="flex items-center gap-2">
														<h3
															class="text-base font-semibold text-gray-900 sm:text-lg dark:text-white"
														>
															Time
														</h3>
														<svg
															class="h-3 w-3 text-gray-400 transition-colors group-hover:text-gray-600 sm:h-4 sm:w-4 dark:group-hover:text-gray-300"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
															/>
														</svg>
													</div>
													<p class="mt-1 text-sm text-gray-600 sm:text-base dark:text-gray-300">
														{formatTime(event.start_time)}
														{#if event.end_time && event.end_time !== event.start_time}
															- {formatTime(event.end_time)}
														{/if}
														{#if event.timezone}
															<span class="text-xs text-gray-500 dark:text-gray-400">
																({event.timezone})
															</span>
														{/if}
													</p>
													<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
														Tap to add to calendar
													</p>
												</div>
											</button>
										{/if}
									</div>
								{:else}
									<div class="space-y-4">
										{#if event.start_date}
											<div class="flex items-center gap-3">
												<FontAwesomeIcon
													icon={faCalendar}
													class="h-5 w-5 text-gray-400 dark:text-gray-500"
												/>
												<div>
													<p class="text-sm font-medium text-gray-900 dark:text-white">Date</p>
													<p class="text-sm text-gray-600 dark:text-gray-300">
														{formatDate(event.start_date)}
														{#if event.end_date && event.end_date !== event.start_date}
															- {formatDate(event.end_date)}
														{/if}
													</p>
												</div>
											</div>
										{/if}
										{#if event.start_time}
											<div class="flex items-center gap-3">
												<FontAwesomeIcon
													icon={faClock}
													class="h-5 w-5 text-gray-400 dark:text-gray-500"
												/>
												<div>
													<p class="text-sm font-medium text-gray-900 dark:text-white">Time</p>
													<p class="text-sm text-gray-600 dark:text-gray-300">
														{formatTime(event.start_time)}
														{#if event.end_time && event.end_time !== event.start_time}
															- {formatTime(event.end_time)}
														{/if}
														{#if event.timezone}
															<span class="text-xs text-gray-500 dark:text-gray-400">
																({event.timezone})
															</span>
														{/if}
													</p>
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Description Card -->
						{#if event.description}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
									Description
								</h2>
								<p class="leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
									{event.description}
								</p>
							</div>
						{/if}

						<!-- Tags & Category Card -->
						{#if (event.tags && event.tags.length > 0) || event.category || event.age_restriction}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								{#if event.tags && event.tags.length > 0}
									<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Tags</h2>
									<div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
										{#each event.tags as tag}
											<span
												class="inline-flex items-center justify-center rounded-xl border border-gray-200/50 bg-blue-50/60 px-4 py-2 text-center text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md dark:border-gray-700/50 dark:bg-blue-900/20 dark:text-gray-200 dark:hover:bg-blue-900/30"
											>
												#{tag}
											</span>
										{/each}
									</div>
								{/if}
								{#if event.category || event.age_restriction}
									<div class="flex flex-wrap gap-2">
										{#if event.category}
											<span
												class="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800/50"
											>
												<FontAwesomeIcon icon={faTag} class="h-3 w-3" />
												{event.category}
											</span>
										{/if}
										{#if event.age_restriction}
											<span
												class="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800/50"
											>
												{event.age_restriction}
											</span>
										{/if}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Contact Information Card -->
						{#if event.contact_phone || event.contact_email}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
									Contact Information
								</h2>
								<div class="flex flex-wrap gap-3">
									{#if event.contact_phone}
										<a
											href={`tel:${event.contact_phone}`}
											class="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-200 dark:bg-green-900/20 dark:text-green-200 dark:hover:bg-green-900/30"
										>
											<FontAwesomeIcon icon={faPhone} class="mr-2 h-4 w-4" />
											{event.contact_phone}
										</a>
									{/if}
									{#if event.contact_email}
										<a
											href={`mailto:${event.contact_email}`}
											class="inline-flex items-center rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:hover:bg-purple-900/30"
										>
											<FontAwesomeIcon icon={faEnvelope} class="mr-2 h-4 w-4" />
											{event.contact_email}
										</a>
									{/if}
								</div>
							</div>
						{/if}
					</div>
					<!-- Left Column closes above -->

					<!-- Right Column - Sidebar -->
					<div class="space-y-6 lg:col-span-4">
						<!-- Price Card -->
						{#if event.price !== null && event.price !== undefined && !event.is_free}
							<div
								class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<div class="flex items-center space-x-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20"
									>
										<FontAwesomeIcon
											icon={faDollarSign}
											class="h-5 w-5 text-green-600 dark:text-green-400"
										/>
									</div>
									<div>
										<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
										<p class="text-2xl font-bold text-gray-900 dark:text-white">
											${formatPrice(event.price)}
										</p>
									</div>
								</div>
							</div>
						{/if}

						<!-- Actions Section -->
						{#if hasCompleteAddress() || event.facebook_url || event.instagram_url || event.website || (!isOrganizer && currentUser && event)}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Actions</h3>
								<div class="space-y-3">
									<!-- Get Directions Button -->
									{#if hasCompleteAddress()}
										<button
											onclick={handleAddressClick}
											class="flex w-full items-center justify-center rounded-full bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-700"
										>
											<FontAwesomeIcon icon={faMapMarkerAlt} class="mr-2 h-4 w-4" />
											Get Directions
										</button>
									{/if}

									<!-- Message Organizer Button -->
									{#if !isOrganizer && currentUser && event}
										{#if existingConversation}
											<button
												onclick={viewConversation}
												class="flex w-full items-center justify-center rounded-full bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-600 active:scale-95 dark:bg-green-600 dark:hover:bg-green-700"
											>
												<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
												View Conversation
												{#if existingConversation.unread_count && existingConversation.unread_count > 0}
													<span
														class="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold"
														>{existingConversation.unread_count}</span
													>
												{/if}
											</button>
										{:else}
											<button
												onclick={() => (showMessageModal = true)}
												disabled={checkingConversation}
												class="flex w-full items-center justify-center rounded-full bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
											>
												<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
												{checkingConversation ? 'Checking...' : 'Message Organizer'}
											</button>
										{/if}
									{/if}

									<!-- Facebook Button -->
									{#if event.facebook_url}
										<a
											href={event.facebook_url}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 dark:bg-blue-700 dark:hover:bg-blue-800"
											title="View on Facebook"
										>
											<FontAwesomeIcon icon={faFacebook} class="mr-2 h-4 w-4" />
											Facebook
										</a>
									{/if}

									<!-- Instagram Button -->
									{#if event.instagram_url}
										<a
											href={event.instagram_url}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-600 hover:to-pink-600 active:scale-95"
											title="View on Instagram"
										>
											<FontAwesomeIcon icon={faInstagram} class="mr-2 h-4 w-4" />
											Instagram
										</a>
									{/if}

									<!-- Website Button -->
									{#if event.website}
										<a
											href={event.website}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex w-full items-center justify-center rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-95 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
											title="Visit Website"
										>
											<FontAwesomeIcon icon={faLink} class="mr-2 h-4 w-4" />
											Website
										</a>
									{/if}
								</div>
							</div>
						{/if}
					</div>
					<!-- Right Column closes above -->
				</div>
				<!-- Main Content Grid closes above -->

				<!-- Comments Section -->
				{#if event.comments_enabled}
					<div
						class="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
					>
						<div
							class="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 dark:border-gray-700"
						>
							<div class="flex items-center gap-2">
								<FontAwesomeIcon
									icon={faCommentDots}
									class="h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
								<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
									Comments ({comments.length})
								</h2>
							</div>
						</div>

						<!-- Add Comment Form -->
						{#if currentUser}
							<div
								class="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 dark:border-gray-700"
							>
								<form
									onsubmit={(e) => {
										e.preventDefault();
										submitComment(e);
									}}
								>
									<div class="mb-6">
										<label
											for="comment"
											class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											Add a Comment
										</label>
										<textarea
											id="comment"
											bind:value={newComment}
											rows="4"
											placeholder="Share your thoughts about this event..."
											class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
											required
										></textarea>
									</div>
									<button
										type="submit"
										disabled={submittingComment || !newComment.trim()}
										class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{#if submittingComment}
											<svg
												class="mr-2 h-4 w-4 animate-spin"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
											>
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
											Posting...
										{:else}
											<FontAwesomeIcon icon={faPaperPlane} class="mr-2 h-4 w-4" />
											Post Comment
										{/if}
									</button>
								</form>
							</div>
						{:else}
							<div
								class="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 dark:border-gray-700"
							>
								<div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
									<div class="flex">
										<svg
											class="h-5 w-5 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										<div class="ml-3">
											<h3 class="text-sm font-medium text-gray-800 dark:text-gray-200">
												Sign in to comment
											</h3>
											<div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
												<p>
													<a
														href="/login"
														class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
														>Sign in</a
													>
													to leave a comment
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						{/if}

						<!-- Comments List -->
						<div class="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
							{#if comments.length === 0}
								<div class="py-8 text-center">
									<FontAwesomeIcon
										icon={faCommentDots}
										class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
									/>
									<p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
										No comments yet. Be the first to share your thoughts!
									</p>
								</div>
							{:else}
								<div class="space-y-6">
									{#each comments as comment (comment.id)}
										<div
											class="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0 dark:border-gray-700"
										>
											<div class="flex items-start space-x-3">
												<div class="shrink-0">
													{#if comment.user_profile_picture && comment.user_profile_picture.trim() !== ''}
														<img
															src={getAuthenticatedImageUrl(comment.user_profile_picture)}
															alt={comment.username ?? 'Anonymous'}
															class="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
															onerror={(e) => {
																const img = e.target as HTMLImageElement;
																img.style.display = 'none';
																const fallback = img.parentElement?.querySelector(
																	'.profile-fallback'
																) as HTMLElement;
																if (fallback) fallback.style.display = 'flex';
															}}
														/>
													{/if}
													<div
														class="profile-fallback flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 {comment.user_profile_picture &&
														comment.user_profile_picture.trim() !== ''
															? 'hidden'
															: ''}"
													>
														<span class="text-sm font-medium text-blue-600 dark:text-blue-400">
															{(comment.username ?? 'Anonymous').charAt(0).toUpperCase()}
														</span>
													</div>
												</div>
												<div class="min-w-0 flex-1">
													<div class="flex flex-wrap items-center gap-2 sm:gap-1">
														<p class="text-sm font-medium text-gray-900 dark:text-white">
															{comment.username ?? 'Anonymous'}
														</p>
														{#if comment.user_is_admin}
															<div
																class="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
																title="Admin"
															>
																<FontAwesomeIcon icon={faShieldAlt} class="h-2 w-2" />
																<span class="hidden sm:inline">Admin</span>
															</div>
														{/if}
														<span class="hidden text-sm text-gray-500 sm:inline dark:text-gray-400"
															>•</span
														>
														<time
															class="text-sm text-gray-500 dark:text-gray-400"
															datetime={comment.created_at}
														>
															{getRelativeTime(comment.created_at)}
														</time>
													</div>
													<div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
														<p>{comment.content}</p>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- Edit Modal -->
	{#if event}
		<EditEventModal
			isOpen={isEditOpen}
			onClose={() => (isEditOpen = false)}
			onSuccess={handleEditSuccess}
			{event}
		/>
	{/if}

	<!-- Delete Confirmation Modal -->
	{#if showDeleteModal && event}
		<DeleteConfirmationModal
			isOpen={showDeleteModal}
			onClose={handleCloseDeleteModal}
			onConfirm={handleConfirmDelete}
			itemName="event"
			itemType="item"
		/>
	{/if}

	<!-- Featured Image Modal -->
	{#if showFeaturedImageModal && event}
		<EventFeaturedImageModal
			isOpen={showFeaturedImageModal}
			eventId={event.id}
			onClose={handleCloseFeaturedImageModal}
			onSuccess={handleFeaturedImageSuccess}
		/>
	{/if}

	<!-- Message Modal -->
	{#if event}
		<EventMessageModal
			isOpen={showMessageModal}
			eventId={event.id}
			eventTitle={event.title}
			onClose={() => (showMessageModal = false)}
			onSuccess={handleMessageSuccess}
		/>
	{/if}

	<!-- Full-Screen Image Viewer -->
	{#if imageViewerOpen && event}
		{@const displayImages = getDisplayImages()}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
			onclick={closeImageViewer}
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Escape') closeImageViewer();
				if (e.key === 'ArrowLeft') previousViewerImage();
				if (e.key === 'ArrowRight') nextViewerImage();
			}}
		>
			<button
				onclick={(e) => {
					e.stopPropagation();
					closeImageViewer();
				}}
				class="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-all hover:bg-white/20"
				aria-label="Close"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>

			{#if displayImages.length > 1}
				<button
					onclick={(e) => {
						e.stopPropagation();
						previousViewerImage();
					}}
					class="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-all hover:bg-white/20"
					aria-label="Previous image"
				>
					<FontAwesomeIcon icon={faChevronLeft} class="h-6 w-6" />
				</button>
				<button
					onclick={(e) => {
						e.stopPropagation();
						nextViewerImage();
					}}
					class="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-all hover:bg-white/20"
					aria-label="Next image"
				>
					<FontAwesomeIcon icon={faChevronRight} class="h-6 w-6" />
				</button>
			{/if}

			<div class="relative max-h-[90vh] max-w-[90vw]" onclick={(e) => e.stopPropagation()}>
				<img
					src={getAuthenticatedImageUrl(displayImages[viewerImageIndex])}
					alt="{event.title} - Image {viewerImageIndex + 1}"
					class="max-h-[90vh] max-w-[90vw] object-contain"
				/>
			</div>

			{#if displayImages.length > 1}
				<div class="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
					{#each displayImages as _, index}
						<button
							onclick={(e) => {
								e.stopPropagation();
								viewerImageIndex = index;
							}}
							class="h-2 rounded-full transition-all {viewerImageIndex === index
								? 'w-6 bg-white'
								: 'w-2 bg-white/50 hover:bg-white/75'}"
							aria-label="Go to image {index + 1}"
						></button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
