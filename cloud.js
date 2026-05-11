/**
 * Supabase Cloud Integration for MessMate
 */

const SUPABASE_VERSION = "2.43.4";
const config = window.MESSMATE_SUPABASE_CONFIG || {};
const configured = Boolean(config.url && config.key);
const state = {
  ready: false,
  error: "",
  user: null,
  userRole: null, // "admin", "manager", "student"
  messId: "",
  unsubscribe: null,
  saveTimer: null,
  supabase: null,
};

const api = {
  isConfigured: () => configured,
  isReady: () => state.ready,
  getError: () => state.error,
  getUser: () => state.user,
  getUserRole: () => state.userRole,
  getMessId: () => state.messId,
  signUp,
  signIn,
  signOutUser,
  openMess,
  saveState,
  closeMess,
  setUserRole,
  grantManagerAccess,
  revokeManagerAccess,
  getManagerAccessList,
};

window.MessCloud = api;

if (configured) {
  // Dynamically load Supabase client
  const script = document.createElement("script");
  script.src = `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SUPABASE_VERSION}/dist/umd/supabase.js`;
  script.onload = async () => {
    try {
      state.supabase = window.supabase.createClient(config.url, config.key);
      api.supabase = state.supabase; // Expose for other modules
      
      // Handle auth state changes
      state.supabase.auth.onAuthStateChange(async (event, session) => {
        state.user = session?.user || null;
        if (state.user) {
          await loadUserRole(state.user.id);
        } else {
          state.userRole = null;
        }
        window.dispatchEvent(new CustomEvent("messcloud-user", { detail: safeUser(state.user) }));
      });

      state.ready = true;
      window.dispatchEvent(new CustomEvent("messcloud-ready"));
    } catch (error) {
      state.error = error.message || "Supabase failed to load";
      window.dispatchEvent(new CustomEvent("messcloud-error", { detail: state.error }));
      window.dispatchEvent(new CustomEvent("messcloud-ready"));
    }
  };
  document.head.appendChild(script);
} else {
  window.dispatchEvent(new CustomEvent("messcloud-ready"));
}

async function signUp(email, password) {
  requireReady();
  const { data, error } = await state.supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  requireReady();
  const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOutUser() {
  requireReady();
  closeMess();
  state.userRole = null;
  const { error } = await state.supabase.auth.signOut();
  if (error) throw error;
}

async function loadUserRole(uid) {
  try {
    const { data, error } = await state.supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .single();
    
    if (data) {
      state.userRole = data.role || "student";
    } else {
      state.userRole = "student";
    }
  } catch (error) {
    console.error("Error loading user role:", error);
    state.userRole = "student";
  }
}

async function setUserRole(userId, role) {
  requireReady();
  if (state.userRole !== "admin") {
    throw new Error("Only admins can set user roles");
  }

  // Using Edge Function for secure role management
  const { data, error } = await state.supabase.functions.invoke('manage-roles', {
    body: { userId, role, action: 'updateRole' },
  });
  
  if (error) throw error;
  return data;
}

async function grantManagerAccess(managerId, messId, months) {
  requireReady();
  if (state.userRole !== "admin") {
    throw new Error("Only admins can grant manager access");
  }

  const { error } = await state.supabase
    .from('manager_access')
    .upsert({
      manager_id: managerId,
      mess_id: messId,
      months: months,
      granted_by: state.user.id
    }, { onConflict: 'manager_id,mess_id' });

  if (error) throw error;
}

async function revokeManagerAccess(managerId, messId) {
  requireReady();
  if (state.userRole !== "admin") {
    throw new Error("Only admins can revoke manager access");
  }

  const { error } = await state.supabase
    .from('manager_access')
    .delete()
    .match({ manager_id: managerId, mess_id: messId });

  if (error) throw error;
}

async function getManagerAccessList(messId) {
  requireReady();
  if (state.userRole !== "admin") {
    throw new Error("Only admins can view manager access list");
  }

  const { data, error } = await state.supabase
    .from('manager_access')
    .select('*')
    .eq('mess_id', messId);

  if (error) throw error;
  return data;
}

async function openMess(messId, localState, onRemoteState) {
  requireReady();
  requireUser();
  closeMess();

  const safeMessId = normalizeMessId(messId);
  state.messId = safeMessId;

  // Check access and load data
  const { data, error } = await state.supabase
    .from('messes')
    .select('*')
    .eq('id', safeMessId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    throw new Error("Access denied or mess not found");
  }

  if (!data) {
    // Create new mess if it doesn't exist (Admin/Manager only)
    if (state.userRole !== "admin" && state.userRole !== "manager") {
      throw new Error("Only admins and managers can create new messes");
    }

    const { error: insertError } = await state.supabase
      .from('messes')
      .insert({
        id: safeMessId,
        owner_id: state.user.id,
        data: cleanAppState(localState),
        updated_by: state.user.id
      });
    
    if (insertError) throw insertError;

    // Add creator as member
    await state.supabase
      .from('mess_members')
      .insert({ mess_id: safeMessId, user_id: state.user.id });
  }

  // Subscribe to real-time changes
  state.unsubscribe = state.supabase
    .channel(`mess_${safeMessId}`)
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'messes', 
      filter: `id=eq.${safeMessId}` 
    }, payload => {
      onRemoteState(cleanAppState(payload.new.data));
    })
    .subscribe();

  // Initial data push
  if (data) {
    onRemoteState(cleanAppState(data.data));
  }

  return safeMessId;
}

async function saveState(appState, options = {}) {
  if (!state.ready || !state.user || !state.messId) return;

  if (state.userRole === "student") {
    throw new Error("Students cannot modify mess data");
  }

  const write = async () => {
    const { error } = await state.supabase
      .from('messes')
      .update({
        data: cleanAppState(appState),
        updated_at: new Date().toISOString(),
        updated_by: state.user.id
      })
      .eq('id', state.messId);
    
    if (error) throw error;
  };

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
  if (state.unsubscribe) {
    state.supabase.removeChannel(state.unsubscribe);
  }
  state.unsubscribe = null;
  state.messId = "";
}

function requireReady() {
  if (!configured) throw new Error("Supabase is not configured yet.");
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
  return { id: user.id, email: user.email || "" };
}
