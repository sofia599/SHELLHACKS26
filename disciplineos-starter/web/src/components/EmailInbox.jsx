import { useState } from "react";
import { connectGmail, disconnectGmail, fetchRecentGmail, gmailConfigured, hasGmailConnection } from "../googleEmail.js";

export default function EmailInbox() {
  const [connected, setConnected] = useState(hasGmailConnection());
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    setBusy(true);
    setError("");
    try {
      await connectGmail();
      setConnected(true);
      await refresh();
    } catch (reason) {
      setError(reason.message || "Could not connect to Gmail.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setMessages(await fetchRecentGmail());
    } catch (reason) {
      setError(reason.message || "Could not load Gmail messages.");
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    disconnectGmail();
    setConnected(false);
    setMessages([]);
  }

  return (
    <div className="screen-content email-screen">
      <header className="screen-heading">
        <p className="eyebrow">Connected services</p>
        <h1>Email</h1>
        <p className="muted">View recent messages from your Gmail inbox.</p>
      </header>
      <section className="panel email-panel">
        <div className="email-panel-heading">
          <div className="gmail-mark" aria-hidden="true">M</div>
          <div className="email-account-copy"><strong>Gmail inbox</strong><span>{connected ? "Connected for this session" : "Not connected"}</span></div>
          {connected ? (
            <div className="email-actions"><button type="button" onClick={refresh} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button><button type="button" onClick={disconnect}>Disconnect</button></div>
          ) : (
            <button className="primary" type="button" disabled={!gmailConfigured || busy} onClick={connect}>{busy ? "Connecting…" : "Connect Gmail"}</button>
          )}
        </div>
        {!gmailConfigured && <p className="google-calendar-note">Google email access needs the same web OAuth client configured in the app.</p>}
        {error && <p className="google-calendar-error" role="alert">{error}</p>}
        {connected && messages.length === 0 && !busy && <div className="calendar-empty-state"><span className="empty-mark" aria-hidden="true">✉</span><div><strong>Your inbox is clear</strong><p>No recent inbox messages were returned.</p></div></div>}
        <div className="email-list">
          {messages.map((message) => (
            <article key={message.id} className={`email-row${message.unread ? " is-unread" : ""}`}>
              <span className="email-unread-dot" aria-hidden="true" />
              <div className="email-message-copy">
                <div className="email-message-top"><strong>{message.from}</strong><time>{message.date ? new Date(message.date).toLocaleDateString() : ""}</time></div>
                <strong className="email-subject">{message.subject}</strong>
                <span className="email-snippet">{message.snippet}</span>
              </div>
            </article>
          ))}
        </div>
        {connected && <p className="email-privacy-note">Read-only access. Email content is fetched for this session and isn’t saved in DisciplineOS.</p>}
      </section>
    </div>
  );
}
