import type { Handle } from '@sveltejs/kit';
import { createClient } from '$lib/supabase/server';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createClient(event.cookies);

	// IMPORTANT: always call getUser() (not getSession()) to validate the token server-side.
	const {
		data: { user }
	} = await event.locals.supabase.auth.getUser();
	event.locals.user = user;

	return resolve(event);
};
