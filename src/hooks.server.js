import PocketBase from 'pocketbase';
//import { PUBLIC_PB_HOST } from '$env/static/public';
import { serializeNonPOJOs } from '$lib/utils';

const url = 'https://angry-sunset.pockethost.io'

export const handle = async ({ event, resolve }) => {
	event.locals.pb = new PocketBase(url);
	event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	if (event.locals.pb.authStore.isValid) {
		event.locals.user = serializeNonPOJOs(event.locals.pb.authStore.model);
	} else {
		event.locals.user = undefined;
	}

	const response = await resolve(event);

	response.headers.set('set-cookie', event.locals.pb.authStore.exportToCookie({ secure: false }));

	return response;
};
