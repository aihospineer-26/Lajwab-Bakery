const fs = require('fs');
const path = require('path');

/* Firebase is optional, so its config plugins have to be too.
 *
 * @react-native-firebase/app throws during prebuild if
 * expo.android.googleServicesFile is unset -- which would break every Android
 * build for anyone not using the Firebase OTP channel. Since the app ships on
 * WhatsApp OTP by default and Firebase is only one of three delivery channels,
 * the plugins are stripped unless google-services.json is actually present.
 *
 * Drop the file in and Firebase turns itself on. Delete it (after DLT clears
 * and SMS moves to the Send SMS Hook) and it turns itself off. Nothing to
 * remember either way.
 *
 * See FIREBASE_OTP.md.
 */

const GOOGLE_SERVICES = 'google-services.json';

function isFirebasePlugin(plugin) {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  return typeof name === 'string' && name.startsWith('@react-native-firebase/');
}

module.exports = ({ config }) => {
  const configured = fs.existsSync(path.join(__dirname, GOOGLE_SERVICES));

  if (!configured) {
    config.plugins = (config.plugins || []).filter((p) => !isFirebasePlugin(p));
    return config;
  }

  config.android = {
    ...config.android,
    googleServicesFile: './' + GOOGLE_SERVICES,
  };
  return config;
};
