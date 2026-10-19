import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "./supabase-config.js";

const status = document.querySelector("#admin-status");
const loginPanel = document.querySelector("#login-panel");
const workspace = document.querySelector("#admin-workspace");
const logoutButton = document.querySelector("#logout-button");
const loginForm = document.querySelector("#login-form");
const musicForm = document.querySelector("#music-form");
const eventForm = document.querySelector("#event-form");
const state = { supabase: null, music: [], events: [] };

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function showLogin() {
  loginPanel.hidden = false;
  workspace.hidden = true;
  logoutButton.hidden = true;
}

function showWorkspace() {
  loginPanel.hidden = true;
  workspace.hidden = false;
  logoutButton.hidden = false;
}

function isWebUrl(value, optional = false) {
  if (optional && value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateUrls(form, names) {
  for (const name of names) {
    const field = form.elements.namedItem(name);
    const value = field.value.trim();
    field.setCustomValidity(isWebUrl(value, !field.required) ? "" : "Enter an http or https URL.");
  }
  return form.reportValidity();
}

function readForm(form, names) {
  const values = Object.fromEntries(names.map((name) => [
    name,
    String(new FormData(form).get(name) || "").trim()
  ]));
  for (const name of ["audio_url", "artwork_url", "image_url"]) {
    if (name in values && values[name] === "") values[name] = null;
  }
  if ("event_date" in values && values.event_date === "") values.event_date = null;
  return values;
}

const assetTypes = {
  audio_file: {
    folder: "audio",
    column: "audio_url",
    mimeTypes: new Set(["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav", "audio/aac", "audio/flac"])
  },
  artwork_file: {
    folder: "artwork",
    column: "artwork_url",
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp"])
  },
  image_file: {
    folder: "events",
    column: "image_url",
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp"])
  }
};

async function uploadSelectedAssets(form, values, inputNames) {
  const uploadedPaths = [];
  const files = [];
  for (const inputName of inputNames) {
    const input = form.elements.namedItem(inputName);
    const file = input.files[0];
    if (!file) continue;
    const rule = assetTypes[inputName];
    if (!rule.mimeTypes.has(file.type)) {
      setStatus(`Choose a supported file type for ${inputName.replace("_", " ")}.`, true);
      return { ok: false, uploadedPaths };
    }
    if (file.size > 50 * 1024 * 1024) {
      setStatus("Each uploaded file must be 50 MB or smaller.", true);
      return { ok: false, uploadedPaths };
    }
    files.push({ inputName, file, rule });
  }

  for (const { file, rule } of files) {
    const extension = file.name.split(".").pop().toLowerCase();
    const path = `${rule.folder}/${window.crypto.randomUUID()}.${extension}`;
    try {
      const { error } = await state.supabase.storage.from("music-assets").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });
      if (error) throw error;
      uploadedPaths.push(path);
      values[rule.column] = state.supabase.storage.from("music-assets").getPublicUrl(path).data.publicUrl;
    } catch (error) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await state.supabase.storage.from("music-assets").remove(uploadedPaths);
        if (cleanupError) console.error("Unable to clean up files after a failed upload.", cleanupError);
      }
      return { ok: false, uploadedPaths: [], error };
    }
  }
  return { ok: true, uploadedPaths };
}

function resetForm(form, defaultButtonText) {
  form.reset();
  delete form.dataset.editId;
  form.querySelector('button[type="submit"]').innerHTML = `${defaultButtonText} <span>↗</span>`;
  form.querySelector(".admin-cancel").hidden = true;
}

function startEditing(form, item, names, buttonText) {
  form.dataset.editId = item.id;
  names.forEach((name) => {
    form.elements.namedItem(name).value = item[name] || "";
  });
  form.querySelector('button[type="submit"]').textContent = `SAVE ${buttonText}`;
  form.querySelector(".admin-cancel").hidden = false;
  form.elements.namedItem(names[0]).focus();
}

function createItem(title, detail, id, type) {
  const row = document.createElement("div");
  row.className = "admin-item";
  const text = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = title;
  const subtitle = document.createElement("small");
  subtitle.textContent = detail;
  text.append(name, subtitle);

  const actions = document.createElement("div");
  actions.className = "admin-item-actions";
  for (const action of ["edit", "delete"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = id;
    button.dataset.type = type;
    button.textContent = action.toUpperCase();
    actions.append(button);
  }
  row.append(text, actions);
  return row;
}

function renderLists() {
  const musicList = document.querySelector("#admin-music-list");
  const eventList = document.querySelector("#admin-event-list");
  musicList.replaceChildren(...state.music.map((track) => createItem(
    track.title, track.artist, track.id, "music"
  )));
  eventList.replaceChildren(...state.events.map((event) => createItem(
    event.title, `${event.event_date || "Date by arrangement"} · ${event.location}`, event.id, "events"
  )));
}

async function loadLists() {
  const [musicResult, eventResult] = await Promise.all([
    state.supabase.from("music_tracks").select("*").order("created_at", { ascending: false }),
    state.supabase.from("events").select("*").order("created_at", { ascending: false })
  ]);
  if (musicResult.error || eventResult.error) {
    const error = musicResult.error || eventResult.error;
    console.error("Unable to load admin content.", error);
    setStatus(`Could not load content: ${error.message}`, true);
    return false;
  }
  state.music = musicResult.data;
  state.events = eventResult.data;
  renderLists();
  return true;
}

async function authorizeSession(session) {
  if (!session) {
    showLogin();
    return;
  }
  setStatus("Checking admin access…");
  const { data, error } = await state.supabase.rpc("is_site_admin");
  if (error) {
    console.error("Unable to verify admin access.", error);
    await state.supabase.auth.signOut();
    showLogin();
    setStatus(`Could not verify admin access: ${error.message}`, true);
    return;
  }
  if (data !== true) {
    await state.supabase.auth.signOut();
    showLogin();
    setStatus("This account is not authorized to manage site content.", true);
    return;
  }
  showWorkspace();
  if (await loadLists()) setStatus("You are signed in. Changes publish to the public site.");
}

async function saveRecord(form, table, fields, urlFields, fileFields, defaultButtonText) {
  if (!form.reportValidity() || !validateUrls(form, urlFields)) return;
  const values = readForm(form, fields);
  setStatus("Saving changes…");
  const uploads = await uploadSelectedAssets(form, values, fileFields);
  if (!uploads.ok) {
    if (uploads.error) {
      console.error(`Unable to upload assets for ${table}.`, uploads.error);
      setStatus(`Could not upload a file: ${uploads.error.message}`, true);
    }
    return;
  }
  try {
    const request = form.dataset.editId
      ? state.supabase.from(table).update(values).eq("id", form.dataset.editId)
      : state.supabase.from(table).insert(values);
    const { error } = await request;
    if (error) throw error;
  } catch (error) {
    console.error(`Unable to save ${table}.`, error);
    if (uploads.uploadedPaths.length > 0) {
      const { error: cleanupError } = await state.supabase.storage.from("music-assets").remove(uploads.uploadedPaths);
      if (cleanupError) console.error("Unable to clean up uploaded files after a failed content save.", cleanupError);
    }
    setStatus(`Could not save changes: ${error.message}`, true);
    return;
  }
  resetForm(form, defaultButtonText);
  if (await loadLists()) setStatus("Saved and published. Visitors can now see this content.");
}

async function handleListAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { type, id, action } = button.dataset;
  const collection = type === "music" ? state.music : state.events;
  const item = collection.find((entry) => entry.id === id);
  if (!item) return;

  if (action === "edit") {
    if (type === "music") {
      startEditing(musicForm, item, ["title", "artist", "listen_url", "audio_url", "artwork_url"], "MUSIC CHANGES");
    } else {
      startEditing(eventForm, item, ["title", "event_date", "location", "description", "image_url"], "EVENT CHANGES");
    }
    return;
  }

  if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
  const table = type === "music" ? "music_tracks" : "events";
  const { error } = await state.supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error(`Unable to delete from ${table}.`, error);
    setStatus(`Could not delete content: ${error.message}`, true);
    return;
  }
  const form = type === "music" ? musicForm : eventForm;
  if (form.dataset.editId === id) resetForm(form, `ADD ${type.toUpperCase()}`);
  if (await loadLists()) setStatus("Content deleted from the public site.");
}

if (!hasSupabaseConfig()) {
  showLogin();
  loginForm.querySelectorAll("input, button").forEach((field) => { field.disabled = true; });
  setStatus("Admin setup is not finished. Add the Supabase project URL and public anon key in supabase-config.js.", true);
} else {
  state.supabase = createClient(supabaseUrl, supabaseAnonKey);
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    setStatus("Signing in…");
    const values = readForm(loginForm, ["email", "password"]);
    const { data, error } = await state.supabase.auth.signInWithPassword(values);
    if (error) {
      console.error("Admin sign-in failed.", error);
      setStatus(`Sign-in failed: ${error.message}`, true);
      return;
    }
    await authorizeSession(data.session);
  });

  logoutButton.addEventListener("click", async () => {
    const { error } = await state.supabase.auth.signOut();
    if (error) {
      console.error("Admin sign-out failed.", error);
      setStatus(`Could not sign out: ${error.message}`, true);
      return;
    }
    showLogin();
    setStatus("You have signed out.");
  });

  state.supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      showLogin();
      state.music = [];
      state.events = [];
      renderLists();
    }
  });

  musicForm.addEventListener("input", () => {
    musicForm.querySelectorAll('input[type="url"]').forEach((field) => field.setCustomValidity(""));
  });
  eventForm.addEventListener("input", () => {
    eventForm.querySelectorAll('input[type="url"]').forEach((field) => field.setCustomValidity(""));
  });
  musicForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveRecord(musicForm, "music_tracks", ["title", "artist", "listen_url", "audio_url", "artwork_url"],
      ["listen_url", "audio_url", "artwork_url"], ["audio_file", "artwork_file"], "ADD MUSIC");
  });
  eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveRecord(eventForm, "events", ["title", "event_date", "location", "description", "image_url"],
      ["image_url"], ["image_file"], "ADD EVENT");
  });
  musicForm.querySelector(".admin-cancel").addEventListener("click", () => resetForm(musicForm, "ADD MUSIC"));
  eventForm.querySelector(".admin-cancel").addEventListener("click", () => resetForm(eventForm, "ADD EVENT"));
  document.querySelector("#admin-music-list").addEventListener("click", handleListAction);
  document.querySelector("#admin-event-list").addEventListener("click", handleListAction);

  state.supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Unable to restore admin session.", error);
      setStatus(`Could not restore admin session: ${error.message}`, true);
      return;
    }
    authorizeSession(data.session);
  }).catch((error) => {
    console.error("Unable to restore admin session.", error);
    setStatus("Could not restore admin session. Check your connection and reload.", true);
  });
}
