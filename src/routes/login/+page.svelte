<script>
	import DiCode from 'svelte-icons/di/DiCode.svelte';
	export let form
</script>

<div class="flex flex-col items-center h-full w-full pt-12">
	<div class="h-24 w-24 text-primary">
		<DiCode />
	</div>
	<h2 class="text-center text-3xl font-bold tracking-tight text-base-content">
		Sign in to your account
	</h2>
	<p class="text-center mt-1">
		Or <a href="/register" class="text-primary font-medium hover:cursor-pointer">register</a> if you
		don't already have an account.
	</p>
	<form method="POST" action="?/login" class="flex flex-col items-center space-y-2 w-full mt-4">
		<div class="form-control w-full max-w-md">
			<label for="email" class="label font-medium pb-1">
				<span class="label-text">Email</span>
			</label>
			<input
				type="email"
				name="email"
				class="input input-bordered w-full max-w-md"
				value={form?.data?.email ?? ''}
			/>
		</div>
		<div class="form-control w-full max-w-md">
			<label for="password" class="label font-medium pb-1">
				<span class="label-text">Password</span>
			</label>
			<input type="password" name="password" class="input input-bordered w-full max-w-md" />
		</div>
		<div class="w-full max-w-md">
			<a
				href="/reset-password"
				class="font-medium text-primary hover:cursor-pointer hover:underline"
			>
				Forgot Password?
			</a>
		</div>
		<div class="w-full max-w-md pt-3 pb-2">
			<button class="btn btn-primary w-full max-w-md">Login</button>
		</div>
		{#if form?.invalidCredentials}
			<div class="alert alert-error shadow-lg w-full max-w-md ">
				<div>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current flex-shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
					<span>Invalid credentials.</span>
				</div>
			</div>
		{/if}
		{#if form?.notVerified}
			<div class="alert alert-error shadow-lg w-full max-w-md ">
				<div>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current flex-shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
					<span>You must verify your email address before you can login.</span>
				</div>
			</div>
		{/if}
	</form>
</div>
