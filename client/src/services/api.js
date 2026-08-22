import { API_BASE_URL } from "../utils/constants";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function createRoom() {
  const res = await fetch(`${API_BASE_URL}/rooms`, { method: "POST" });
  return handle(res);
}

export async function getRoom(roomId) {
  const res = await fetch(`${API_BASE_URL}/rooms/${roomId}`);
  return handle(res);
}

export async function loginRequest(identifier, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: identifier, email: identifier, password }),
  });
  return handle(res);
}

export async function signupRequest(username, email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return handle(res);
}
export async function verifyOtpRequest(email, otp) {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  return handle(res);
}

export async function resendOtpRequest(email) {
  const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handle(res);
}

export async function forgotPasswordRequest(email) {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handle(res);
}

export async function resetPasswordRequest(email, otp, newPassword) {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, newPassword }),
  });
  return handle(res);
}

export async function fetchReplayHistory(roomId) {
  const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/history`);
  return handle(res);
}

export async function askAi({ question, code, language, fileName, errorOutput }) {
  const res = await fetch(`${API_BASE_URL}/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, code, language, fileName, errorOutput }),
  });
  return handle(res);
}