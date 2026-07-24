// LUMI Notify Server
// Server i vogël, i pavarur nga Firebase Blaze — përdor Firebase Admin SDK
// vetëm për të dërguar njoftime push reale (FCM), gjë që është gjithmonë falas.
//
// ⚙️ KONFIGURIMI: te Render.com, shto një Environment Variable të quajtur
// FIREBASE_SERVICE_ACCOUNT_JSON dhe ngjit aty GJITHË përmbajtjen e skedarit
// .json që e shkarkove nga Firebase (Project Settings → Service accounts).
// MOS e vendos këtë skedar direkt në kod apo në GitHub — vetëm si env variable.

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} catch (e) {
  console.error('FIREBASE_SERVICE_ACCOUNT_JSON mungon ose s\'është JSON i vlefshëm.');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('LUMI notify server po punon ✅');
});

// Endpoint kryesor: dërgon njoftim push real te një person specifik i LUMI,
// duke gjetur token-in e tij te Firestore (koleksioni "users").
app.post('/send-notification', async (req, res) => {
  try {
    const { handle, icon, text, liveId } = req.body;
    if (!handle || !text) {
      return res.status(400).json({ error: 'handle dhe text janë të detyrueshme' });
    }

    const doc = await db.collection('users').doc(handle).get();
    if (!doc.exists || !doc.data().fcmToken) {
      return res.status(404).json({ error: `S'ka token të ruajtur për @${handle}` });
    }

    const token = doc.data().fcmToken;
    await admin.messaging().send({
      token,
      notification: {
        title: 'LUMI',
        body: `${icon || '🔔'} ${text}`,
      },
      data: {
        liveId: liveId || '',
      },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('Dërgimi dështoi:', e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LUMI notify server po dëgjon në portin ${PORT}`));
