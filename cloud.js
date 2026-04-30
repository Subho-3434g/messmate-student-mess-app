const FIREBASE_VERSION = "10.12.4";
const config = window.MESSMATE_FIREBASE_CONFIG || {};
const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
const state = {
  ready: false,
  error: "",
  user: null,
  messId: "",
  unsubscribe: null,
  saveTimer: null,
  docRef: null,
};

let firebase = {};

const api = {
  isConfigured: () => configured,
  isReady: () => state.ready,
  getError: () => state.error,
  getUser: () => state.user,
  getMessId: () => state.messId,
  signUp,
  signIn,
  signOutUser,
  openMess,
  saveState,
  closeMess,
};

window.MessCloud = api;

if (configured) {
  Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
  ])
    .then(([appModule, authModule, firestoreModule]) => {
      firebase = { ...appModule, ...authModule, ...firestoreModule };
      const app = firebase.initializeApp(config);
      state.auth = firebase.getAuth(app);
      state.db = firebase.getFirestore(app);
      firebase.enableIndexedDbPersistence(state.db).catch(() => {});
      firebase.onAuthStateChanged(state.auth, (user) => {
        state.user = user;
        window.dispatchEvent(new CustomEvent("messcloud-user", { detail: safeUser(user) }));
      });
      state.ready = true;
      window.dispatchEvent(new CustomEvent("messcloud-ready"));
    })
    .catch((error) => {
      state.error = error.message || "Cloud sync failed to load";
      window.dispatchEvent(new CustomEvent("messcloud-error", { detail: state.error }));
      window.dispatchEvent(new CustomEvent("messcloud-ready"));
    });
} else {
  window.dispatchEvent(new CustomEvent("messcloud-ready"));
}

async function signUp(email, password) {
  requireReady();
  return firebase.createUserWithEmailAndPassword(state.auth, email, password);
}

async function signIn(email, password) {
  requireReady();
  return firebase.signInWithEmailAndPassword(state.auth, email, password);
}

async function signOutUser() {
  requireReady();
  closeMess();
  return firebase.signOut(state.auth);
}

async function openMess(messId, localState, onRemoteState) {
  requireReady();
  requireUser();
  closeMess();

  const safeMessId = normalizeMessId(messId);
  state.messId = safeMessId;
  state.docRef = firebase.doc(state.db, "messes", safeMessId);

  const snapshot = await firebase.getDoc(state.docRef);
  if (!snapshot.exists()) {
    await firebase.setDoc(state.docRef, {
      ...cleanAppState(localState),
      ownerUid: state.user.uid,
      ownerEmail: state.user.email || "",
      members: { [state.user.uid]: true },
      createdAt: firebase.serverTimestamp(),
      updatedAt: firebase.serverTimestamp(),
      updatedBy: state.user.uid,
    });
  }

  state.unsubscribe = firebase.onSnapshot(state.docRef, (remoteSnapshot) => {
    if (!remoteSnapshot.exists()) return;
    const data = remoteSnapshot.data();
    onRemoteState(cleanAppState(data));
  });

  return safeMessId;
}

async function saveState(appState, options = {}) {
  if (!state.ready || !state.user || !state.docRef) return;
  const write = () =>
    firebase.setDoc(
      state.docRef,
      {
        ...cleanAppState(appState),
        members: { [state.user.uid]: true },
        updatedAt: firebase.serverTimestamp(),
        updatedBy: state.user.uid,
      },
      { merge: true },
    );

  if (options.now) {
    clearTimeout(state.saveTimer);
    await write();
    return;
  }

  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    write().catch((error) => {
      window.dispatchEvent(new CustomEvent("messcloud-error", { detail: error.message || "Cloud save failed" }));
    });
  }, 650);
}

function closeMess() {
  if (state.unsubscribe) state.unsubscribe();
  state.unsubscribe = null;
  state.docRef = null;
  state.messId = "";
}

function requireReady() {
  if (!configured) throw new Error("Firebase is not configured yet.");
  if (!state.ready) throw new Error(state.error || "Cloud sync is still loading.");
}

function requireUser() {
  if (!state.user) throw new Error("Please sign in first.");
}

function cleanAppState(appState = {}) {
  return {
    ui: appState.ui || {},
    residents: Array.isArray(appState.residents) ? appState.residents : [],
    meals: Array.isArray(appState.meals) ? appState.meals : [],
    purchases: Array.isArray(appState.purchases) ? appState.purchases : [],
    menus: Array.isArray(appState.menus) ? appState.menus : [],
    payments: Array.isArray(appState.payments) ? appState.payments : [],
  };
}

function normalizeMessId(value) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!cleaned) throw new Error("Enter a mess code.");
  return cleaned.slice(0, 80);
}

function safeUser(user) {
  if (!user) return null;
  return { uid: user.uid, email: user.email || "" };
}
