import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Home,
  Check,
  Copy,
  ArrowRight,
  ShieldCheck,
  Lock,
  AlertTriangle
} from "lucide-react";
import type { OnboardingApiClient } from "../../services/onboardingApiClient";
import type { HouseholdRecord, HouseholdMemberRole } from "../../server/database/repositories/household.repository";

interface HouseholdOnboardingModalProps {
  apiClient: OnboardingApiClient;
  onComplete: (household: HouseholdRecord | null) => void;
}

export const HouseholdOnboardingModal: React.FC<HouseholdOnboardingModalProps> = ({
  apiClient,
  onComplete
}) => {
  const [mode, setMode] = useState<"choose" | "create">("choose");

  // Household fields
  const [householdName, setHouseholdName] = useState("");
  const [householdType, setHouseholdType] = useState("Family");
  const [description, setDescription] = useState("");

  // Invite member fields
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdMemberRole>("member");
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sharing controls
  const [shareDietary, setShareDietary] = useState(false);
  const [shareAllergies, setShareAllergies] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdHousehold, setCreatedHousehold] = useState<HouseholdRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Option B: Skip household creation and continue individually
  async function handleContinueIndividually() {
    setIsSubmitting(true);
    try {
      await apiClient.saveProfile({
        onboardingStatus: "ONBOARDING_COMPLETED"
      });
      onComplete(null);
    } catch {
      onComplete(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Option A: Submit household creation
  async function handleCreateHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!householdName.trim()) {
      setErrorMessage("Please enter a name for your household.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const hh = await apiClient.createHousehold({
        name: householdName.trim(),
        householdType,
        description: description.trim() || undefined
      });

      setCreatedHousehold(hh);

      // Save sharing preferences if user enabled them
      if (shareDietary) {
        await apiClient.setSharingPreference(hh.id, "dietary_preferences", true).catch(() => {});
      }
      if (shareAllergies) {
        await apiClient.setSharingPreference(hh.id, "allergies", true).catch(() => {});
      }

      // If an invite email was filled in, send invitation
      if (inviteEmail.trim()) {
        try {
          const invResult = await apiClient.createInvitation({
            householdId: hh.id,
            email: inviteEmail.trim(),
            role: inviteRole
          });
          const fullUrl = `${window.location.origin}${invResult.inviteUrl}`;
          setGeneratedInviteLink(fullUrl);
        } catch {
          // Invitation failure shouldn't block household creation
        }
      }

      // Finalize onboarding status
      await apiClient.saveProfile({
        onboardingStatus: "ONBOARDING_COMPLETED"
      });

      // If no invite link was generated, finish immediately
      if (!inviteEmail.trim()) {
        onComplete(hh);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create household.");
      setIsSubmitting(false);
    }
  }

  function handleCopyInviteLink() {
    if (!generatedInviteLink) return;
    navigator.clipboard.writeText(generatedInviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="household-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="hh-onboarding-title">
      <div className="household-onboarding-card">
        {/* Header */}
        <div className="hh-modal-header">
          <div className="icon-pill-lg bg-indigo-50 text-indigo-600">
            <Users className="icon-lg" />
          </div>
          <h2 id="hh-onboarding-title" className="hh-modal-title">
            Make Your Kitchen a Shared Experience
          </h2>
          <p className="hh-modal-subtitle">
            Invite your family and friends to your FoodCue household. Share kitchen inventory, coordinate grocery shopping lists, and manage food preferences together.
          </p>
        </div>

        {errorMessage && (
          <div className="hh-alert-error" role="alert">
            <AlertTriangle className="alert-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: CHOOSE PATHWAY */}
        {mode === "choose" && (
          <div className="hh-choice-container">
            <div className="hh-choice-grid">
              {/* Card 1: Create Household & Invite */}
              <button
                type="button"
                className="hh-choice-box recommended"
                onClick={() => setMode("create")}
              >
                <div className="choice-badge">Recommended for Families</div>
                <div className="choice-icon-wrap bg-indigo-100 text-indigo-700">
                  <UserPlus className="icon-md" />
                </div>
                <h3 className="choice-heading">Create Household & Invite Members</h3>
                <p className="choice-desc">
                  Set up a shared kitchen workspace for your family or flatmates with live inventory sync, shared shopping lists, and cross-checked food safety.
                </p>
                <div className="choice-action-link text-indigo-600">
                  <span>Get Started with Family Sharing</span>
                  <ArrowRight className="tiny-icon" />
                </div>
              </button>

              {/* Card 2: Continue Individually */}
              <button
                type="button"
                className="hh-choice-box"
                onClick={handleContinueIndividually}
                disabled={isSubmitting}
              >
                <div className="choice-icon-wrap bg-slate-100 text-slate-700">
                  <Home className="icon-md" />
                </div>
                <h3 className="choice-heading">Continue Without Inviting Anyone</h3>
                <p className="choice-desc">
                  Manage your food inventory and dietary preferences independently. You can always create or join a household later from your profile.
                </p>
                <div className="choice-action-link text-slate-600">
                  <span>Enter Personal Kitchen</span>
                  <ArrowRight className="tiny-icon" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CREATE HOUSEHOLD FORM */}
        {mode === "create" && !generatedInviteLink && (
          <form onSubmit={handleCreateHousehold} className="hh-form-body">
            <div className="hh-form-grid">
              <div className="form-field full-width">
                <label htmlFor="hh-name" className="field-label required">Household Name</label>
                <input
                  id="hh-name"
                  type="text"
                  required
                  placeholder="e.g. Sharma Family Kitchen or Flat 402"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="input-text"
                />
              </div>

              <div className="form-field">
                <label htmlFor="hh-type" className="field-label">Household Type</label>
                <select
                  id="hh-type"
                  value={householdType}
                  onChange={(e) => setHouseholdType(e.target.value)}
                  className="input-select"
                >
                  <option value="Family">Family Kitchen</option>
                  <option value="Shared Flat">Shared Flat / Roommates</option>
                  <option value="Friends">Friends / Community</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="hh-desc" className="field-label">Description (Optional)</label>
                <input
                  id="hh-desc"
                  type="text"
                  placeholder="e.g. Shared refrigerator and weekly groceries"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-text"
                />
              </div>
            </div>

            {/* Invite Family Member */}
            <div className="hh-invite-subblock mt-20">
              <h4 className="subblock-title flex items-center gap-2">
                <UserPlus className="tiny-icon text-indigo-600" />
                <span>Invite Your First Member (Optional):</span>
              </h4>
              <div className="invite-input-row mt-8">
                <input
                  type="email"
                  placeholder="family.member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-text"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as HouseholdMemberRole)}
                  className="input-select role-select"
                >
                  <option value="member">Member (Can Edit Inventory)</option>
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="admin">Admin (Can Manage Members)</option>
                </select>
              </div>
            </div>

            {/* Explicit Privacy & Sharing Controls */}
            <div className="hh-privacy-subblock mt-20">
              <h4 className="subblock-title flex items-center gap-2">
                <ShieldCheck className="tiny-icon text-brand-green" />
                <span>Explicit Information Sharing Controls:</span>
              </h4>
              <p className="tiny text-muted mb-8">
                Your personal preferences and allergy records remain private by default. You control what your household can see.
              </p>

              <div className="sharing-toggles-list">
                <label className="sharing-toggle-row">
                  <input
                    type="checkbox"
                    checked={shareDietary}
                    onChange={(e) => setShareDietary(e.target.checked)}
                  />
                  <div>
                    <strong>Share Dietary Preferences</strong>
                    <span className="tiny-desc">Allow household members to see your dietary pattern (e.g. Vegetarian).</span>
                  </div>
                </label>

                <label className="sharing-toggle-row">
                  <input
                    type="checkbox"
                    checked={shareAllergies}
                    onChange={(e) => setShareAllergies(e.target.checked)}
                  />
                  <div>
                    <strong>Share Food Allergy Flagged List</strong>
                    <span className="tiny-desc">Allow household members to view your declared allergens when checking groceries.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="hh-footer-buttons mt-24">
              <button
                type="button"
                className="btn-secondary-back"
                onClick={() => setMode("choose")}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn-primary-confirm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>Setting Up Household...</span>
                ) : (
                  <>
                    <span>Create Household & Continue</span>
                    <ArrowRight className="btn-icon" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: INVITATION READY SCREEN */}
        {generatedInviteLink && createdHousehold && (
          <div className="hh-invite-success-body">
            <div className="success-banner">
              <div className="icon-pill-lg bg-emerald-100 text-emerald-800">
                <Check className="icon-lg" />
              </div>
              <h3 className="success-title">{createdHousehold.name} Created Successfully!</h3>
              <p className="success-desc">
                Your household is ready. Share the invitation link below with your family member:
              </p>
            </div>

            <div className="invite-link-copy-box mt-16">
              <input
                type="text"
                readOnly
                value={generatedInviteLink}
                className="input-text link-input"
              />
              <button
                type="button"
                className="btn-copy-link"
                onClick={handleCopyInviteLink}
              >
                {copiedLink ? (
                  <>
                    <Check className="btn-icon" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="btn-icon" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="invite-security-notice mt-16">
              <Lock className="tiny-icon text-muted" />
              <span>
                This single-use invitation link expires in 7 days and requires server verification before granting household access.
              </span>
            </div>

            <div className="hh-footer-buttons mt-24">
              <button
                type="button"
                className="btn-primary-confirm full-width"
                onClick={() => onComplete(createdHousehold)}
              >
                <span>Enter Your Household Dashboard</span>
                <ArrowRight className="btn-icon" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
