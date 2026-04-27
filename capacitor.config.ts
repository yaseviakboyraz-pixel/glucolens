import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.glucolens.app',
  appName: 'GlucoLens',
  webDir: 'out',
  // In production, load from Vercel
  server: {
    url: 'https://glucolens-nine.vercel.app',
    cleartext: false,
  },
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
