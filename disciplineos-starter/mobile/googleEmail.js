async function gmailRequest(accessToken, path) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error?.message || `Gmail request failed (${response.status}).`);
  }
  return response.json();
}

export async function fetchGmailMessages(accessToken, maxResults = 12) {
  const result = await gmailRequest(accessToken, `messages?maxResults=${maxResults}&q=in%3Ainbox`);
  return Promise.all((result.messages ?? []).map(async ({ id }) => {
    const message = await gmailRequest(accessToken, `messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
    const headers = Object.fromEntries((message.payload?.headers ?? []).map(({ name, value }) => [name.toLowerCase(), value]));
    return { id, from: headers.from || 'Unknown sender', subject: headers.subject || 'No subject', date: headers.date || '', snippet: message.snippet || '', unread: message.labelIds?.includes('UNREAD') ?? false };
  }));
}
