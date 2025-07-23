import {create} from './common';
import {SCRIPT_ID} from '../const';

type maybeArray<T> = T | T[];

function wrapArray<T>(obj: T | T[]): T[] {
  return (Array.isArray(obj)) ? obj : [obj];
}

function parseHTML(source: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(source, 'text/html');
}

function getKey(childEl: HTMLElement): string | undefined {
  return childEl.closest<HTMLElement>(`.${SCRIPT_ID}--list--row`)?.dataset.key;
}

function createBlockContent(...classes: string[]): HTMLDivElement {
  const div = create('div');
  div.classList.add('block__content', ...classes);
  return div;
}

function createInputField(text: string, propName: string): [HTMLLabelElement, HTMLInputElement] {
  const label = create('label');
  const input = create('input');
  label.innerText = text + ':';
  input.classList.add(
    'input',
    `${SCRIPT_ID}--input`,
  );
  input.setAttribute('autocomplete', 'off');
  input.dataset.prop = propName;
  return [label, input];
}

function createButton(text: string, classes: maybeArray<string>): HTMLButtonElement {
  const button = create('button');
  button.classList.add('button', ...wrapArray(classes));
  button.innerText = text;
  button.dataset.clickPreventdefault = 'true';
  return button;
}

function updateButton(text: string, button: HTMLAnchorElement): void {
  button.lastChild?.remove();
  button.append(text);
}

function createSpan(child: Node | string, classes: maybeArray<string>): HTMLSpanElement {
  const span = create('span');
  span.classList.add(...wrapArray(classes));
  span.append(child);
  return span;
}

function createAvatar(src: string): HTMLDivElement {
  const div = create('div');
  div.classList.add('image-constrained');
  if (src) {
    const img = create('img');
    img.src = src;
    div.append(img);
  }
  return div;
}

function createDelButton(key: string): HTMLElement {
  const anchor = create('a');
  anchor.classList.add(`${SCRIPT_ID}--list--remove`);
  anchor.dataset.key = key;
  anchor.dataset.clickPreventdefault = 'true';
  anchor.innerText = 'Delete';
  return anchor;
}

function createDelConfirmButton(key: string): HTMLElement {
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

export {
  parseHTML,
  getKey,
  createBlockContent,
  createInputField,
  createButton,
  updateButton,
  createSpan,
  createAvatar,
  createDelButton,
  createDelConfirmButton,
};
