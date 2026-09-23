import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/public';

const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Rotte accessibili senza sessione. La route group `(auth)` non compare nell'URL. */
const OPEN_ROUTES = ['/login', '/auth', '/logout'];

const supabase: Handle = async ({ event, resolve }) => {
	if (!supabaseUrl || !supabasePublishableKey) {
		throw new Error(
			'Configurazione Supabase mancante: imposta PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_PUBLISHABLE_KEY (vedi .env.example).'
		);
	}

	event.locals.supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	// ⚠️ Importante: usare sempre `getUser()` (non `getSession()`) per fidarsi del token.
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const { pathname } = event.url;
	const isOpenRoute = OPEN_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);

	// Gli endpoint API gestiscono l'autenticazione autonomamente (401), non redirect.
	const isApiRoute = pathname.startsWith('/api/');

	if (!session && !isOpenRoute && !isApiRoute) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(pathname + event.url.search)}`);
	}

	if (session && pathname === '/login') {
		redirect(303, '/');
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
