import type { CapacitorConfig } from '@capacitor/cli';

const IS_PROD = process.argv.includes('prod');

const config: CapacitorConfig = {
  appId: IS_PROD ? 'com.beseen.app.official' : 'io.ionic.starter',
  appName: 'BeSeen',
  webDir: 'www',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
      webClientId: IS_PROD 
        ? '950779319104-1l56pob9dmnf2bkln5ap3ah961cemnrq.apps.googleusercontent.com' 
        : '304753853961-jp8gqjgmtltheqn16nvell5i3os6k4aq.apps.googleusercontent.com'
    }
  }
};

export default config;
