import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.glucolens.app',
  appName: 'GlucoLens',
  // The web layer ships INSIDE the app (npm run build:native -> out/), so the
  // UI opens with no network and does not die if Vercel is unreachable. API
  // calls still go out to the deployed backend via src/lib/api.ts.
  webDir: 'out',
  // Opt-in live reload for development only:
  //   CAP_SERVER_URL=http://192.168.1.x:3000 npx cap run ios
  // Never set this for a release build — it would make the app load its UI from
  // the network again, which is exactly what we moved away from.
  ...(process.env.CAP_SERVER_URL
    ? { server: { url: process.env.CAP_SERVER_URL, cleartext: true } }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#030712',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#030712',
    },
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#030712',
  },
  android: {
    backgroundColor: '#030712',
  },
};

export default config;
