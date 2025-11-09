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
		isAdmin,
		type Event,
		type EventComment,
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
		faMessage
	} from '@fortawesome/free-solid-svg-icons';
	import EditEventModal from '$lib/EditEventModal.svelte';
	import DeleteConfirmationModal from '$lib/DeleteConfirmationModal.svelte';
	import EventFeaturedImageModal from '$lib/EventFeaturedImageModal.svelte';
	import AppHeader from '$lib/AppHeader.svelte';
	import { logout } from '$lib/auth';

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
			return new Date(dateString).toLocaleDateString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				timeZone: event?.timezone || 'America/Denver'
			});
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
			service_offer: 'Service Offer'
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
		} catch (e: any) {
			error = e?.message || 'Failed to load event';
			event = null;
		} finally {
			loading = false;
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

	function handleDeleteEvent() {
		if (currentUser && event && (currentUser.id === event.organizer_id || isAdmin(currentUser))) {
			showDeleteModal = true;
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
		const items = [];
		if (currentUser && isAdmin(currentUser)) {
			items.push({
				label: 'Admin',
				icon: faShieldAlt,
				action: () => goto('/admin/users'),
				badge: undefined
			});
		}
		if (currentUser) {
			items.push({
				label: 'Messages',
				icon: faMessage,
				action: () => goto('/messages'),
				badge: undefined
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

		<!-- Main Content -->
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="space-y-6">
				<!-- Event Header -->
				<div
					class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:ring-1 dark:ring-gray-700"
				>
					<!-- Header with Actions -->
					<div
						class="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
					>
						<div class="min-w-0 flex-1">
							<div class="mb-4 flex flex-wrap items-center gap-2">
								<span
									class="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
								>
									{getTypeLabel(event.type)}
								</span>
								<span
									class="rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md {getStatusColor(
										event.status
									)}"
								>
									{getStatusLabel(event.status)}
								</span>
								{#if event.is_free}
									<span
										class="inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white"
									>
										<FontAwesomeIcon icon={faTag} class="h-3 w-3" />
										Free
									</span>
								{:else if event.price !== null && event.price !== undefined}
									<span
										class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
									>
										<FontAwesomeIcon icon={faDollarSign} class="h-3 w-3" />
										${formatPrice(event.price)}
									</span>
								{/if}
							</div>
						</div>

						<!-- Owner Actions -->
						{#if canEdit}
							<div
								class="mt-4 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-nowrap sm:gap-3"
							>
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
							</div>
						{/if}
					</div>

					<h1 class="mb-4 text-3xl font-bold text-gray-900 dark:text-white">{event.title}</h1>

					{#if event.description}
						<p class="mb-6 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
							{event.description}
						</p>
					{/if}

					<!-- Organizer Info -->
					{#if event}
						{@const currentEvent = event}
						<div class="mb-6">
							<button
								onclick={() => goto(`/profile/${currentEvent.organizer_id}`)}
								class="group flex items-center rounded-2xl bg-gray-100/60 px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-blue-100/60 active:scale-95 dark:bg-gray-700/60 dark:hover:bg-blue-900/30"
							>
								{#if event && event.organizer_profile_picture && event.organizer_profile_picture.trim() !== ''}
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
								<div class="text-left">
									<div class="flex items-center gap-2">
										<span class="font-semibold text-gray-900 dark:text-white">
											{event.organizer_name || event.organizer_username}
										</span>
										{#if event.organizer_is_admin}
											<div
												class="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
												title="Admin"
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
							</button>
						</div>
					{/if}

					<!-- Date & Time -->
					{#if event.start_date || event.start_time}
						<div class="mb-6 space-y-2">
							{#if event.start_date}
								<div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
									<FontAwesomeIcon
										icon={faCalendar}
										class="h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									<span class="font-medium">{formatDate(event.start_date)}</span>
									{#if event.end_date && event.end_date !== event.start_date}
										<span class="text-gray-500 dark:text-gray-400">-</span>
										<span class="font-medium">{formatDate(event.end_date)}</span>
									{/if}
								</div>
							{/if}
							{#if event.start_time}
								<div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
									<FontAwesomeIcon
										icon={faClock}
										class="h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									<span class="font-medium">
										{formatTime(event.start_time)}
										{#if event.end_time && event.end_time !== event.start_time}
											- {formatTime(event.end_time)}
										{/if}
									</span>
									{#if event.timezone}
										<span class="text-sm text-gray-500 dark:text-gray-400">({event.timezone})</span>
									{/if}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Location -->
					{#if event.address || event.city || event.state}
						<div class="mb-6 flex items-start gap-2 text-gray-700 dark:text-gray-300">
							<FontAwesomeIcon
								icon={faMapMarkerAlt}
								class="mt-0.5 h-5 w-5 text-gray-500 dark:text-gray-400"
							/>
							<div>
								{#if event.address}
									<p class="font-medium">{event.address}</p>
								{/if}
								<p>
									{[event.city, event.state, event.zip].filter(Boolean).join(', ')}
								</p>
								{#if event.location_type}
									<p class="text-sm text-gray-500 capitalize dark:text-gray-400">
										{event.location_type} event
									</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Contact Information -->
					{#if event.contact_phone || event.contact_email || event.facebook_url || event.instagram_url || event.website}
						<div class="mb-6">
							<h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
								Contact Information
							</h3>
							<div class="flex flex-wrap gap-2">
								{#if event.contact_phone}
									<a
										href={`tel:${event.contact_phone}`}
										class="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/30"
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
								{#if event.facebook_url}
									<a
										href={event.facebook_url}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
									>
										<FontAwesomeIcon icon={faFacebook} class="mr-2 h-4 w-4" />
										Facebook
									</a>
								{/if}
								{#if event.instagram_url}
									<a
										href={event.instagram_url}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-purple-600 hover:to-pink-600"
									>
										<FontAwesomeIcon icon={faInstagram} class="mr-2 h-4 w-4" />
										Instagram
									</a>
								{/if}
								{#if event.website}
									<a
										href={event.website}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
									>
										Website
									</a>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Tags & Category -->
					{#if event.tags && event.tags.length > 0}
						<div class="mb-4">
							<h3 class="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Tags</h3>
							<div class="flex flex-wrap gap-2">
								{#each event.tags as tag}
									<span
										class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
									>
										#{tag}
									</span>
								{/each}
							</div>
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

				<!-- Image Gallery -->
				{#if event.gallery_urls && event.gallery_urls.length > 0}
					{@const displayImages = getDisplayImages()}
					<div
						class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:ring-1 dark:ring-gray-700"
					>
						<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Gallery</h2>
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
		</div>
	{/if}
</div>

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
