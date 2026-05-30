import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: process.env['APP_ID'] || 'io.ionic.starter',
  appName: 'BeSeen',
  webDir: 'www',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
      webClientId: process.env['GOOGLE_WEB_CLIENT_ID'] || '304753853961-jp8gqjgmtltheqn16nvell5i3os6k4aq.apps.googleusercontent.com'
    }
  }
};

export default config;
