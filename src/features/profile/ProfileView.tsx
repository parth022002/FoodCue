import { useState, useEffect } from "react";
import {
  Show,
  SignInButton,
  SignOutButton,
  OrganizationSwitcher,
  useOrganization,
  useUser,
  useAuth
} from "@clerk/react";
import {
  ShieldAlert,
  Check,
  Trash2,
  Users,
  ShieldCheck,
  ShoppingCart,
  Refrigerator,
  LogIn,
  LogOut,
  Mail,
  Sliders,
  Cloud,
  Smartphone,
  RefreshCw
} from "lucide-react";
import { syncStatus } from "../../sync/state/syncStatus";
import { syncCoordinator } from "../../sync/engine/syncCoordinator";
import { SyncApiClient } from "../../sync/transport/syncApiClient";
import type { SyncDeviceRecord } from "../../sync/types/syncContracts";
import { MigrationWizard } from "../sync/MigrationWizard";

export interface UserFoodProfile {
  avoidAllergens: string[];
  avoidIngredients: string[];
  calmMode: boolean;
  dietaryPattern: string;
}

const COMMON_AVOID_ALLERGENS = [
  "Gluten / Wheat",
  "Milk / Dairy",
  "Peanuts",
  "Tree Nuts (Almonds, Cashews, Walnuts)",
  "Soy / Soybeans",
  "Egg",
  "Fish",
  "Crustaceans / Shellfish",
  "Sulphites (INS 220-223)",
  "Mustard"
];

const COMMON_AVOID_INGREDIENTS = [
  "Refined Palm Oil",
  "Added Sugars / High Fructose Corn Syrup",
  "Artificial Colours (INS 102, 110, 122)",
  "High Sodium / Salt",
  "Monosodium Glutamate (MSG / INS 621)",
  "Hydrogenated Vegetable Oils (Trans Fats)"
];

function MultiDeviceSyncSection({ onOpenMigration }: { onOpenMigration: () => void }) {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [syncState, setSyncState] = useState(syncStatus.getState());
  const [devices, setDevices] = useState<SyncDeviceRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = syncStatus.subscribe((s) => setSyncState(s));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;

    let mounted = true;

    const client = new SyncApiClient(async () => getToken());
    client
      .listDevices()
      .then((list) => {
        if (mounted) {
          setDevices(list);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [isSignedIn, getToken, syncState.status]);

  async function handleSyncNow() {
    setIsSyncing(true);
    try {
      await syncCoordinator.triggerSync();
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleRevoke(deviceId: string) {
    const client = new SyncApiClient(async () => getToken());
    const ok = await client.revokeDevice(deviceId);
    if (ok) {
      setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    }
  }

  const label = syncStatus.getConsumerLabel();

  return (
    <div className="profile-section-card mb-24">
      <div className="section-card-header">
        <div className="header-title-group">
          <div className="icon-pill bg-emerald-light">
            <Cloud className="pill-icon-svg text-emerald" aria-hidden="true" />
          </div>
          <div>
            <h3 className="section-card-title">Multi-Device Synchronisation</h3>
            <p className="tiny text-muted">
              Securely keep your kitchen inventory and verified labels updated across all your devices.
            </p>
          </div>
        </div>

        <Show when="signed-in">
          <div className="header-actions">
            {syncState.isCloudEnabled ? (
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                <RefreshCw className={`btn-icon-xs ${isSyncing ? "spin" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary-sm"
                onClick={onOpenMigration}
              >
                <Cloud className="btn-icon-xs" />
                <span>Enable Cloud Sync</span>
              </button>
            )}
          </div>
        </Show>
      </div>

      <div className="section-card-content mt-16">
        <div className="neon-status-card">
          <div className="status-indicator-row">
            <div className="status-flex">
              <span className={`status-bubble ${label.variant === "success" ? "bg-green" : "bg-gray"}`} />
              <div>
                <strong className="text-sm">{label.text}</strong>
                <div className="tiny text-muted">
                  {syncState.lastSyncTime
                    ? `Last synchronized: ${new Date(syncState.lastSyncTime).toLocaleTimeString()}`
                    : "Local-first storage active"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Show when="signed-in">
          {devices.length > 0 && (
            <div className="connected-devices-wrapper mt-16">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-8">
                Connected Devices ({devices.length})
              </h4>
              <div className="devices-container">
                {devices.map((dev) => (
                  <div key={dev.deviceId} className="device-card-row">
                    <div className="device-info-col">
                      <span className="device-name-text">
                        <Smartphone className="inline-icon mr-4" size={14} />
                        {dev.deviceName}
                        {dev.deviceId === syncState.deviceId && " (This Device)"}
                      </span>
                      <span className="device-meta-sub">
                        Last synced: {new Date(dev.lastSyncAt).toLocaleString()} • Version {dev.clientVersion}
                      </span>
                    </div>

                    {dev.deviceId !== syncState.deviceId && (
                      <button
                        type="button"
                        className="device-revoke-btn"
                        onClick={() => handleRevoke(dev.deviceId)}
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}

function HouseholdSharingSection() {
  const { organization, isLoaded } = useOrganization();
  const { user } = useUser();

  if (!isLoaded) return null;

  return (
    <div className="profile-section-card mb-24">
      <div className="section-card-header">
        <div className="header-title-group">
          <div className="icon-pill bg-brand-light">
            <Users className="pill-icon-svg text-brand" aria-hidden="true" />
          </div>
          <div>
            <h3 className="section-card-title">Household & Family Kitchen Sharing</h3>
            <p className="tiny text-muted">Collaborate with family members on a single shared kitchen inventory.</p>
          </div>
        </div>

        <Show when="signed-in">
          <div className="header-actions">
            <OrganizationSwitcher hidePersonal={false} />
          </div>
        </Show>
      </div>

      <div className="section-card-content mt-16">
        <Show when="signed-out">
          <div className="signed-out-callout">
            <p className="text-sm text-muted mb-16">
              You are currently using FoodCue in private, local-only mode. Sign in or create a free account to invite your family members, synchronize your shared kitchen pantry, and avoid duplicate grocery purchases.
            </p>
            <div className="callout-actions">
              <SignInButton mode="modal">
                <button type="button" className="btn-primary compact-btn">
                  <LogIn className="btn-icon" />
                  <span>Sign In to Enable Family Sharing</span>
                </button>
              </SignInButton>
            </div>
          </div>
        </Show>

        <Show when="signed-in">
          {organization ? (
            <div className="household-active-box mb-16">
              <div className="active-badge-row mb-8">
                <span className="household-live-tag">
                  <span className="live-dot" />
                  Active Household: <strong>{organization.name}</strong>
                </span>
                {organization.membersCount ? (
                  <span className="members-count-pill">
                    {organization.membersCount} {organization.membersCount === 1 ? "member" : "members"}
                  </span>
                ) : null}
              </div>
              <p className="tiny text-muted">
                Your pantry items and scan logs are synchronizing with all members of <strong>{organization.name}</strong>.
              </p>
            </div>
          ) : (
            <div className="household-personal-box mb-16">
              <p className="text-sm text-muted">
                You are currently in <strong>Personal Kitchen Mode</strong> ({user?.primaryEmailAddress?.emailAddress || "Signed In"}).
                Only you have access to your pantry ledger. Use the Household switcher above to create or join a family kitchen.
              </p>
            </div>
          )}

          <div className="features-value-grid">
            <div className="feature-mini-card">
              <Refrigerator className="mini-card-icon text-brand" />
              <div>
                <strong className="text-sm">Shared Pantry Stock</strong>
                <p className="tiny text-muted">Real-time ledger prevents duplicate grocery buys.</p>
              </div>
            </div>
            <div className="feature-mini-card">
              <ShoppingCart className="mini-card-icon text-lime" />
              <div>
                <strong className="text-sm">Collaborative Shopping</strong>
                <p className="tiny text-muted">Tick off groceries in real-time at the store.</p>
              </div>
            </div>
            <div className="feature-mini-card">
              <ShieldCheck className="mini-card-icon text-warning" />
              <div>
                <strong className="text-sm">Combined Avoid-List</strong>
                <p className="tiny text-muted">Cross-checks allergens for all household members.</p>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

export function ProfileView({
  onProfileChange
}: {
  onProfileChange: (profile: UserFoodProfile) => void;
}) {
  const { user, isSignedIn } = useUser();
  const [showMigrationWizard, setShowMigrationWizard] = useState(false);

  const [profile, setProfile] = useState<UserFoodProfile>(() => {
    try {
      const saved = localStorage.getItem("foodcue_profile");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      avoidAllergens: ["Peanuts"],
      avoidIngredients: ["Refined Palm Oil"],
      calmMode: false,
      dietaryPattern: "Standard"
    };
  });

  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    localStorage.setItem("foodcue_profile", JSON.stringify(profile));
    onProfileChange(profile);
  }, [profile, onProfileChange]);

  function toggleAllergen(name: string) {
    setProfile((prev) => ({
      ...prev,
      avoidAllergens: prev.avoidAllergens.includes(name)
        ? prev.avoidAllergens.filter((a) => a !== name)
        : [...prev.avoidAllergens, name]
    }));
    triggerNotice();
  }

  function toggleIngredient(name: string) {
    setProfile((prev) => ({
      ...prev,
      avoidIngredients: prev.avoidIngredients.includes(name)
        ? prev.avoidIngredients.filter((i) => i !== name)
        : [...prev.avoidIngredients, name]
    }));
    triggerNotice();
  }

  function triggerNotice() {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  }

  function clearAllPreferences() {
    setProfile({
      avoidAllergens: [],
      avoidIngredients: [],
      calmMode: false,
      dietaryPattern: "Standard"
    });
    triggerNotice();
  }

  const userDisplayName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Guest User";

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userInitials =
    (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "") ||
    userDisplayName[0]?.toUpperCase() ||
    "G";

  return (
    <div className="profile-view-container" aria-labelledby="profile-main-title">
      {/* Toast Notice */}
      {savedNotice && (
        <div className="toast-notification" role="status">
          <Check className="toast-icon" />
          <span>Dietary preferences updated locally!</span>
        </div>
      )}

      {/* Account Identity Card */}
      <div className="profile-hero-card mb-24">
        <div className="profile-hero-flex">
          <div className="profile-avatar-wrapper">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={userDisplayName} className="hero-avatar-img" />
            ) : (
              <div className="hero-avatar-initials">{userInitials}</div>
            )}
          </div>

          <div className="profile-hero-info">
            <div className="user-badge-row">
              <span className={`user-status-pill ${isSignedIn ? "signed-in-pill" : "local-mode-pill"}`}>
                <span className="dot" />
                {isSignedIn ? "Clerk Verified Account" : "Local-Only Anonymous Mode"}
              </span>
            </div>

            <h1 id="profile-main-title" className="profile-user-name">
              {userDisplayName}
            </h1>

            {userEmail ? (
              <p className="profile-user-email">
                <Mail className="inline-icon" /> {userEmail}
              </p>
            ) : (
              <p className="profile-guest-note">
                Operating with local storage only. No email or cloud account connected.
              </p>
            )}
          </div>

          <div className="profile-hero-action">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button type="button" className="btn-primary">
                  <LogIn className="btn-icon" />
                  <span>Sign In / Register</span>
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <SignOutButton>
                <button type="button" className="btn-outline">
                  <LogOut className="btn-icon" />
                  <span>Sign Out</span>
                </button>
              </SignOutButton>
            </Show>
          </div>
        </div>
      </div>

      {/* Household & Family Sharing Section */}
      <HouseholdSharingSection />

      {/* Multi-Device Cloud Sync Section */}
      <MultiDeviceSyncSection onOpenMigration={() => setShowMigrationWizard(true)} />

      {/* Food Safety & Dietary Avoid-List Card */}
      <section className="profile-section-card mb-24" aria-labelledby="dietary-heading">
        <div className="section-card-header">
          <div className="header-title-group">
            <div className="icon-pill bg-brand-light">
              <ShieldAlert className="pill-icon-svg text-brand" aria-hidden="true" />
            </div>
            <div>
              <h2 id="dietary-heading" className="section-card-title">
                Food Safety Avoid-List & Allergen Alerts
              </h2>
              <p className="tiny text-muted">
                FoodCue highlights these ingredients and allergens during SmartScan label analysis.
              </p>
            </div>
          </div>

          <span className="local-pill">
            <span className="dot" /> Stored locally
          </span>
        </div>

        <div className="section-card-content mt-20">
          {/* Allergens to Avoid */}
          <div className="preference-group mb-24">
            <h4 className="preference-group-title">
              FSSAI Mandatory Allergens to Flag:
            </h4>
            <div className="chips-container mt-10">
              {COMMON_AVOID_ALLERGENS.map((allergen) => {
                const isSelected = profile.avoidAllergens.includes(allergen);
                return (
                  <button
                    key={allergen}
                    type="button"
                    className={`preference-chip ${isSelected ? "selected-allergen" : ""}`}
                    onClick={() => toggleAllergen(allergen)}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <Check className="chip-check-icon" />}
                    <span>{allergen}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ingredients to Avoid */}
          <div className="preference-group mb-24">
            <h4 className="preference-group-title">
              Ingredients & Additives to Flag:
            </h4>
            <div className="chips-container mt-10">
              {COMMON_AVOID_INGREDIENTS.map((ing) => {
                const isSelected = profile.avoidIngredients.includes(ing);
                return (
                  <button
                    key={ing}
                    type="button"
                    className={`preference-chip ${isSelected ? "selected-ingredient" : ""}`}
                    onClick={() => toggleIngredient(ing)}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <Check className="chip-check-icon" />}
                    <span>{ing}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calm Mode Switch */}
          <div className="calm-mode-row mt-20">
            <div className="calm-mode-info">
              <div className="calm-mode-label-row">
                <Sliders className="inline-icon text-brand" />
                <strong className="text-sm">Calm Visual Mode</strong>
              </div>
              <p className="tiny text-muted">
                Suppresses bright red emergency badges in favour of calm neutral indicators to reduce food anxiety.
              </p>
            </div>

            <button
              type="button"
              className={`toggle-switch-btn ${profile.calmMode ? "active" : ""}`}
              onClick={() => {
                setProfile((p) => ({ ...p, calmMode: !p.calmMode }));
                triggerNotice();
              }}
              role="switch"
              aria-checked={profile.calmMode}
              aria-label="Toggle Calm Visual Mode"
            >
              <span className="toggle-switch-slider" />
            </button>
          </div>

          {/* Clear preferences button */}
          <div className="section-card-footer mt-24">
            <button
              type="button"
              className="btn-ghost-sm text-muted"
              onClick={clearAllPreferences}
            >
              <Trash2 className="btn-icon-xs" />
              <span>Reset All Avoidance Filters</span>
            </button>
          </div>
        </div>
      </section>

      {/* Migration Wizard Modal */}
      <MigrationWizard
        isOpen={showMigrationWizard}
        onClose={() => setShowMigrationWizard(false)}
        onComplete={() => setShowMigrationWizard(false)}
      />
    </div>
  );
}
