/**
 * Generate VAPID keys for Web Push notifications.
 *
 * Usage:
 *   node generate-vapid-keys.js
 *
 * Output prints the keys to the console.
 * Copy them into your .env file:
 *   VAPID_PUBLIC_KEY=<publicKey>
 *   VAPID_PRIVATE_KEY=<privateKey>
 *   REACT_APP_VAPID_PUBLIC_KEY=<publicKey>   (for the frontend, same as VAPID_PUBLIC_KEY)
 *   VAPID_SUBJECT=mailto:your-email@example.com
 */

import webPush from 'web-push';

const vapidKeys = webPush.generateVAPIDKeys();

console.log('\n✅ VAPID Keys Generated Successfully!\n');
console.log('Add the following to your backend .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
console.log(`\nAnd add this to your frontend .env file:\n`);
console.log(`REACT_APP_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log('');
