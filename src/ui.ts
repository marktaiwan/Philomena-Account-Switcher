import {NAME, SCRIPT_ID} from './const';
import {$, $$, create} from './util/common';
import {getStore, setAccount, deleteAccount, getAccount, moveAccount} from './storage';
import {login, twoFactorFormHandler} from './switcher';
import {
  createBlockContent,
  createButton,
  createInputField,
  updateButton,
  createAvatar,
  createDelButton,
  createDelConfirmButton,
  getKey,
  createSpan,
} from './util/project';

function initCSS(): void {
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

function clearInputFields(): void {
  const inputs = $$<HTMLInputElement>(`.${SCRIPT_ID}--input`);
  for (const input of inputs) input.value = '';
}

function renderList(list: HTMLDivElement = $(`.${SCRIPT_ID}--list`)): void {
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

    row.append(
      avatarSpan,
      nameSpan,
      emailSpan,
      deleteButton,
      reorderButtons,
    );
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

function setupConfigUI(configElement: HTMLElement): void {
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
    ...createInputField('Avatar URL', 'avatar'),
  );

  const buttonSet = create('div');
  const addButton = createButton( 'Add', [
    'button--state-success',
    `${SCRIPT_ID}--button--add`,
  ]);
  addButton.addEventListener('click', () => {
    const trimVal = (input: HTMLInputElement): string => input.value.trim();
    const name = $<HTMLInputElement>(`.${SCRIPT_ID}--input[data-prop="displayname"]`);
    const email = $<HTMLInputElement>(`.${SCRIPT_ID}--input[data-prop="email"]`);
    const password = $<HTMLInputElement>(`.${SCRIPT_ID}--input[data-prop="password"]`);
    const avatar = $<HTMLInputElement>(`.${SCRIPT_ID}--input[data-prop="avatar"]`);

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
    document.addEventListener('click', () => {
      requiredFields.forEach(input => input.removeAttribute('required'));
    }, {once: true, capture: true});
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
  container.innerHTML = '<div class="block__header--sub"><span class="block__header__title">Accounts</span></div>';

  const list = createBlockContent(`${SCRIPT_ID}--list`);
  renderList(list);

  // delete button handler
  list.addEventListener('click', e => {
    let redraw = false;
    const target = e.target as HTMLElement;
    const key = getKey(target);
    if (!key) return;

    if (target.matches(`.${SCRIPT_ID}--list--remove`)) {
      target.replaceWith(createDelConfirmButton(key));
    } else if (target.matches('a')
      && target.closest(`.${SCRIPT_ID}--list--confirm`)) {
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

    if (redraw) renderList(e.currentTarget as HTMLDivElement);
  });

  container.append(list);
  frag.append(container);

  configElement.appendChild(frag);
}

function displayTwoFactorForm(token: string): void {
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
  (document.activeElement as HTMLElement).blur();
  $('input#user_twofactor_token', panel).focus();
}

function applyDropdown(): void {
  const store = getStore();
  const userDropdown = $('header div.header__force-right > .dropdown:last-child');
  if (store.length == 0 || !userDropdown) return;

  const userDropdownContent = $('nav', userDropdown);
  const switcherDropdown = create('div');
  switcherDropdown.classList.add(`${SCRIPT_ID}--dropdown`);

  const header = userDropdownContent.firstElementChild.cloneNode(true) as HTMLAnchorElement;
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
    a.append(
      createAvatar(account.avatar),
      account.displayName,
    );
    nav.append(a);
  }

  nav.addEventListener('click', async e => {
    const target = e.target as HTMLElement;
    const button = target.closest(`.${SCRIPT_ID}--nav a[data-key]`) as HTMLAnchorElement;
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

function initUI(config: ConfigObject): void {
  initCSS();
  setupConfigUI(config.pageElement);
  applyDropdown();
}

export {
  initUI,
};
