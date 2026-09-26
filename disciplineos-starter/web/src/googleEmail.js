const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
let accessToken = null;
let scriptPromise;

export const gmailConfigured = Boolean(CLIENT_ID);

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function hasGmailConnection() {
  return Boolean(accessToken);
}

export function disconnectGmail() {
  if (accessToken && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(accessToken, () => {});
  accessToken = null;
}

export async function connectGmail() {
  if (!CLIENT_ID) throw new Error("Google email access is not configured yet.");
  await loadGoogleIdentity();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) return reject(new Error(response.error_description || response.error));
        accessToken = response.access_token;
        resolve(accessToken);
      },
      error_callback: (error) => reject(new Error(error.message || "Google sign-in was closed.")),
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

async function gmailRequest(path) {
  if (!accessToken) throw new Error("Connect your Google account first.");
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) accessToken = null;
    throw new Error(result.error?.message || `Gmail request failed (${response.status}).`);
  }
  return response.json();
}

export async function fetchRecentGmail(maxResults = 12) {
  const list = await gmailRequest(`messages?maxResults=${maxResults}&q=in%3Ainbox`);
  const messages = await Promise.all((list.messages ?? []).map(async ({ id }) => {
    const message = await gmailRequest(`messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
    const headers = Object.fromEntries((message.payload?.headers ?? []).map(({ name, value }) => [name.toLowerCase(), value]));
    return {
      id,
      from: headers.from || "Unknown sender",
      subject: headers.subject || "No subject",
      date: headers.date || "",
      snippet: message.snippet || "",
      unread: message.labelIds?.includes("UNREAD") ?? false,
  threadId: message.threadId,
    };
  }));
  return messages;
}
