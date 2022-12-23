import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';

const config = {
	plugins: [
		sveltekit(),
		Icons({
			compiler: 'svelte'
		})
	]
};

export default config;
