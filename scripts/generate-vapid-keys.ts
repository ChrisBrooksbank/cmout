/**
 * Generate VAPID keys for Web Push notifications.
 *
 * Usage:
 *   npx tsx scripts/generate-vapid-keys.ts
 *
 * Copy the output into your .env file or Netlify environment variables.
 */

import { generateVapidKeys } from '../src/push/vapid.js';

const { publicKey, privateKey } = generateVapidKeys();

// eslint-disable-next-line no-console
console.log('Generated VAPID keys — add these to your .env file:\n');
// eslint-disable-next-line no-console
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
// eslint-disable-next-line no-console
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
// eslint-disable-next-line no-console
console.log(`VAPID_SUBJECT=mailto:admin@example.com`);
// eslint-disable-next-line no-console
console.log(
  '\nKeep VAPID_PRIVATE_KEY secret. VAPID_PUBLIC_KEY is safe to share with the frontend.'
);
