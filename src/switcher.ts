import {SCRIPT_ID} from './const';
import {$, parseHTML} from './util';

function getDocumentDatastore(prop: string, doc = document): string | undefined {
  return $('.js-datastore', doc)?.dataset[prop];
}

function getCSRFToken(doc = document): string {
  const tokenElement = $<HTMLMetaElement>('meta[name="csrf-token"]', doc);
  if (!tokenElement) {
    throw new Error('CSRF token meta tag not found in the document');
  }
  return tokenElement.content;
}

function isRequestException(e: unknown): e is requestException {
  return typeof e === 'object' && e !== null && 'error' in e && 'status' in e;
}

/**
 * @returns new CSRF token
 */
async function logout(): Promise<string> {
  const params = new URLSearchParams();
  params.append('_csrf_token', getCSRFToken());
  params.append('_method', 'delete');

  const resp = await fetch(window.location.origin + '/sessions', {
    method: 'POST',
    mode: 'same-origin',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (resp.status !== 200) {
    throw {
      error: new Error(`Unexpected status code ${resp.status} when trying to logout`),
      status: resp.status
    } as requestException;
  }

  const text = await resp.text();
  const doc = parseHTML(text);
  const newToken = getCSRFToken(doc);
  return newToken;
}

/**
 * @returns new CSRF token if 2FA is required
 */
async function login(email: string, password: string): Promise<string | null | undefined> {
  let token = getCSRFToken();
  if (getDocumentDatastore('userIsSignedIn') == 'true') {
    try {
      token = await logout();
    } catch (e) {
      if (isRequestException(e)) {
        if (e.status != 403) throw e.error;

        /**
         * One potential cause for the 403 error is when logout is
         * performed when the user is already signed out.
         * Working under this assumption, we fetch a fresh CSRF
         * token and proceed as normal.
         */
        token = await fetch(window.location.origin)
          .then(resp => resp.text())
          .then(parseHTML)
          .then(getCSRFToken);
      } else {
        throw e;
      }
    }
  }

  if (!token) return;
  const params = new URLSearchParams();
  params.append('_csrf_token', token);
  params.append('user[email]', email);
  params.append('user[password]', password);
  params.append('user[remember_me]', 'true');

  const resp = await fetch(window.location.origin + '/sessions', {
    method: 'POST',
    mode: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (resp.status !== 200) throw new Error(`Unexpected status code ${resp.status} when trying to login`);
  if (resp.url.endsWith('/sessions/totp/new')) {
    // get new CSRF token
    const token = await resp
      .text()
      .then(parseHTML)
      .then(doc => $<HTMLInputElement>('[name="_csrf_token"]', doc)?.value);

    return token;
  } else {
    window.location.reload();
    return null;
  }
}

function twoFactorFormHandler(e: Event): void {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  const body = new URLSearchParams(formData as unknown as string);
  $<HTMLButtonElement>('button', form)!.disabled = true;
  $<HTMLInputElement>('#user_twofactor_token', form)!.disabled = true;
  fetch(window.origin + '/sessions/totp', {
    method: 'POST',
    mode: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  }).then(resp => {
    if (resp.status !== 200) {
      $(`.${SCRIPT_ID}--panelWrapper`)?.remove();
      throw new Error(`Unexpected status code ${resp.status}`);
    }
    window.location.reload();
  });
}

export {login, twoFactorFormHandler};
