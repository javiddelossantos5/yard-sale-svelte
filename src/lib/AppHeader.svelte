<script lang="ts">
	import { goto } from '$app/navigation';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faBars,
		faUser,
		faArrowRightFromBracket,
		faHome,
		faMessage,
		faHeart,
		faStore,
		faChevronLeft
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import type { CurrentUser } from '$lib/api';

	let {
		title,
		subtitle,
		count,
		countLabel,
		showBackButton = false,
		backUrl = '/',
		backLabel = 'Back',
		primaryAction,
		primaryActionLabel,
		primaryActionIcon,
		currentUser,
		marketMessageUnreadCount = 0,
		yardSaleMessageUnreadCount = 0,
		mobileMenuItems = []
	}: {
		title: string;
		subtitle?: string;
		count?: number;
		countLabel?: string;
		showBackButton?: boolean;
		backUrl?: string;
		backLabel?: string;
		primaryAction?: () => void;
		primaryActionLabel?: string;
		primaryActionIcon?: any;
		currentUser: CurrentUser | null;
		marketMessageUnreadCount?: number;
		yardSaleMessageUnreadCount?: number;
		mobileMenuItems?: Array<{
			label: string;
			icon: any;
			action: () => void;
			badge?: number;
		}>;
	} = $props();

	let mobileMenuOpen = $state(false);

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout(); // logout() now handles redirect automatically
	}

	const totalUnreadCount = marketMessageUnreadCount + yardSaleMessageUnreadCount;
</script>

<header
	class="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- Mobile Layout -->
		<div class="block sm:hidden">
			<div class="flex h-16 items-center justify-between">
				<!-- Logo and Title -->
				<div class="flex items-center space-x-3">
					{#if showBackButton}
						<button
							onclick={() => goto(backUrl)}
							class="rounded-full p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label={backLabel}
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
					{/if}
					<button
						onclick={() => goto('/')}
						class="rounded-lg transition-opacity hover:opacity-80 active:scale-95"
						aria-label="Go to home"
					>
						<img
							src="/icon2.png"
							alt="Yard Sale Finder Logo"
							class="h-8 w-8 rounded-lg object-cover"
						/>
					</button>
					<div>
						<h1 class="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
						{#if subtitle || (count !== undefined && countLabel)}
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{#if subtitle}
									{subtitle}
								{/if}
								{#if count !== undefined && countLabel}
									{#if subtitle}
										•
									{/if}
									{count}
									{countLabel}
								{/if}
							</p>
						{/if}
					</div>
				</div>

				<!-- Right side: Menu button and Primary Action -->
				<div class="flex items-center gap-2">
					{#if primaryAction}
						<button
							onclick={primaryAction}
							class="flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
						>
							{#if primaryActionIcon}
								<FontAwesomeIcon icon={primaryActionIcon} class="h-4 w-4" />
							{/if}
							{#if primaryActionLabel}
								<span class="xs:inline ml-1.5 hidden">{primaryActionLabel}</span>
							{/if}
						</button>
					{/if}

					<!-- Menu Button -->
					<button
						onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
						class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
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
						{#each mobileMenuItems as item}
							<button
								onclick={() => {
									item.action();
									mobileMenuOpen = false;
								}}
								class="relative flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon
									icon={item.icon}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
								{item.label}
								{#if item.badge && item.badge > 0}
									<span
										class="ml-auto rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-semibold text-white"
									>
										{item.badge > 99 ? '99+' : item.badge}
									</span>
								{/if}
							</button>
						{/each}
						{#if currentUser}
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
				<div class="flex items-center space-x-4">
					{#if showBackButton}
						<button
							onclick={() => goto(backUrl)}
							class="rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label={backLabel}
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
					{/if}
					<button
						onclick={() => goto('/')}
						class="rounded-xl transition-opacity hover:opacity-80 active:scale-95"
						aria-label="Go to home"
					>
						<img
							src="/icon2.png"
							alt="Yard Sale Finder Logo"
							class="h-12 w-12 rounded-xl object-cover shadow-sm"
						/>
					</button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
						{#if subtitle || (count !== undefined && countLabel)}
							<div class="mt-0.5 flex items-center gap-3">
								{#if subtitle}
									<p class="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
								{/if}
								{#if count !== undefined && countLabel}
									<span class="text-xs text-gray-500 dark:text-gray-500">
										{#if subtitle}•
										{/if}
										{count}
										{countLabel}
									</span>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Right: Actions -->
				<div class="flex items-center gap-3">
					<!-- Secondary Actions -->
					<div class="flex items-center gap-2">
						{#each mobileMenuItems as item}
							<button
								onclick={item.action}
								class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								<FontAwesomeIcon icon={item.icon} class="mr-2 h-4 w-4" />
								{item.label}
								{#if item.badge && item.badge > 0}
									<span
										class="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white"
									>
										{item.badge > 99 ? '99+' : item.badge}
									</span>
								{/if}
							</button>
						{/each}
						{#if currentUser}
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

					<!-- Primary Action -->
					{#if primaryAction}
						<button
							onclick={primaryAction}
							class="flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
						>
							{#if primaryActionIcon}
								<FontAwesomeIcon icon={primaryActionIcon} class="mr-2 h-4 w-4" />
							{/if}
							{#if primaryActionLabel}
								{primaryActionLabel}
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</header>
