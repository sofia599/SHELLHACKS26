import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fetchGmailMessages } from './googleEmail.js';

export default function EmailInbox({ styles, token, configured, onConnect, onDisconnect }) {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setMessages([]); return undefined; }
    let cancelled = false;
    setBusy(true);
    fetchGmailMessages(token)
      .then((result) => { if (!cancelled) setMessages(result); })
      .catch((reason) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <View style={styles.screenSection}>
      <Text style={styles.kicker}>CONNECTED SERVICES</Text>
      <Text style={styles.pageTitle}>Emails</Text>
      <Text style={styles.pageSubtitle}>A read-only view of your recent Gmail inbox.</Text>
      <View style={styles.emailPanel}>
        <View style={styles.emailHeader}>
          <View style={styles.emailLogo}><Text style={styles.emailLogoText}>M</Text></View>
          <View style={styles.emailHeaderCopy}><Text style={styles.emailHeaderTitle}>Gmail inbox</Text><Text style={styles.profileSubtitle}>{token ? 'Connected for this session' : 'Not connected'}</Text></View>
          {token ? <Pressable onPress={onDisconnect} style={styles.emailButton}><Text style={styles.emailButtonText}>Disconnect</Text></Pressable> : <Pressable disabled={!configured || busy} onPress={onConnect} style={[styles.emailButton, !configured && styles.disabledAction]}><Text style={styles.emailButtonText}>{busy ? 'Connecting…' : 'Connect Gmail'}</Text></Pressable>}
        </View>
        {!configured && <Text style={styles.googleNote}>Gmail API access isn’t configured for this app.</Text>}
        {!!error && <Text style={styles.googleError}>{error}</Text>}
        {busy && <Text style={styles.profileSubtitle}>Loading messages…</Text>}
        {token && !busy && messages.length === 0 && <Text style={styles.emptyCopy}>No recent inbox messages.</Text>}
        {messages.map((message) => (
          <View key={message.id} style={[styles.emailRow, message.unread && styles.emailRowUnread]}>
            <View style={[styles.emailUnreadDot, { opacity: message.unread ? 1 : 0 }]} />
            <View style={styles.emailMessageCopy}>
              <View style={styles.emailMessageTop}><Text style={styles.emailSender} numberOfLines={1}>{message.from}</Text><Text style={styles.emailDate}>{message.date ? new Date(message.date).toLocaleDateString() : ''}</Text></View>
              <Text style={styles.emailSubject} numberOfLines={1}>{message.subject}</Text>
              <Text style={styles.emailSnippet} numberOfLines={2}>{message.snippet}</Text>
            </View>
          </View>
        ))}
        {token && <Text style={styles.emailPrivacy}>Read-only. Messages are loaded for this session and aren’t saved here.</Text>}
      </View>
    </View>
  );
}
