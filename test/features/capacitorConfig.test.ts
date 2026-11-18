import { describe, it, expect } from "vitest";
import capacitorConfig from "../../capacitor.config";
import fs from "node:fs";
import path from "node:path";

describe("Phase 11: Native Android and iOS Capacitor Architecture", () => {
  it("configures standard FoodCue appId and appName in capacitor.config.ts", () => {
    expect(capacitorConfig.appId).toBe("com.foodcue.app");
    expect(capacitorConfig.appName).toBe("FoodCue");
    expect(capacitorConfig.webDir).toBe("dist");
    expect(capacitorConfig.server?.androidScheme).toBe("https");
  });

  it("verifies Android native project scaffolding exists with necessary permissions", () => {
    const androidManifestPath = path.resolve(process.cwd(), "android/app/src/main/AndroidManifest.xml");
    expect(fs.existsSync(androidManifestPath)).toBe(true);

    const manifestContent = fs.readFileSync(androidManifestPath, "utf-8");
    expect(manifestContent).toContain("android.permission.INTERNET");
    expect(manifestContent).toContain("android.permission.CAMERA");
    expect(manifestContent).toContain("android.permission.POST_NOTIFICATIONS");
    expect(manifestContent).toContain("android.permission.FLASHLIGHT");
  });

  it("verifies iOS native project scaffolding exists with usage descriptions in Info.plist", () => {
    const iosInfoPlist = path.resolve(process.cwd(), "ios/App/App/Info.plist");
    expect(fs.existsSync(iosInfoPlist)).toBe(true);

    const plistContent = fs.readFileSync(iosInfoPlist, "utf-8");
    expect(plistContent).toContain("NSCameraUsageDescription");
    expect(plistContent).toContain("NSPhotoLibraryUsageDescription");
    expect(plistContent).toContain("<string>FoodCue</string>");
  });
});
