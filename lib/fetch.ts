// A thin layer over the global fetch that lets the app hook into every request
// and response in one place (auth headers, logging, handling a 401) instead of
// repeating that work at each call site. The global fetch itself is left alone,
// so libraries that call it directly are unaffected.

export const BASE_URL = 'https://test-now.uburu.ai/api/v1/';

// The scanner/upload service (stats, patients, uploads) lives on its own host.
// Set EXPO_PUBLIC_SCANNER_BASE_URL for production; it defaults to staging.
export const SCANNER_BASE_URL = `${(
  process.env.EXPO_PUBLIC_SCANNER_BASE_URL ?? 'https://scan-staging.uburu.ai/api/v1'
)
  .trim()
  .replace(/\/+$/, '')}/`;

export type InterceptedRequest = {
  url: string;
  // Headers is always a Headers instance here, so an interceptor can call
  // init.headers.set(...) without checking what shape the caller passed.
  init: RequestInit & { headers: Headers };
};

export type RequestInterceptor = (
  request: InterceptedRequest,
) => InterceptedRequest | Promise<InterceptedRequest>;

export type ResponseInterceptor = (
  response: Response,
  request: InterceptedRequest,
) => Response | Promise<Response>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

/** Runs before every request, in the order added. Returns a function that removes it. */
export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor);
  return () => remove(requestInterceptors, interceptor);
}

/** Runs on every response, in the order added. Returns a function that removes it. */
export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor);
  return () => remove(responseInterceptors, interceptor);
}

export class SessionEndedError extends Error {
  constructor() {
    super('Signed out while this request was in flight.');
    this.name = 'SessionEndedError';
  }
}

/**
 * Drop-in replacement for fetch that passes through the registered interceptors.
 * A relative path such as 'auth/token/' is resolved against BASE_URL.
 */
export async function interceptedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const session = sessionVersion;
  let request: InterceptedRequest = {
    url: /^https?:\/\//.test(url) ? url : `${BASE_URL}${url.replace(/^\//, '')}`,
    init: { ...init, headers: new Headers(init.headers) },
  };

  for (const interceptor of requestInterceptors) {
    request = await interceptor(request);
  }

  let response = await fetch(request.url, request.init);

  // A request sent as a user who has since signed out (or been replaced) must
  // not hand its answer to whoever is signed in now.
  if (session !== sessionVersion && request.init.headers.has('Authorization')) {
    throw new SessionEndedError();
  }

  for (const interceptor of responseInterceptors) {
    response = await interceptor(response, request);
  }

  return response;
}

// The in-memory copy of the token held in secure storage (see auth-storage.ts),
// so each request does not have to wait on the Keychain.
let authToken: string | null = null;
let sessionVersion = 0;

export function setAuthToken(token: string | null) {
  if (token === authToken) return;
  authToken = token;
  sessionVersion += 1;
}

export function getAuthToken() {
  return authToken;
}

// Sends the signed-in user's token with every call to our own services, and
// never to any other host a caller might pass a full URL for. Auth endpoints
// expect the `Token` scheme; the scanner service expects `Bearer`.
addRequestInterceptor((request) => {
  if (!authToken || request.init.headers.has('Authorization')) return request;

  const scheme = authSchemeFor(request.url);
  if (scheme) request.init.headers.set('Authorization', `${scheme} ${authToken}`);
  return request;
});

function authSchemeFor(url: string) {
  if (url.startsWith(SCANNER_BASE_URL)) return 'Bearer';
  if (url.startsWith(BASE_URL)) {
    return url.slice(BASE_URL.length).startsWith('auth/') ? 'Token' : 'Bearer';
  }
  return null;
}

function remove<T>(list: T[], item: T) {
  const index = list.indexOf(item);
  if (index !== -1) list.splice(index, 1);
}
