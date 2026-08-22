const USERNAME_KEY = "syncspace:username";

export function getStoredUsername() {
  try {
    return localStorage.getItem(USERNAME_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredUsername(name) {
  try {
    localStorage.setItem(USERNAME_KEY, name);
  } catch {
    // localStorage unavailable — not persisting is a fine fallback
  }
}

export function randomGuestName() {
  return "Guest-" + Math.floor(Math.random() * 10000);
}