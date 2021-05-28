type globalStore = {
  [name in booruKeys]: UserCredential[];
};

type UserCredential = {
  displayName: string,
  email: string,
  password: string,
  avatar: string,
};

const globalStoreBase: globalStore = {
  'ponybooru': [],
  'ponerpics': [],
  'derpibooru': [],
};

const booruHostnames = {
  ponybooru: (/(www\.)?ponybooru\.org/i),
  ponerpics: (/(www\.)?ponerpics\.(org|com)/i),
  derpibooru: (/(www\.)?(derpibooru|trixiebooru)\.org/i),
};

type booruKeys = keyof typeof booruHostnames;

function currentBooru(): booruKeys {
  const hostname = window.location.hostname;
  for (const [booru, re] of Object.entries(booruHostnames)) {
    if (re.test(hostname)) return booru as booruKeys;
  }
  throw new Error(`hostname '${hostname}' could not be matched to a supported site`);
}

function matchAccount(key: string): (cred: UserCredential) => boolean {
  return cred => cred.email == key;
}

function setGlobalStore(store: globalStore): void {
  GM_setValue('credential_store', store);
}

function getGlobalStore(): globalStore {
  return GM_getValue('credential_store', globalStoreBase);
}

function setStore(store: UserCredential[]): void {
  const gStore = getGlobalStore();
  gStore[currentBooru()] = store;
  setGlobalStore(gStore);
}

function getStore(): UserCredential[] {
  const booru = currentBooru();
  return getGlobalStore()[booru];
}

function setAccount(cred: UserCredential): boolean {
  const store = getStore();
  const i = store.findIndex(matchAccount(cred.email));
  if (i > -1) return false;
  store.push(cred);
  setStore(store);
  return true;
}

function getAccount(key: string): UserCredential {
  return getStore().find(matchAccount(key));
}

function deleteAccount(key: string): void {
  const store = getStore();
  const i = store.findIndex(matchAccount(key));
  if (i > -1) {
    store.splice(i, 1);
    setStore(store);
  }
}

function moveAccount(dir: 'up' | 'down', key: string): void {
  const store = getStore();
  const index = store.findIndex(matchAccount(key));
  const sibIndex = (dir == 'up')
    ? index - 1
    : index + 1;

  // if index is already the first or last element
  if (sibIndex == -1 || sibIndex == store.length) return;

  // swap
  [store[index], store[sibIndex]] = [store[sibIndex], store[index]];
  setStore(store);
}

export {
  setStore,
  getStore,
  setAccount,
  getAccount,
  deleteAccount,
  moveAccount,
};
