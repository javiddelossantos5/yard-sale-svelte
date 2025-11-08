<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getYardSaleById,
		getComments,
		addComment,
		deleteYardSale,
		getCurrentUser,
		getYardSaleVisitStats,
		getAuthenticatedImageUrl,
		getYardSaleConversations,
		getYardSaleUnreadCount,
		isAdmin,
		type YardSale,
		type Comment,
		type CurrentUser,
		type YardSaleConversation
	} from '$lib/api';
	import YardSaleMessageModal from '$lib/YardSaleMessageModal.svelte';
	import YardSaleModal from '$lib/YardSaleModal.svelte';
	import DeleteConfirmationModal from '$lib/DeleteConfirmationModal.svelte';
	import FeaturedImageModal from '$lib/FeaturedImageModal.svelte';
	import { getAccessToken } from '$lib/auth';
	import {
		getYardSaleStatus,
		getYardSaleStatusMessage,
		getTimeRemainingMessage,
		isYardSaleActive
	} from '$lib/yardSaleUtils';
	import { openDirections, getPlatformName } from '$lib/mapsUtils';
	import { isYardSaleVisited, toggleYardSaleVisited } from '$lib/visitedYardSales';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faFacebook } from '@fortawesome/free-brands-svg-icons';
	import {
		faStar,
		faMessage,
		faBars,
		faHome,
		faStore,
		faHeart,
		faUser,
		faArrowRightFromBracket,
		faChevronLeft,
		faChevronRight,
		faShieldAlt
	} from '@fortawesome/free-solid-svg-icons';
	import { getPaymentMethodIcon } from '$lib/paymentUtils';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';

	let yardSale = $state<YardSale | null>(null);
	let comments = $state<Comment[]>([]);
	let loading = $state(true);
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
	let newComment = $state('');
	let submittingComment = $state(false);
	let visitStats = $state<{
		total_visits: number;
		unique_visitors: number;
		most_recent_visit: string | null;
		average_visits: number;
	} | null>(null);

	// Message modal state
	let isMessageOpen = $state(false);
	let existingConversation = $state<YardSaleConversation | null>(null);
	let checkingConversation = $state(false);
	let messageUnreadCount = $state(0);
	let currentUser = $state<CurrentUser | null>(null);
	let currentUserId = $derived(currentUser?.id || null);

	// Visited state
	let isVisited = $state(false);

	// Edit modal state
	let showEditModal = $state(false);
	let showFeaturedImageModal = $state(false);
	let mobileMenuOpen = $state(false);

	// Image carousel state
	let currentImageIndex = $state(0);
	let touchStartX = $state(0);
	let touchEndX = $state(0);
	let showAllImages = $state(false);

	// Full-screen image viewer state
	let imageViewerOpen = $state(false);
	let viewerImageIndex = $state(0);

	// Calculate isOwner reactively
	let isOwner = $derived(yardSale && currentUserId ? yardSale.owner_id === currentUserId : false);
	let canEdit = $derived(isOwner || (currentUser && isAdmin(currentUser)));

	// Delete confirmation modal state
	let showDeleteModal = $state(false);

	let yardSaleId = $derived($page.params.id || '');

	// Helper function to handle authentication redirects
	async function requireAuth(action: () => Promise<void> | void) {
		if (!currentUser) {
			const { handleTokenExpiration } = await import('$lib/auth');
			handleTokenExpiration();
			return;
		}
		await action();
	}

	onMount(async () => {
		if (!yardSaleId || yardSaleId.trim() === '') {
			error = 'Invalid yard sale ID';
			loading = false;
			return;
		}

		try {
			await loadCurrentUser();
			await loadYardSale();
			await loadComments();

			// Check for existing conversation if user is logged in and not the owner
			if (currentUser && yardSale && currentUser.id !== yardSale.owner_id) {
				await checkExistingConversation(yardSaleId);
			}

			// Load unread count if user is logged in
			if (currentUser) {
				await loadUnreadCount();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load yard sale';
		} finally {
			loading = false;
		}
	});

	async function loadCurrentUser() {
		try {
			currentUser = await getCurrentUser();
		} catch (error) {
			console.warn('Failed to load current user:', error);
			// User might not be logged in, that's okay for viewing
			currentUser = null;

			// Check if it's a token expiration error and handle it gracefully
			if (error instanceof Error && error.message === 'Token expired') {
				// Don't redirect here - let the user view the yard sale
				// They'll be redirected when they try to perform authenticated actions
			}
		}
	}

	async function loadYardSale() {
		try {
			yardSale = await getYardSaleById(yardSaleId);

			// Initialize visited state
			if (yardSale) {
				isVisited = isYardSaleVisited(yardSale.id, yardSale);
			}

			// Load visit statistics (non-blocking)
			loadVisitStats().catch((err) => {
				console.warn('Failed to load visit stats:', err);
			});
		} catch (err) {
			console.error('Error loading yard sale:', err);
			error = err instanceof Error ? err.message : 'Failed to load yard sale';
		}
	}

	async function loadVisitStats() {
		if (!yardSaleId) return;

		try {
			// Only try to load visit stats if user is authenticated
			if (currentUser) {
				visitStats = await getYardSaleVisitStats(yardSaleId);
			}
		} catch (err) {
			console.warn('Failed to load visit stats (endpoint may not be implemented yet):', err);
			// Don't show error for visit stats, it's not critical
			visitStats = null;
		}
	}

	// Ownership is now calculated reactively using $derived above

	async function loadComments() {
		comments = await getComments(yardSaleId);
	}

	async function handleSubmitComment() {
		if (!newComment.trim() || submittingComment) return;

		submittingComment = true;
		try {
			const comment = await addComment(yardSaleId, newComment.trim());
			comments = [...comments, comment];
			newComment = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add comment';
		} finally {
			submittingComment = false;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'America/Denver'
		});
	}

	function formatTime(timeString: string): string {
		return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: 'America/Denver'
		});
	}

	function getDateRange(): string {
		if (!yardSale) return '';
		const startDate = formatDate(yardSale.start_date);
		if (yardSale.end_date) {
			const endDate = formatDate(yardSale.end_date);
			// Check if it's the same day
			if (yardSale.start_date === yardSale.end_date) {
				return startDate;
			}
			// For multi-day events, use a more compact format
			return `${startDate} - ${endDate}`;
		}
		return startDate;
	}

	function getTimeRange(): string {
		if (!yardSale) return '';
		const startTime = formatTime(yardSale.start_time);
		const endTime = formatTime(yardSale.end_time);
		return `${startTime} - ${endTime}`;
	}

	function generateCalendarLink(): string {
		if (!yardSale) return '';

		// Create start and end datetime strings in ISO format
		const startDateTime = `${yardSale.start_date}T${yardSale.start_time}`;
		const endDateTime = yardSale.end_date
			? `${yardSale.end_date}T${yardSale.end_time}`
			: `${yardSale.start_date}T${yardSale.end_time}`;

		// Format dates for calendar URL (YYYYMMDDTHHMMSSZ format)
		const startDate = new Date(startDateTime);
		const endDate = new Date(endDateTime);

		const formatForCalendar = (date: Date) => {
			return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
		};

		const startFormatted = formatForCalendar(startDate);
		const endFormatted = formatForCalendar(endDate);

		// Create event details
		const title = encodeURIComponent(`Yard Sale - ${yardSale.title}`);
		const description = encodeURIComponent(
			`${yardSale.description || 'Yard Sale'}\n\n` +
				`Location: ${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}\n` +
				`Contact: ${yardSale.contact_name}${yardSale.contact_phone ? ` (${yardSale.contact_phone})` : ''}\n` +
				`${yardSale.contact_email ? `Email: ${yardSale.contact_email}\n` : ''}` +
				`Categories: ${yardSale.categories?.join(', ') || 'Various items'}\n` +
				`Payment Methods: ${yardSale.payment_methods?.join(', ') || 'Cash accepted'}`
		);
		const location = encodeURIComponent(
			`${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`
		);

		// Generate Google Calendar URL
		const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${description}&location=${location}`;

		return googleCalendarUrl;
	}

	function addToCalendar() {
		const calendarUrl = generateCalendarLink();
		if (calendarUrl) {
			window.open(calendarUrl, '_blank');
		}
	}

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout(); // logout() now handles redirect automatically
	}

	function formatPhoneNumber(phone: string): string {
		// Remove all non-digit characters
		const cleaned = phone.replace(/\D/g, '');

		// Check if it's a 10-digit US phone number
		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
		}

		// Check if it's an 11-digit number starting with 1
		if (cleaned.length === 11 && cleaned.startsWith('1')) {
			return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
		}

		// Return original if it doesn't match expected format
		return phone;
	}

	function formatCommentDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	async function checkExistingConversation(yardSaleId: string) {
		if (!currentUser) return;
		checkingConversation = true;
		try {
			const conversations = await getYardSaleConversations();
			const conv = conversations.find((c) => c.yard_sale_id === yardSaleId);
			existingConversation = conv || null;
		} catch {
			// Ignore errors checking conversation
		} finally {
			checkingConversation = false;
		}
	}

	async function loadUnreadCount() {
		try {
			const result = await getYardSaleUnreadCount();
			messageUnreadCount = result.unread_count;
		} catch {
			// Ignore errors loading unread count
		}
	}

	async function handleMessageSuccess() {
		// Refresh conversation check after sending message
		if (yardSale) {
			await checkExistingConversation(yardSale.id);
		}
	}

	function viewConversation() {
		if (existingConversation) {
			goto(`/yard-sale/messages/${existingConversation.id}`);
		}
	}

	function handleEditYardSale() {
		requireAuth(() => {
			showEditModal = true;
		});
	}

	function handleCloseEditModal() {
		showEditModal = false;
	}

	async function handleEditSuccess() {
		// Reload yard sale data after successful edit
		await loadYardSale();
	}

	function handleSetFeaturedImage() {
		requireAuth(() => {
			showFeaturedImageModal = true;
		});
	}

	function handleCloseFeaturedImageModal() {
		showFeaturedImageModal = false;
	}

	async function handleFeaturedImageSuccess() {
		showFeaturedImageModal = false;
		await loadYardSale();
	}

	function handleDeleteYardSale() {
		requireAuth(() => {
			showDeleteModal = true;
		});
	}

	function handleCloseDeleteModal() {
		showDeleteModal = false;
	}

	async function handleToggleVisited() {
		if (yardSale) {
			isVisited = await toggleYardSaleVisited(yardSale.id, yardSale);
			// Trigger a page refresh to update the main page sorting
			// This is a simple solution - in a more complex app, you'd use a global state manager
			setTimeout(() => {
				window.dispatchEvent(new CustomEvent('visitedStatusChanged'));
			}, 100);
		}
	}

	async function handleConfirmDelete() {
		if (!yardSale) return;

		try {
			await deleteYardSale(yardSale.id);
			// Redirect to main page after successful deletion
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete yard sale';
			// Keep the modal open so user can try again or cancel
		}
	}

	// Image carousel functions
	function getDisplayPhotos() {
		if (!yardSale || !yardSale.photos || yardSale.photos.length === 0) return [];

		const photos = yardSale.photos;
		const featuredImage = yardSale.featured_image;
		if (featuredImage && photos.includes(featuredImage)) {
			// Featured image first, then rest
			return [featuredImage, ...photos.filter((p) => p !== featuredImage)];
		}
		return photos;
	}

	function nextImage() {
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			currentImageIndex = (currentImageIndex + 1) % photos.length;
		}
	}

	function previousImage() {
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			currentImageIndex = currentImageIndex === 0 ? photos.length - 1 : currentImageIndex - 1;
		}
	}

	function goToImage(index: number) {
		const photos = getDisplayPhotos();
		if (index >= 0 && index < photos.length) {
			currentImageIndex = index;
		}
	}

	// Touch/swipe handlers
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}

	function handleTouchMove(e: TouchEvent) {
		touchEndX = e.touches[0].clientX;
	}

	function handleTouchEnd() {
		if (!touchStartX || !touchEndX) return;

		const distance = touchStartX - touchEndX;
		const minSwipeDistance = 50;

		if (Math.abs(distance) > minSwipeDistance) {
			if (distance > 0) {
				// Swipe left - next image
				nextImage();
			} else {
				// Swipe right - previous image
				previousImage();
			}
		}

		// Reset
		touchStartX = 0;
		touchEndX = 0;
	}

	// Reset carousel when yard sale changes
	$effect(() => {
		if (yardSale) {
			currentImageIndex = 0;
		}
	});

	// Full-screen image viewer functions
	function openImageViewer(index: number) {
		viewerImageIndex = index;
		imageViewerOpen = true;
	}

	function closeImageViewer() {
		imageViewerOpen = false;
	}

	function nextViewerImage() {
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			viewerImageIndex = (viewerImageIndex + 1) % photos.length;
		}
	}

	function previousViewerImage() {
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			viewerImageIndex = viewerImageIndex === 0 ? photos.length - 1 : viewerImageIndex - 1;
		}
	}

	// Keyboard navigation for image viewer
	function handleKeyDown(e: KeyboardEvent) {
		if (!imageViewerOpen) return;

		if (e.key === 'ArrowLeft') {
			previousViewerImage();
		} else if (e.key === 'ArrowRight') {
			nextViewerImage();
		} else if (e.key === 'Escape') {
			closeImageViewer();
		}
	}

	// Add keyboard listener when viewer is open
	$effect(() => {
		if (imageViewerOpen) {
			window.addEventListener('keydown', handleKeyDown);
			// Prevent body scroll when modal is open
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:head>
	<title>{yardSale ? `${yardSale.title} - Yard Sale Finder` : 'Yard Sale Details'}</title>
	<meta name="description" content={yardSale?.description || 'View yard sale details'} />
	<style>
		:global(html, body) {
			background-color: rgb(249 250 251); /* bg-gray-50 */
		}
		:global(.dark html, .dark body) {
			background-color: rgb(17 24 39); /* bg-gray-900 */
		}
	</style>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900" style="min-height: 100vh;">
	<!-- Header -->
	<header
		class="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<!-- Mobile Layout -->
			<div class="block sm:hidden">
				<div class="flex h-16 items-center justify-between">
					<!-- Logo and Title -->
					<div class="flex min-w-0 flex-1 items-center space-x-3">
						<button
							onclick={() => goto('/')}
							class="shrink-0 rounded-full p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label="Back to yard sales"
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
						<button
							onclick={() => goto('/')}
							class="shrink-0 rounded-lg transition-opacity hover:opacity-80 active:scale-95"
							aria-label="Go to home"
						>
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-8 w-8 rounded-lg object-cover"
							/>
						</button>
						<div class="min-w-0 flex-1">
							<h1 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
								{yardSale?.title || 'Yard Sale'}
							</h1>
							<p class="text-xs text-gray-500 dark:text-gray-400">Yard sale listing</p>
						</div>
					</div>

					<!-- Right side: Menu button -->
					<div class="flex items-center gap-2">
						<button
							onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
							aria-label="Menu"
						>
							<FontAwesomeIcon icon={faBars} class="h-5 w-5 text-gray-700 dark:text-gray-300" />
						</button>
					</div>
				</div>

				<!-- Mobile Menu Dropdown -->
				{#if mobileMenuOpen}
					<div class="border-t border-gray-200 pt-4 pb-4 dark:border-gray-800">
						<div class="space-y-1">
							<button
								onclick={() => {
									goto('/');
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon
									icon={faHome}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
								Home
							</button>
							<button
								onclick={() => {
									goto('/market');
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon
									icon={faStore}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
								Marketplace
							</button>
							{#if currentUser}
								<button
									onclick={() => {
										goto('/market/watched');
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faHeart}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									Watched Items
								</button>
								<button
									onclick={() => {
										goto('/messages?tab=yard-sales');
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faMessage}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									Messages
								</button>
								<button
									onclick={() => {
										goToProfile();
										mobileMenuOpen = false;
									}}
									class="relative flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faUser}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									My Profile
									{#if $unreadMessageCount > 0}
										<span
											class="ml-auto rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-semibold text-white"
										>
											{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
										</span>
									{/if}
								</button>
							{/if}
							<button
								onclick={() => {
									handleLogout();
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
							>
								<FontAwesomeIcon icon={faArrowRightFromBracket} class="mr-3 h-5 w-5" />
								Logout
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Desktop Layout -->
			<div class="hidden sm:block">
				<div class="flex h-20 items-center justify-between">
					<!-- Left: Logo and Title -->
					<div class="flex min-w-0 flex-1 items-center space-x-4">
						<button
							onclick={() => goto('/')}
							class="shrink-0 rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label="Back to yard sales"
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
						<button
							onclick={() => goto('/')}
							class="shrink-0 rounded-xl transition-opacity hover:opacity-80 active:scale-95"
							aria-label="Go to home"
						>
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-12 w-12 rounded-xl object-cover shadow-sm"
							/>
						</button>
						<div class="min-w-0 flex-1">
							<h1 class="truncate text-2xl font-bold text-gray-900 dark:text-white">
								{yardSale?.title || 'Yard Sale'}
							</h1>
							<div class="mt-0.5 flex items-center gap-3">
								<p class="text-sm text-gray-600 dark:text-gray-400">Yard sale listing</p>
							</div>
						</div>
					</div>

					<!-- Right: Actions -->
					<div class="flex shrink-0 items-center gap-3">
						<!-- Secondary Actions -->
						<div class="flex items-center gap-2">
							<button
								onclick={() => goto('/')}
								class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								<FontAwesomeIcon icon={faHome} class="mr-2 h-4 w-4" />
								Home
							</button>
							<button
								onclick={() => goto('/market')}
								class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								<FontAwesomeIcon icon={faStore} class="mr-2 h-4 w-4" />
								Marketplace
							</button>
							{#if currentUser}
								<button
									onclick={() => goto('/market/watched')}
									class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								>
									<FontAwesomeIcon icon={faHeart} class="mr-2 h-4 w-4" />
									Watched
								</button>
								<button
									onclick={() => goto('/messages?tab=yard-sales')}
									class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								>
									<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
									Messages
								</button>
								<button
									onclick={goToProfile}
									class="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
									aria-label="My Profile"
								>
									<FontAwesomeIcon icon={faUser} class="h-5 w-5 text-gray-700 dark:text-gray-200" />
									{#if $unreadMessageCount > 0}
										<span
											class="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-xs font-semibold text-white dark:border-gray-900"
										>
											{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
										</span>
									{/if}
								</button>
							{/if}
							<button
								onclick={handleLogout}
								class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								aria-label="Logout"
							>
								<FontAwesomeIcon icon={faArrowRightFromBracket} class="h-5 w-5" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-12 w-12 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading yard sale...</span>
			</div>
		{/if}

		<!-- Error State -->
		{#if error}
			<div class="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
				<div class="flex">
					<FontAwesomeIcon icon="exclamation-triangle" class="h-5 w-5 text-red-400" />
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error loading yard sale</h3>
						<p class="mt-1 text-sm text-red-700">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Yard Sale Details -->
		{#if yardSale && !loading}
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
								<!-- Visited Indicator -->
								{#if isVisited}
									<div class="mb-4">
										<div
											class="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
										>
											<FontAwesomeIcon icon="check" class="mr-2 h-4 w-4" />
											<span class="font-medium">Already Visited</span>
										</div>
									</div>
								{/if}

								<!-- Status Banner -->
								{#if yardSale}
									{@const status = getYardSaleStatus(yardSale)}
									{@const timeRemaining = getTimeRemainingMessage(yardSale)}

									<div class="mb-6 flex-shrink-0">
										{#if status === 'expired'}
											<div
												class="inline-flex items-center rounded-full bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-900/10 dark:text-red-300"
											>
												<svg
													class="mr-2 h-4 w-4"
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
												<span class="font-semibold">Expired</span>
												<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
											</div>
										{:else if status === 'upcoming'}
											<div
												class="inline-flex items-center rounded-full bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 dark:bg-blue-900/10 dark:text-blue-300"
											>
												<FontAwesomeIcon icon="clock" class="mr-2 h-4 w-4" />
												<span class="font-semibold">Upcoming</span>
												<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
											</div>
										{:else if status === 'active'}
											<div
												class="inline-flex items-center rounded-full bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/10 dark:text-green-300"
											>
												<FontAwesomeIcon icon="check-circle" class="mr-2 h-4 w-4" />
												<span class="font-semibold">Active Now</span>
												<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
											</div>
										{:else if status === 'on_break'}
											<div class="space-y-2">
												<div
													class="inline-flex items-center rounded-full bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 dark:bg-orange-900/10 dark:text-orange-300"
												>
													<FontAwesomeIcon icon="clock" class="mr-2 h-4 w-4" />
													<span class="font-semibold">On Break</span>
													<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
												</div>
												{#if yardSale.status_reason}
													<div class="text-sm text-orange-600 dark:text-orange-400">
														{yardSale.status_reason}
													</div>
												{/if}
											</div>
										{:else if status === 'closed'}
											<div class="space-y-2">
												<div
													class="inline-flex items-center rounded-full bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
												>
													<svg
														class="mr-2 h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
													<span class="font-semibold">Closed</span>
													<span class="ml-2 text-xs opacity-75">• {timeRemaining}</span>
												</div>
												{#if yardSale.status_reason}
													<div class="text-sm text-gray-500 dark:text-gray-400">
														{yardSale.status_reason}
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{/if}
							</div>

							<!-- Owner Actions -->
							{#if canEdit}
								<div
									class="mt-4 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-nowrap sm:gap-3"
								>
									<button
										onclick={handleEditYardSale}
										class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-gray-700 transition-all hover:bg-gray-50 active:scale-95 sm:flex-none sm:px-5 sm:py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
									>
										<svg
											class="mr-2 h-4 w-4 shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
										<span>Edit</span>
									</button>
									{#if yardSale.photos && yardSale.photos.length > 0}
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
										onclick={handleDeleteYardSale}
										class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-red-700 transition-all hover:bg-red-50 active:scale-95 sm:flex-none sm:px-5 sm:py-3 dark:border-red-600 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-900/30"
									>
										<svg
											class="mr-2 h-4 w-4 shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
										<span>Delete</span>
									</button>
								</div>
							{/if}
						</div>

						<!-- Title and Content Section - Full Width (Outside Flex Container) -->
						<div class="w-full">
							<!-- Title -->
							<h1
								class="mb-4 text-3xl leading-tight font-bold break-words text-gray-900 sm:text-4xl dark:text-white"
							>
								{yardSale.title}
							</h1>

							<!-- Image Gallery -->
							{#if yardSale.photos && yardSale.photos.length > 0}
								<div class="mb-6 w-full">
									{#if getDisplayPhotos().length === 1}
										{@const displayPhotos = getDisplayPhotos()}
										<!-- Single Image -->
										<button
											onclick={() => openImageViewer(0)}
											class="w-full overflow-hidden rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
										>
											<img
												src={getAuthenticatedImageUrl(displayPhotos[0])}
												alt={yardSale.title}
												class="h-64 w-full object-cover sm:h-80"
												loading="lazy"
											/>
										</button>
									{:else}
										{@const displayPhotos = getDisplayPhotos()}
										<!-- Mobile: Carousel, Desktop: Grid -->
										<!-- Mobile Carousel (hidden on desktop) -->
										<div class="relative block sm:hidden">
											<!-- Image Container -->
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
													{#each displayPhotos as photo, index}
														<button
															onclick={() => openImageViewer(index)}
															class="min-w-full transition-transform active:scale-[0.98]"
														>
															<img
																src={getAuthenticatedImageUrl(photo)}
																alt="{yardSale.title} - Image {index + 1}"
																class="h-64 w-full object-cover"
																loading="lazy"
															/>
														</button>
													{/each}
												</div>

												<!-- Navigation Buttons -->
												{#if displayPhotos.length > 1}
													<!-- Previous Button -->
													<button
														onclick={previousImage}
														class="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70 active:scale-95 dark:bg-white/20 dark:hover:bg-white/30"
														aria-label="Previous image"
													>
														<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
													</button>

													<!-- Next Button -->
													<button
														onclick={nextImage}
														class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70 active:scale-95 dark:bg-white/20 dark:hover:bg-white/30"
														aria-label="Next image"
													>
														<FontAwesomeIcon icon={faChevronRight} class="h-5 w-5" />
													</button>

													<!-- Image Indicators (Dots) -->
													<div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
														{#each displayPhotos as _, index}
															<button
																onclick={() => goToImage(index)}
																class="h-2 rounded-full transition-all {currentImageIndex === index
																	? 'w-6 bg-white'
																	: 'w-2 bg-white/50 hover:bg-white/75'}"
																aria-label="Go to image {index + 1}"
															></button>
														{/each}
													</div>

													<!-- Image Counter -->
													<div
														class="absolute top-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white dark:bg-white/20"
													>
														{currentImageIndex + 1} / {displayPhotos.length}
													</div>
												{/if}
											</div>
										</div>

										<!-- Desktop Grid (hidden on mobile) -->
										<div class="hidden sm:grid sm:grid-cols-2 sm:gap-3">
											{#each showAllImages ? displayPhotos : displayPhotos.slice(0, 4) as photo, index}
												<button
													onclick={() => openImageViewer(index)}
													class="overflow-hidden rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
												>
													<img
														src={getAuthenticatedImageUrl(photo)}
														alt="{yardSale.title} - Image {index + 1}"
														class="h-32 w-full object-cover sm:h-40"
														loading="lazy"
													/>
												</button>
											{/each}
										</div>
										{#if displayPhotos.length > 4}
											<button
												onclick={() => (showAllImages = !showAllImages)}
												class="mt-2 hidden text-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 active:scale-95 sm:block dark:text-blue-400 dark:hover:text-blue-300"
											>
												{showAllImages ? 'Show Less' : `+${displayPhotos.length - 4} more images`}
											</button>
										{/if}
									{/if}
								</div>
							{/if}

							<!-- Owner Information -->
							<div class="mb-6">
								<button
									onclick={() => yardSale && goto(`/profile/${yardSale.owner_id}`)}
									class="group flex items-center rounded-2xl bg-gray-100/60 px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-blue-100/60 active:scale-95 dark:bg-gray-700/60 dark:hover:bg-blue-900/30"
								>
									<div
										class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600"
									>
										<FontAwesomeIcon icon="user" class="h-4 w-4 text-white" />
									</div>
									<div class="flex-1 text-left">
										<div class="flex items-center gap-2">
											<div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
												Posted by {yardSale.owner_username}
											</div>
											{#if yardSale.owner_is_admin}
												<div
													class="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
													title="Admin Verified"
												>
													<FontAwesomeIcon icon={faShieldAlt} class="h-2.5 w-2.5" />
													<span>Admin</span>
												</div>
											{/if}
										</div>
										{#if yardSale.owner_average_rating && typeof yardSale.owner_average_rating === 'number'}
											<div class="flex items-center">
												<FontAwesomeIcon icon="star" class="mr-1 h-3 w-3 text-yellow-500" />
												<span class="text-xs font-medium text-gray-600 dark:text-gray-300">
													{yardSale.owner_average_rating.toFixed(1)} rating
												</span>
											</div>
										{/if}
									</div>
									<FontAwesomeIcon
										icon="arrow-right"
										class="ml-2 h-4 w-4 text-gray-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
									/>
								</button>
							</div>

							<!-- Location -->
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
								<button
									onclick={(e) => {
										e.stopPropagation();
										if (yardSale) {
											const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
											openDirections(fullAddress);
										}
									}}
									class="text-left text-lg font-medium text-blue-600 hover:text-blue-700 hover:underline focus:underline focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
									title={`Click to open in ${getPlatformName()}`}
								>
									{yardSale.address}, {yardSale.city}, {yardSale.state}
									{yardSale.zip_code}
								</button>
							</div>
							<!-- Location closes above -->
						</div>
						<!-- Title and Content Section closes above -->
					</div>
					<!-- Padding div closes above -->
				</div>
				<!-- Hero Section closes above, still inside max-w-7xl -->

				<!-- Main Content Grid -->
				<div class="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12">
					<!-- Left Column - Main Info -->
					<div class="space-y-6 sm:space-y-8 lg:col-span-8">
						<!-- Date and Time Card -->
						<div
							class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<div class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
								<button
									onclick={addToCalendar}
									class="group flex w-full items-start space-x-3 rounded-xl p-4 transition-all hover:bg-gray-50 active:bg-gray-100 sm:space-x-4 dark:hover:bg-gray-700/50 dark:active:bg-gray-700"
									title="Add to Calendar"
								>
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 transition-colors group-hover:bg-blue-100 sm:h-12 sm:w-12 dark:bg-blue-900/20 dark:group-hover:bg-blue-900/30"
									>
										<svg
											class="h-5 w-5 text-blue-600 sm:h-6 sm:w-6 dark:text-blue-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
									</div>
									<div class="flex-1 text-left">
										<div class="flex items-center gap-2">
											<h3 class="text-base font-semibold text-gray-900 sm:text-lg dark:text-white">
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
											{getDateRange()}
										</p>
										<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
											Tap to add to calendar
										</p>
									</div>
								</button>

								<button
									onclick={addToCalendar}
									class="group flex w-full items-start space-x-3 rounded-xl p-4 transition-all hover:bg-gray-50 active:bg-gray-100 sm:space-x-4 dark:hover:bg-gray-700/50 dark:active:bg-gray-700"
									title="Add to Calendar"
								>
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 transition-colors group-hover:bg-green-100 sm:h-12 sm:w-12 dark:bg-green-900/20 dark:group-hover:bg-green-900/30"
									>
										<svg
											class="h-5 w-5 text-green-600 sm:h-6 sm:w-6 dark:text-green-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
									<div class="flex-1 text-left">
										<div class="flex items-center gap-2">
											<h3 class="text-base font-semibold text-gray-900 sm:text-lg dark:text-white">
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
											{getTimeRange()}
										</p>
										<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
											Tap to add to calendar
										</p>
									</div>
								</button>
							</div>
						</div>

						<!-- Description Card -->
						<div
							class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Description</h2>
							<p class="leading-relaxed text-gray-700 dark:text-gray-300">{yardSale.description}</p>
						</div>

						<!-- Categories Card -->
						{#if yardSale.categories && yardSale.categories.length > 0}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Categories</h2>
								<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
									{#each yardSale.categories as category}
										<span
											class="inline-flex items-center justify-center rounded-xl border border-gray-200/50 bg-blue-50/60 px-4 py-2 text-center text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md dark:border-gray-700/50 dark:bg-blue-900/20 dark:text-gray-200 dark:hover:bg-blue-900/30"
										>
											{category}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Contact Information Card -->
						<div
							class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
								Contact Information
							</h2>
							<div class="flex flex-wrap gap-3">
								<!-- Contact Person Tag -->
								<div
									class="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
								>
									<FontAwesomeIcon icon="user" class="mr-2 h-4 w-4" />
									{yardSale.contact_name}
								</div>

								{#if yardSale.contact_phone}
									<!-- Phone Tag -->
									<a
										href="tel:{yardSale.contact_phone}"
										class="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-200 dark:bg-green-900/20 dark:text-green-200 dark:hover:bg-green-900/30"
									>
										<FontAwesomeIcon icon="phone" class="mr-2 h-4 w-4" />
										{formatPhoneNumber(yardSale.contact_phone)}
									</a>
								{/if}

								{#if yardSale.contact_email}
									<!-- Email Tag -->
									<a
										href="mailto:{yardSale.contact_email}"
										class="inline-flex items-center rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:hover:bg-purple-900/30"
									>
										<FontAwesomeIcon icon="envelope" class="mr-2 h-4 w-4" />
										{yardSale.contact_email}
									</a>
								{/if}
							</div>
						</div>
					</div>

					<!-- Right Column - Sidebar -->
					<div class="space-y-6 lg:col-span-4">
						<!-- Price Range Card -->
						{#if yardSale.price_range}
							<div
								class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<div class="flex items-center space-x-3">
									{#if yardSale.price_range && yardSale.price_range.trim() !== ''}
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20"
										>
											<svg
												class="h-5 w-5 text-green-600 dark:text-green-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
												/>
											</svg>
										</div>
									{/if}
									<div>
										<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
											Price Range
										</h3>
										<p class="text-lg font-semibold text-gray-900 dark:text-white">
											{yardSale.price_range || 'Not specified'}
										</p>
									</div>
								</div>
							</div>
						{/if}

						<!-- Visit Statistics Card -->
						{#if visitStats}
							<div
								class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
									Visit Statistics
								</h3>
								<div class="grid grid-cols-2 gap-4">
									<div class="text-center">
										<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
											{visitStats?.total_visits || 0}
										</div>
										<div class="text-sm text-gray-500 dark:text-gray-400">Total Visits</div>
									</div>
									<div class="text-center">
										<div class="text-2xl font-bold text-green-600 dark:text-green-400">
											{visitStats?.unique_visitors || 0}
										</div>
										<div class="text-sm text-gray-500 dark:text-gray-400">Unique Visitors</div>
									</div>
									<div class="text-center">
										<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
											{visitStats?.average_visits ? visitStats.average_visits.toFixed(1) : '0.0'}
										</div>
										<div class="text-sm text-gray-500 dark:text-gray-400">Avg Visits</div>
									</div>
									<div class="text-center">
										<div class="text-xs text-gray-500 dark:text-gray-400">
											{#if visitStats?.most_recent_visit}
												{new Date(visitStats.most_recent_visit).toLocaleDateString()}
											{:else}
												No visits yet
											{/if}
										</div>
										<div class="text-sm text-gray-500 dark:text-gray-400">Last Visit</div>
									</div>
								</div>
							</div>
						{/if}

						<!-- Action Buttons Card -->
						<div
							class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Actions</h3>
							<div class="space-y-3">
								{#if yardSale.contact_phone}
									{@const isDisabled = !isYardSaleActive(yardSale) || yardSale.status === 'closed'}
									<a
										href={isDisabled ? '#' : `tel:${yardSale.contact_phone}`}
										onclick={isDisabled ? (e) => e.preventDefault() : undefined}
										class="flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 {isDisabled
											? 'cursor-not-allowed opacity-50'
											: ''}"
									>
										<FontAwesomeIcon icon="phone" class="mr-2 h-4 w-4" />
										{yardSale.status === 'closed'
											? 'Closed'
											: !isYardSaleActive(yardSale)
												? 'Event Ended'
												: 'Call Now'}
									</a>
								{/if}

								<!-- Message Seller Button -->
								{#if currentUser && !isOwner}
									{@const isDisabled = !isYardSaleActive(yardSale) || yardSale.status === 'closed'}
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
											onclick={() => (isMessageOpen = true)}
											disabled={isDisabled || checkingConversation}
											class="flex w-full items-center justify-center rounded-full bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
										>
											<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
											{checkingConversation
												? 'Checking...'
												: yardSale.status === 'closed'
													? 'Yard Sale Closed'
													: !isYardSaleActive(yardSale)
														? 'Yard Sale Not Active'
														: 'Message Seller'}
										</button>
									{/if}
								{/if}

								<!-- Get Directions Button -->
								<button
									onclick={(e) => {
										e.stopPropagation();
										if (yardSale) {
											const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
											openDirections(fullAddress);
										}
									}}
									class="flex w-full items-center justify-center rounded-full bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-700"
								>
									<FontAwesomeIcon icon="map-marker-alt" class="mr-2 h-4 w-4" />
									Get Directions
								</button>

								{#if yardSale.facebook_url}
									<a
										href={yardSale.facebook_url}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 dark:bg-blue-700 dark:hover:bg-blue-800"
										title="View on Facebook Marketplace"
									>
										<FontAwesomeIcon icon={faFacebook} class="mr-2 h-4 w-4" />
										Facebook
									</a>
								{/if}

								<!-- Visited Toggle Button - Only show for active/started yard sales -->
								{#if yardSale && getYardSaleStatus(yardSale) !== 'upcoming'}
									<button
										onclick={handleToggleVisited}
										class="flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-all active:scale-95 {isVisited
											? 'bg-gray-500 text-white hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700'
											: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}"
									>
										{#if isVisited}
											<FontAwesomeIcon icon="check" class="mr-2 h-4 w-4" />
											Visited
										{:else}
											<FontAwesomeIcon icon="eye" class="mr-2 h-4 w-4" />
											Mark Visited
										{/if}
									</button>
								{/if}
							</div>
						</div>

						<!-- Payment Methods Card -->
						<div
							class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
								Payment Methods
							</h3>
							<div class="space-y-3">
								{#each yardSale.payment_methods as method}
									{@const iconInfo = getPaymentMethodIcon(method, availablePaymentMethods)}
									<div
										class="flex items-center space-x-3 rounded-lg bg-gray-200 p-3 dark:bg-gray-600"
									>
										<FontAwesomeIcon
											icon={iconInfo.iconType === 'brand'
												? (['fab', iconInfo.icon] as any)
												: (iconInfo.icon as any)}
											class="h-5 w-5 text-gray-600 dark:text-gray-400"
										/>
										<span class="font-medium text-gray-700 dark:text-gray-200">{method}</span>
									</div>
								{/each}

								<!-- Venmo URL link (independent of payment methods) -->
								{#if yardSale.venmo_url}
									<a
										href={yardSale.venmo_url}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center space-x-3 rounded-lg bg-blue-500 p-3 transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
										title="Pay with Venmo"
									>
										<FontAwesomeIcon icon="check-circle" class="h-5 w-5 text-white" />
										<span class="font-medium text-white">Venmo</span>
									</a>
								{/if}

								<!-- Facebook Marketplace link moved to actions above -->
							</div>
						</div>
					</div>
					<!-- Right Column closes above -->
					<!-- Left Column already closed above -->
				</div>
				<!-- Main Content Grid closes above -->

				<!-- Comments Section (still inside max-w-7xl) -->
				<div
					class="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<div
						class="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 dark:border-gray-700"
					>
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
							Comments ({comments.length})
						</h2>
					</div>

					<!-- Add Comment Form -->
					{#if yardSale && isYardSaleActive(yardSale)}
						<div
							class="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 dark:border-gray-700"
						>
							<form
								onsubmit={(e) => {
									e.preventDefault();
									handleSubmitComment();
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
										placeholder="Ask a question or share your thoughts about this yard sale..."
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
										Posting...
									{:else}
										Post Comment
									{/if}
								</button>
							</form>
						</div>
					{:else if yardSale}
						<!-- Expired Event Message -->
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
											Comments Closed
										</h3>
										<div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
											<p>This yard sale has ended, so new comments are no longer being accepted.</p>
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
								<svg
									class="mx-auto h-12 w-12 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
									></path>
								</svg>
								<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
									No comments yet
								</h3>
								<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Be the first to ask a question or share your thoughts!
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
												<div
													class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20"
												>
													<span class="text-sm font-medium text-blue-600 dark:text-blue-400">
														{comment.username.charAt(0).toUpperCase()}
													</span>
												</div>
											</div>
											<div class="min-w-0 flex-1">
												<div class="flex flex-wrap items-center gap-2 sm:gap-1">
													<p class="text-sm font-medium text-gray-900 dark:text-white">
														{comment.username}
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
														{formatCommentDate(comment.created_at)}
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
					<!-- Comments List container closes above -->
				</div>
				<!-- Comments Section closes above -->
			</div>
			<!-- max-w-7xl closes above -->
		{/if}
	</div>
	<!-- max-w-4xl closes above -->

	<!-- Message Modal -->
	{#if yardSale}
		<YardSaleMessageModal
			isOpen={isMessageOpen}
			yardSaleId={yardSale.id}
			yardSaleTitle={yardSale.title}
			onClose={() => (isMessageOpen = false)}
			onSuccess={handleMessageSuccess}
		/>
	{/if}

	<!-- Featured Image Modal -->
	{#if yardSale && showFeaturedImageModal}
		<FeaturedImageModal
			isOpen={showFeaturedImageModal}
			yardSaleId={yardSale.id}
			onClose={handleCloseFeaturedImageModal}
			onSuccess={handleFeaturedImageSuccess}
		/>
	{/if}

	<!-- Edit Yard Sale Modal -->
	{#if yardSale && showEditModal}
		<YardSaleModal
			isOpen={showEditModal}
			{yardSale}
			onClose={handleCloseEditModal}
			onSuccess={handleEditSuccess}
		/>
	{/if}

	<!-- Delete Confirmation Modal -->
	<DeleteConfirmationModal
		isOpen={showDeleteModal}
		itemName="yard sale"
		onClose={handleCloseDeleteModal}
		onConfirm={handleConfirmDelete}
	/>

	<!-- Full-Screen Image Viewer -->
	{#if imageViewerOpen && yardSale}
		{@const displayPhotos = getDisplayPhotos()}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
			onclick={closeImageViewer}
			onkeydown={(e) => {
				if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
					closeImageViewer();
				}
			}}
			role="dialog"
			aria-modal="true"
			aria-label="Image viewer"
			tabindex="0"
		>
			<!-- Close Button -->
			<button
				onclick={closeImageViewer}
				class="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-3 text-white transition-all hover:bg-white/20 active:scale-95 dark:bg-gray-800/50 dark:hover:bg-gray-800/70"
				aria-label="Close viewer"
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

			<!-- Image Container -->
			<div
				class="relative max-h-full max-w-full"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
				aria-hidden="true"
			>
				<img
					src={getAuthenticatedImageUrl(displayPhotos[viewerImageIndex])}
					alt="{yardSale.title} - Image {viewerImageIndex + 1}"
					class="max-h-screen max-w-screen object-contain"
					loading="lazy"
				/>

				<!-- Navigation Buttons -->
				{#if displayPhotos.length > 1}
					<!-- Previous Button -->
					<button
						onclick={(e) => {
							e.stopPropagation();
							previousViewerImage();
						}}
						class="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-all hover:bg-white/20 active:scale-95 dark:bg-gray-800/50 dark:hover:bg-gray-800/70"
						aria-label="Previous image"
					>
						<FontAwesomeIcon icon={faChevronLeft} class="h-6 w-6" />
					</button>

					<!-- Next Button -->
					<button
						onclick={(e) => {
							e.stopPropagation();
							nextViewerImage();
						}}
						class="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-all hover:bg-white/20 active:scale-95 dark:bg-gray-800/50 dark:hover:bg-gray-800/70"
						aria-label="Next image"
					>
						<FontAwesomeIcon icon={faChevronRight} class="h-6 w-6" />
					</button>

					<!-- Image Counter -->
					<div
						class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white dark:bg-white/20"
					>
						{viewerImageIndex + 1} / {displayPhotos.length}
					</div>

					<!-- Image Indicators (Dots) -->
					<div class="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-2">
						{#each displayPhotos as _, index}
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
		</div>
	{/if}
</div>
