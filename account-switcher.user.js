// ==UserScript==
// @name        Philomena Account Switcher
// @description User account switcher
// @version     1.0.0
// @author      Marker
// @license     MIT
// @namespace   https://github.com/marktaiwan/
// @homepageURL https://github.com/marktaiwan/Philomena-Account-Switcher
// @supportURL  https://github.com/marktaiwan/Philomena-Account-Switcher/issues
// @match       https://*.ponybooru.org/*
// @match       https://*.ponerpics.com/*
// @match       https://*.ponerpics.org/*
// @match       https://*.derpibooru.org/*
// @match       https://*.trixiebooru.org/*
// @inject-into content
// @noframes
// @require     https://github.com/marktaiwan/Derpibooru-Unified-Userscript-Ui/raw/master/derpi-four-u.js?v1.2.3
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==
(function () {
  'use strict';

  const NAME = 'Account Switcher';
  const SCRIPT_ID = 'account-switcher';

  /* Shorthands  */
  function $(selector, root = document) {
    return root.querySelector(selector);
  }
  function $$(selector, root = document) {
    return root.querySelectorAll(selector);
  }
  function create(ele) {
    return document.createElement(ele);
  }

  const globalStoreBase = {
    ponybooru: [],
    ponerpics: [],
    derpibooru: [],
  };
  const booruHostnames = {
    ponybooru: /(www\.)?ponybooru\.org/i,
    ponerpics: /(www\.)?ponerpics\.(org|com)/i,
    derpibooru: /(www\.)?(derpibooru|trixiebooru)\.org/i,
  };
  function currentBooru() {
    const hostname = window.location.hostname;
    for (const [booru, re] of Object.entries(booruHostnames)) {
      if (re.test(hostname)) return booru;
    }
    throw new Error(`hostname '${hostname}' could not be matched to a supported site`);
  }
  function matchAccount(key) {
    return cred => cred.email == key;
  }
  function setGlobalStore(store) {
    GM_setValue('credential_store', store);
  }
  function getGlobalStore() {
    return GM_getValue('credential_store', globalStoreBase);
  }
  function setStore(store) {
    const gStore = getGlobalStore();
    gStore[currentBooru()] = store;
    setGlobalStore(gStore);
  }
  function getStore() {
    const booru = currentBooru();
    return getGlobalStore()[booru];
  }
  function setAccount(cred) {
    const store = getStore();
    const i = store.findIndex(matchAccount(cred.email));
    if (i > -1) return false;
    store.push(cred);
    setStore(store);
    return true;
  }
  function getAccount(key) {
    return getStore().find(matchAccount(key));
  }
  function deleteAccount(key) {
    const store = getStore();
    const i = store.findIndex(matchAccount(key));
    if (i > -1) {
      store.splice(i, 1);
      setStore(store);
    }
  }
  function moveAccount(dir, key) {
    const store = getStore();
    const index = store.findIndex(matchAccount(key));
    const sibIndex = dir == 'up' ? index - 1 : index + 1;
    // if index is already the first or last element
    if (sibIndex == -1 || sibIndex == store.length) return;
    // swap
    [store[index], store[sibIndex]] = [store[sibIndex], store[index]];
    setStore(store);
  }

  function wrapArray(obj) {
    return Array.isArray(obj) ? obj : [obj];
  }
  function parseHTML(source) {
    const parser = new DOMParser();
    return parser.parseFromString(source, 'text/html');
  }
  function getKey(childEl) {
    return childEl.closest(`.${SCRIPT_ID}--list--row`)?.dataset.key;
  }
  function createBlockContent(...classes) {
    const div = create('div');
    div.classList.add('block__content', ...classes);
    return div;
  }
  function createInputField(text, propName) {
    const label = create('label');
    const input = create('input');
    label.innerText = text + ':';
    input.classList.add('input', `${SCRIPT_ID}--input`);
    input.setAttribute('autocomplete', 'off');
    input.dataset.prop = propName;
    return [label, input];
  }
  function createButton(text, classes) {
    const button = create('button');
    button.classList.add('button', ...wrapArray(classes));
    button.innerText = text;
    button.dataset.clickPreventdefault = 'true';
    return button;
  }
  function updateButton(text, button) {
    button.lastChild.remove();
    button.append(text);
  }
  function createSpan(child, classes) {
    const span = create('span');
    span.classList.add(...wrapArray(classes));
    span.append(child);
    return span;
  }
  function createAvatar(src) {
    const div = create('div');
    div.classList.add('image-constrained');
    if (src) {
      const img = create('img');
      img.src = src;
      div.append(img);
    }
    return div;
  }
  function createDelButton(key) {
    const anchor = create('a');
    anchor.classList.add(`${SCRIPT_ID}--list--remove`);
    anchor.dataset.key = key;
    anchor.dataset.clickPreventdefault = 'true';
    anchor.innerText = 'Delete';
    return anchor;
  }
  function createDelConfirmButton(key) {
    const span = create('span');
    span.classList.add(`${SCRIPT_ID}--list--confirm`);
    span.dataset.key = key;
    const yes = create('a');
    yes.dataset.delConfirm = 'y';
    yes.innerText = 'Y';
    const no = create('a');
    no.dataset.delConfirm = 'n';
    no.innerText = 'N';
    span.append('Are you sure? ', yes, '/', no);
    return span;
  }

  function getDocumentDatastore(prop, doc = document) {
    return $('.js-datastore', doc)?.dataset[prop];
  }
  function getCSRFToken(doc = document) {
    return $('meta[name="csrf-token"]', doc)?.content;
  }
  function isRequestException(e) {
    return typeof e === 'object' && e !== null && 'error' in e && 'status' in e;
  }
  /**
   * @returns new CSRF token
   */
  async function logout() {
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
        status: resp.status,
      };
    }
    const text = await resp.text();
    const doc = parseHTML(text);
    const newToken = getCSRFToken(doc);
    return newToken;
  }
  /**
   * @returns new CSRF token if 2FA is required
   */
  async function login(email, password) {
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
    if (resp.status !== 200)
      throw new Error(`Unexpected status code ${resp.status} when trying to login`);
    if (resp.url.endsWith('/sessions/totp/new')) {
      // get new CSRF token
      const token = await resp
        .text()
        .then(parseHTML)
        .then(doc => $('[name="_csrf_token"]', doc).value);
      return token;
    } else {
      window.location.reload();
      return null;
    }
  }
  function twoFactorFormHandler(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const body = new URLSearchParams(formData);
    $('button', form).disabled = true;
    $('#user_twofactor_token', form).disabled = true;
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

  function initCSS() {
    const CSS = `/* Generated by ${NAME} */
.${SCRIPT_ID}--list-container {
  max-width: 700px;
}
.${SCRIPT_ID}--list {
  max-height: 200px;
  overflow-y: auto;
  padding: 0px;
  border: 0px;
}
.${SCRIPT_ID}--list--row {
  display: flex;
  min-height: 40px;
  justify-content: flex-start;
  align-items: center;
  line-height: 1.5em;
}
.${SCRIPT_ID}--list--row > * {
  padding: 0px 6px;
}
.${SCRIPT_ID}--list--row a {
  user-select: none;
}
.${SCRIPT_ID}--avatar {
  flex: 0 0 40px;
  padding: 0px;
}
.${SCRIPT_ID}--name {
  flex: 0 0 30%;
}
.${SCRIPT_ID}--email {
  flex: 1 0;
  min-width: 0px;
  overflow-x: hidden;
}
.${SCRIPT_ID}--list--remove, .${SCRIPT_ID}--list--confirm {
  flex: 0 0 auto;
  cursor: pointer;
  font-weight: bold;
  margin-left: auto;
}
.${SCRIPT_ID}--list--confirm {
  cursor: initial;
}
.${SCRIPT_ID}--list--confirm a {
  cursor: pointer;
}
.${SCRIPT_ID}--reorder {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
}
.${SCRIPT_ID}--reorder a {
  cursor: pointer;
}
.${SCRIPT_ID}--details {
  padding: 10px;
}
.${SCRIPT_ID}--summary {
  cursor: pointer;
  margin-bottom: 10px;
}
.${SCRIPT_ID}--input-container {
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-gap: 10px;
  margin: 10px;
  max-width: 400px;
  align-items: center;
}
.${SCRIPT_ID}--input {
  padding: 2px 6px;
}
.${SCRIPT_ID}--dropdown {
  position: relative;
}
.${SCRIPT_ID}--header {
  box-sizing: border-box;
  width: 100%;
}
.${SCRIPT_ID}--dropdown:hover .${SCRIPT_ID}--nav {
  max-height: 100vh;
  transition-property: max-height;
  transition-duration: 0s;
  transition-delay: 0.1s;
}
.${SCRIPT_ID}--nav {
  display: block;
  position: absolute;
  top: 0px;
  left: initial;
  right: 100%;
  line-height: 36px;
  max-height: 0px;
  overflow-y: hidden;
  transition-delay: 0.4s;
}
.${SCRIPT_ID}--nav .image-constrained {
  width: 28px;
  height: 28px;
}
.${SCRIPT_ID}--nav > a[data-key] {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
  line-height: inherit;
  background-image: linear-gradient(90deg,
    hsl(0deg 0% 0% / 0%) 90%,
    hsl(0deg 0% 5% / 10%) 100%);
}
.${SCRIPT_ID}--nav > a[data-key]:first-child {
  background-image:
    linear-gradient(90deg,
      hsl(0deg 0% 0% / 0%) 95%,
      hsl(0deg 0% 5% / 10%) 100%
    ),
    linear-gradient(0deg,
      hsl(0deg 0% 0% / 0%) 80%,
      hsl(0deg 0% 5% / 10%) 100%
    );
}
.${SCRIPT_ID}--panelWrapper {
  display: flex;
  position: fixed;
  top: 0px;
  left: 0px;
  width: 100vw;
  height: 100vh;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background-color: rgba(0,0,0,0.5);
}
.${SCRIPT_ID}--panel {
  padding: 10px;
}
`;
    if (!$(`#${SCRIPT_ID}-style`)) {
      const styleElement = document.createElement('style');
      styleElement.setAttribute('type', 'text/css');
      styleElement.id = `${SCRIPT_ID}-style`;
      styleElement.innerHTML = CSS;
      document.body.insertAdjacentElement('afterend', styleElement);
    }
  }
  function clearInputFields() {
    const inputs = $$(`.${SCRIPT_ID}--input`);
    for (const input of inputs) input.value = '';
  }
  function renderList(list = $(`.${SCRIPT_ID}--list`)) {
    if (!list) return;
    const frag = new DocumentFragment();
    const accounts = getStore();
    for (const account of accounts) {
      const {avatar, displayName, email} = account;
      const row = createBlockContent('alternating-color', `${SCRIPT_ID}--list--row`);
      row.dataset.key = email;
      const avatarSpan = createSpan(createAvatar(avatar), `${SCRIPT_ID}--avatar`);
      const nameSpan = createSpan(displayName, `${SCRIPT_ID}--name`);
      const emailSpan = createSpan(email, `${SCRIPT_ID}--email`);
      const deleteButton = createDelButton(email);
      const moveUp = create('a');
      moveUp.dataset.dir = 'up';
      moveUp.classList.add(`${SCRIPT_ID}--move-up`);
      moveUp.innerHTML = '<i class="fa fa-chevron-up"></i>';
      const moveDown = create('a');
      moveDown.dataset.dir = 'down';
      moveDown.classList.add(`${SCRIPT_ID}--move-down`);
      moveDown.innerHTML = '<i class="fa fa-chevron-down"></i>';
      const reorderButtons = create('div');
      reorderButtons.classList.add(`${SCRIPT_ID}--reorder`);
      reorderButtons.append(moveUp, moveDown);
      row.append(avatarSpan, nameSpan, emailSpan, deleteButton, reorderButtons);
      frag.append(row);
    }
    if (accounts.length == 0) {
      const div = createBlockContent('alternating-color', 'center');
      div.innerText = 'No accounts added';
      frag.append(div);
    }
    list.innerHTML = '';
    list.appendChild(frag);
  }
  function setupConfigUI(configElement) {
    if (configElement === null) return;
    const frag = new DocumentFragment();
    // input fields
    const details = create('details');
    details.classList.add(`${SCRIPT_ID}--details`);
    const summary = create('summary');
    summary.classList.add(`${SCRIPT_ID}--summary`);
    summary.innerText = 'Add account';
    const inputContainer = create('div');
    inputContainer.classList.add(`${SCRIPT_ID}--input-container`);
    inputContainer.append(
      ...createInputField('Display name*', 'displayname'),
      ...createInputField('Email*', 'email'),
      ...createInputField('Password*', 'password'),
      ...createInputField('Avatar URL', 'avatar')
    );
    const buttonSet = create('div');
    const addButton = createButton('Add', ['button--state-success', `${SCRIPT_ID}--button--add`]);
    addButton.addEventListener('click', () => {
      const trimVal = input => input.value.trim();
      const name = $(`.${SCRIPT_ID}--input[data-prop="displayname"]`);
      const email = $(`.${SCRIPT_ID}--input[data-prop="email"]`);
      const password = $(`.${SCRIPT_ID}--input[data-prop="password"]`);
      const avatar = $(`.${SCRIPT_ID}--input[data-prop="avatar"]`);
      /**
       * Marking the inputs as 'required' will cause an error when trying to
       * save the settings if the fields are empty.
       * Instead, add the 'required' attribute dynamically, run the validation
       * to get the pretty browser UI if it doesn't pass, then remove the
       * attribute the next time the mouse is clicked.
       * The reason the attribute can't be removed immediately is because the
       * UI bubble disappears the moment it's removed.
       */
      const requiredFields = [name, email, password];
      requiredFields.forEach(input => input.setAttribute('required', 'required'));
      const invalid = [name, email, password].some(input => !input.reportValidity());
      document.addEventListener(
        'click',
        () => {
          requiredFields.forEach(input => input.removeAttribute('required'));
        },
        {once: true, capture: true}
      );
      if (invalid) return;
      const success = setAccount({
        displayName: trimVal(name),
        email: trimVal(email),
        password: password.value,
        avatar: trimVal(avatar),
      });
      if (success) {
        clearInputFields();
        renderList();
      }
    });
    const clearButton = createButton('Clear', [
      'button--separate-left',
      'button--state-warning',
      `${SCRIPT_ID}--button--clear`,
    ]);
    clearButton.addEventListener('click', clearInputFields);
    buttonSet.append(addButton, clearButton);
    details.append(summary, inputContainer, buttonSet);
    frag.append(details);
    // accounts list
    const container = create('div');
    container.classList.add('block', `${SCRIPT_ID}--list-container`);
    container.innerHTML =
      '<div class="block__header--sub"><span class="block__header__title">Accounts</span></div>';
    const list = createBlockContent(`${SCRIPT_ID}--list`);
    renderList(list);
    // delete button handler
    list.addEventListener('click', e => {
      let redraw = false;
      const target = e.target;
      const key = getKey(target);
      if (!key) return;
      if (target.matches(`.${SCRIPT_ID}--list--remove`)) {
        target.replaceWith(createDelConfirmButton(key));
      } else if (target.matches('a') && target.closest(`.${SCRIPT_ID}--list--confirm`)) {
        const span = target.parentElement;
        if (target.dataset.delConfirm == 'y') {
          deleteAccount(key);
          redraw = true;
        }
        if (target.dataset.delConfirm == 'n') {
          span.replaceWith(createDelButton(key));
        }
      } else if (target.closest(`.${SCRIPT_ID}--reorder a`)) {
        const direction = target.closest('a').dataset.dir;
        if (direction == 'up' || direction == 'down') {
          moveAccount(direction, key);
          redraw = true;
        }
      }
      if (redraw) renderList(e.currentTarget);
    });
    container.append(list);
    frag.append(container);
    configElement.appendChild(frag);
  }
  function displayTwoFactorForm(token) {
    const wrapper = create('div');
    wrapper.classList.add(`${SCRIPT_ID}--panelWrapper`);
    const panel = create('div');
    panel.classList.add('block__content', `${SCRIPT_ID}--panel`);
    panel.innerHTML = `
<div class="twofactor__container">
  <h1>Two Factor Authentication</h1>
  <form>
    <input name="_csrf_token" type="hidden" value="${token}">
    <input name="user[remember_me]" type="hidden" value="true">
    <div class="field">
      <h4>Please enter your 2FA code</h4>
      <input
        autocomplete="off"
        class="input"
        id="user_twofactor_token"
        name="user[twofactor_token]"
        placeholder="6-digit code"
        type="text"
        required="">
    </div>
    <button class="button" type="submit">Submit</button>
  </form>
</div>`;
    wrapper.append(panel);
    document.body.append(wrapper);
    $('form', panel).addEventListener('submit', twoFactorFormHandler);
    document.activeElement.blur();
    $('input#user_twofactor_token', panel).focus();
  }
  function applyDropdown() {
    const store = getStore();
    const userDropdown = $('header div.header__force-right > .dropdown:last-child');
    if (store.length == 0 || !userDropdown) return;
    const userDropdownContent = $('nav', userDropdown);
    const switcherDropdown = create('div');
    switcherDropdown.classList.add(`${SCRIPT_ID}--dropdown`);
    const header = userDropdownContent.firstElementChild.cloneNode(true);
    header.classList.add(`${SCRIPT_ID}--header`);
    header.innerHTML = `<i class="fa fa-fw fa-arrow-left"></i> ${header.innerText}`;
    const nav = create('nav');
    nav.classList.add(`${SCRIPT_ID}--nav`);
    // subheaders
    for (const account of store) {
      const a = create('a');
      a.classList.add('header__link');
      a.href = '#';
      a.dataset.key = account.email;
      a.dataset.clickPreventdefault = 'true';
      a.append(createAvatar(account.avatar), account.displayName);
      nav.append(a);
    }
    nav.addEventListener('click', async e => {
      const target = e.target;
      const button = target.closest(`.${SCRIPT_ID}--nav a[data-key]`);
      if (!button) return;
      const {email, password} = getAccount(button.dataset.key);
      updateButton('Switching...', button);
      try {
        const token = await login(email, password);
        if (token) {
          displayTwoFactorForm(token);
        }
      } catch (e) {
        updateButton('Error', button);
        throw e;
      }
    });
    switcherDropdown.append(header, nav);
    // attach to document
    userDropdownContent.firstElementChild.replaceWith(switcherDropdown);
  }
  function initUI(config) {
    initCSS();
    setupConfigUI(config.pageElement);
    applyDropdown();
  }

  const config = ConfigManager(NAME, SCRIPT_ID);
  initUI(config);
})();
