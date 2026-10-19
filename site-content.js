import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "./supabase-config.js";

const musicList = document.querySelector("#music-list");
const eventList = document.querySelector("#event-list");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function setLoadingMessage(element, message, isError = false) {
  element.innerHTML = `<p class="${element.id === "music-list" ? "music-empty" : "event-empty"}"${isError ? ' role="alert"' : ""}>${escapeHTML(message)}</p>`;
}

function renderMusic(tracks) {
  if (tracks.length === 0) {
    setLoadingMessage(musicList, "New music is on the way. Check back soon for sounds from the Harmony Hackers family.");
    return;
  }

  musicList.innerHTML = tracks.map((track) => {
    const cover = track.artwork_url
      ? `<img src="${escapeHTML(track.artwork_url)}" alt="Cover artwork for ${escapeHTML(track.title)}" loading="lazy">`
      : '<span class="music-artwork-mark" aria-hidden="true">HH ✳</span>';
    const audioPlayer = track.audio_url
      ? `<audio controls preload="none" src="${escapeHTML(track.audio_url)}" aria-label="Play ${escapeHTML(track.title)} by ${escapeHTML(track.artist)}"></audio>`
      : "";
    return `<article class="music-card reveal visible">
      <div class="music-artwork">${cover}</div>
      <div class="music-info"><h3>${escapeHTML(track.title)}</h3><p>${escapeHTML(track.artist)}</p>
      <a class="music-listen" href="${escapeHTML(track.listen_url)}" target="_blank" rel="noopener noreferrer">LISTEN NOW <span>↗</span></a>
      ${audioPlayer}</div>
    </article>`;
  }).join("");
}

function renderEvents(events) {
  if (events.length === 0) {
    setLoadingMessage(eventList, "No events are listed right now. Get in touch to book Harmony Hackers for your event.");
    return;
  }

  eventList.innerHTML = events.map((event) => {
    let dateMarkup = "<strong>OPEN<br>BOOKING</strong><small>DATE BY ARRANGEMENT</small>";
    if (event.event_date) {
      const [year, month, day] = event.event_date.split("-");
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      dateMarkup = `<strong>${escapeHTML(date.toLocaleString("en", { month: "short" }))}<br>${escapeHTML(day)}</strong><small>${escapeHTML(year)}</small>`;
    }
    const photo = event.image_url
      ? `<img src="${escapeHTML(event.image_url)}" alt="${escapeHTML(event.title)}" loading="lazy">`
      : "";
    return `<article class="event-card reveal visible">
      <div class="event-date"><span>HARMONY HACKERS</span>${dateMarkup}</div>
      <div class="event-main"><span class="event-type">LIVE EVENT / ${escapeHTML(event.location)}</span>
      <h3>${escapeHTML(event.title)}</h3><p>${escapeHTML(event.description)}</p>
      <a href="#contact" class="button button-gold">ENQUIRE ABOUT THIS EVENT <span>↗</span></a></div>
      <div class="event-photo">${photo}<span>${escapeHTML(event.title)}</span></div>
    </article>`;
  }).join("");
}

async function loadPublishedContent() {
  if (!hasSupabaseConfig()) {
    setLoadingMessage(musicList, "Music is being set up. Check back soon.");
    setLoadingMessage(eventList, "Event listings are being set up. Get in touch to book Harmony Hackers.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const [musicResult, eventResult] = await Promise.all([
    supabase.from("music_tracks").select("id,title,artist,listen_url,audio_url,artwork_url,created_at")
      .eq("is_published", true).order("created_at", { ascending: false }),
    supabase.from("events").select("id,title,event_date,location,description,image_url,created_at")
      .eq("is_published", true).order("event_date", { ascending: true, nullsFirst: false })
  ]);

  if (musicResult.error) {
    console.error("Unable to load published music.", musicResult.error);
    setLoadingMessage(musicList, "Music could not be loaded right now. Please try again later.", true);
  } else {
    renderMusic(musicResult.data);
  }

  if (eventResult.error) {
    console.error("Unable to load published events.", eventResult.error);
    setLoadingMessage(eventList, "Events could not be loaded right now. Please try again later.", true);
  } else {
    renderEvents(eventResult.data);
  }
}

loadPublishedContent().catch((error) => {
  console.error("Unable to connect to the Harmony Hackers content service.", error);
  setLoadingMessage(musicList, "Music could not be loaded right now. Please try again later.", true);
  setLoadingMessage(eventList, "Events could not be loaded right now. Please try again later.", true);
});
