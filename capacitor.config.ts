import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.foodcue.app",
  appName: "FoodCue",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: false
  },
  plugins: {
    Camera: {
      presentationStyle: "fullscreen"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
