/**
 * FoodCue Household Collaboration & Sharing Manager
 * Supports multi-tenant shared kitchens, role-based access control (RBAC),
 * cryptographic invitations, and explicit personal sharing permissions.
 */

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  ArrowRightLeft,
  Check,
  AlertTriangle,
  X,
  Copy,
  ShieldCheck,
  Trash2
} from "lucide-react";
import type {
  HouseholdRecord,
  HouseholdMemberRole,
  HouseholdMemberWithProfile,
  HouseholdInvitationRecord
} from "../../server/database/repositories/household.repository";
import type { OnboardingApiClient } from "../../services/onboardingApiClient";

interface HouseholdManagerProps {
  apiClient: OnboardingApiClient;
  currentHousehold: HouseholdRecord | null;
  onSelectHousehold: (household: HouseholdRecord | null) => void;
  onClose?: () => void;
  localItemCount?: number;
}

export const HouseholdManager: React.FC<HouseholdManagerProps> = ({
  apiClient,
  currentHousehold,
  onSelectHousehold,
  onClose,
  localItemCount = 0
}) => {
  const [households, setHouseholds] = useState<Array<HouseholdRecord & { userRole: HouseholdMemberRole; memberCount: number }>>([]);
  const [_loading, setLoading] = useState(true);

  // Active household detailed info
  const [members, setMembers] = useState<HouseholdMemberWithProfile[]>([]);
  const [invitations, setInvitations] = useState<HouseholdInvitationRecord[]>([]);
  const [userRole, setUserRole] = useState<HouseholdMemberRole>("member");

  // Sharing preferences
  const [shareAllergies, setShareAllergies] = useState(false);
  const [shareDiet, setShareDiet] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdMemberRole>("member");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Create household modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHhName, setNewHhName] = useState("");
  const [newHhType, setNewHhType] = useState("Family");

  // Migration Preview Dialog State
  const [pendingTargetHousehold, setPendingTargetHousehold] = useState<HouseholdRecord | null>(null);

  useEffect(() => {
    loadUserHouseholds();
  }, []);

  useEffect(() => {
    if (currentHousehold) {
      loadHouseholdDetails(currentHousehold.id);
    } else {
      setMembers([]);
      setInvitations([]);
    }
  }, [currentHousehold]);

  async function loadUserHouseholds() {
    setLoading(true);
    try {
      const list = await apiClient.listHouseholds();
      setHouseholds(list);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  async function loadHouseholdDetails(hhId: string) {
    try {
      const details = await apiClient.getHouseholdDetails(hhId);
      setMembers(details.members);
      setInvitations(details.invitations);
      setUserRole(details.userRole);

      // Load sharing preferences
      const prefs = await apiClient.getSharingPreferences(hhId);
      const allergyPref = prefs.find((p) => p.informationCategory === "allergies");
      const dietPref = prefs.find((p) => p.informationCategory === "dietary_preferences");
      setShareAllergies(Boolean(allergyPref?.sharingEnabled));
      setShareDiet(Boolean(dietPref?.sharingEnabled));
    } catch {
      // Silent error handling for graceful fallback
    }
  }

  function handleInitiateSwitch(target: HouseholdRecord | null) {
    if (target && !currentHousehold && localItemCount > 0) {
      setPendingTargetHousehold(target);
    } else {
      onSelectHousehold(target);
    }
  }

  function handleConfirmSwitch() {
    if (pendingTargetHousehold) {
      onSelectHousehold(pendingTargetHousehold);
      setPendingTargetHousehold(null);
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!currentHousehold || !inviteEmail.trim()) return;

    setInviteStatus("Generating invitation link...");
    try {
      const res = await apiClient.createInvitation({
        householdId: currentHousehold.id,
        email: inviteEmail.trim(),
        role: inviteRole
      });

      const fullUrl = `${window.location.origin}${res.inviteUrl}`;
      setGeneratedInviteLink(fullUrl);
      setInviteStatus("Invitation created!");
      setInviteEmail("");

      // Refresh invitations list
      loadHouseholdDetails(currentHousehold.id);
    } catch (err) {
      setInviteStatus(err instanceof Error ? err.message : "Failed to send invitation.");
    }
  }

  async function handleRevokeInvitation(invId: string) {
    if (!currentHousehold) return;
    const ok = await apiClient.revokeInvitation(invId);
    if (ok) {
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
    }
  }

  async function handleToggleSharing(category: "allergies" | "dietary_preferences", newValue: boolean) {
    if (!currentHousehold) return;
    if (category === "allergies") setShareAllergies(newValue);
    if (category === "dietary_preferences") setShareDiet(newValue);

    await apiClient.setSharingPreference(currentHousehold.id, category, newValue);
    loadHouseholdDetails(currentHousehold.id);
  }

  async function handleCreateNewHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!newHhName.trim()) return;

    try {
      const created = await apiClient.createHousehold({
        name: newHhName.trim(),
        householdType: newHhType
      });
      setShowCreateModal(false);
      setNewHhName("");
      await loadUserHouseholds();
      onSelectHousehold(created);
    } catch {
      // Handle error
    }
  }

  return (
    <div
      className="household-manager-container"
      role="region"
      aria-label="Household Sharing & Member Management"
    >
      {/* Header */}
      <div className="manager-header-row">
        <div className="flex items-center gap-3">
          <div className="icon-pill-header bg-indigo-50 text-indigo-700">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="manager-title">Household & Kitchen Sharing</h3>
            <p className="manager-subtitle">Collaborate on kitchen inventory and grocery shopping with your family.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-create-hh"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            <span>New Household</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-done"
              aria-label="Close household manager"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Active Workspace Banner */}
      <div className="active-workspace-card">
        <div className="workspace-top-row">
          <span className="workspace-label">Current Active Kitchen:</span>
          <span className={`status-pill ${currentHousehold ? "household-mode" : "personal-mode"}`}>
            {currentHousehold ? `ROLE: ${userRole.toUpperCase()}` : "INDIVIDUAL MODE"}
          </span>
        </div>

        <div className="workspace-name">
          {currentHousehold ? currentHousehold.name : "Personal Kitchen (Private to You)"}
        </div>

        <p className="workspace-explanation">
          {currentHousehold
            ? `Synchronizing with ${members.length} member${members.length === 1 ? "" : "s"}. Added food packages sync to this household.`
            : "Visible only on this account. Food packages and pantry items are stored privately."}
        </p>
      </div>

      {/* Workspace Switcher */}
      <div className="workspace-switcher-section">
        <label className="section-label flex items-center gap-1.5">
          <ArrowRightLeft className="w-4 h-4 text-muted" aria-hidden="true" />
          <span>Switch Active Kitchen Workspace:</span>
        </label>

        <div className="switch-options-list">
          {/* Option 1: Personal Kitchen */}
          <button
            type="button"
            onClick={() => handleInitiateSwitch(null)}
            className={`switch-option-card ${!currentHousehold ? "active" : ""}`}
          >
            <div>
              <div className="option-title">Personal Kitchen</div>
              <div className="option-sub">Private inventory ledger</div>
            </div>
            {!currentHousehold && <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />}
          </button>

          {/* Option 2: All Available Households */}
          {households.map((hh) => (
            <button
              key={hh.id}
              type="button"
              onClick={() => handleInitiateSwitch(hh)}
              className={`switch-option-card ${currentHousehold?.id === hh.id ? "active" : ""}`}
            >
              <div>
                <div className="option-title">{hh.name}</div>
                <div className="option-sub">
                  {hh.memberCount} member{hh.memberCount === 1 ? "" : "s"} • {hh.householdType}
                </div>
              </div>
              {currentHousehold?.id === hh.id && <Check className="w-4 h-4 text-indigo-600" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>

      {/* When a Household is Active: Members, Invites, and Sharing Controls */}
      {currentHousehold && (
        <div className="household-details-panel">
          {/* Members Roster */}
          <div className="panel-subblock">
            <div className="subblock-header flex items-center justify-between">
              <span className="subblock-title">Household Members ({members.length})</span>
              {(userRole === "owner" || userRole === "admin") && (
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(true);
                    setGeneratedInviteLink(null);
                    setInviteStatus(null);
                  }}
                  className="btn-invite-text"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  <span>Invite Family Member</span>
                </button>
              )}
            </div>

            <div className="members-list mt-8">
              {members.map((m) => (
                <div key={m.id} className="member-card-row">
                  <div className="member-info-col">
                    <div className="member-name-row">
                      <strong className="member-name">{m.fullName}</strong>
                      <span className="role-badge">{m.role}</span>
                    </div>
                    <div className="member-shared-info">
                      {m.sharedDietaryPattern && (
                        <span className="shared-pill">Diet: {m.sharedDietaryPattern}</span>
                      )}
                      {m.sharedAllergies && m.sharedAllergies.length > 0 ? (
                        <span className="shared-pill alert">Avoiding: {m.sharedAllergies.join(", ")}</span>
                      ) : (
                        <span className="shared-pill neutral">No shared allergies</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invitations (for Admin/Owner) */}
          {invitations.length > 0 && (userRole === "owner" || userRole === "admin") && (
            <div className="panel-subblock mt-16">
              <span className="subblock-title">Pending Invitations ({invitations.length})</span>
              <div className="invitations-list mt-8">
                {invitations.map((inv) => (
                  <div key={inv.id} className="invitation-card-row">
                    <div className="inv-info">
                      <div className="inv-email">{inv.inviteeEmail}</div>
                      <div className="inv-meta">Role: {inv.role} • Expires in {Math.max(1, Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days</div>
                    </div>
                    <button
                      type="button"
                      className="btn-revoke"
                      onClick={() => handleRevokeInvitation(inv.id)}
                      title="Revoke invitation"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      <span>Revoke</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explicit Personal Sharing Controls Scoped to this Household */}
          <div className="panel-subblock mt-16 privacy-box">
            <div className="flex items-center gap-2 mb-8">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <strong className="text-xs uppercase tracking-wider text-slate-700">
                Your Personal Sharing Controls in {currentHousehold.name}:
              </strong>
            </div>
            <p className="tiny text-muted mb-12">
              FoodCue keeps your dietary patterns and allergies strictly private by default. Choose what you want members of this household to see:
            </p>

            <div className="sharing-switches-stack">
              <label className="sharing-switch-row">
                <input
                  type="checkbox"
                  checked={shareDiet}
                  onChange={(e) => handleToggleSharing("dietary_preferences", e.target.checked)}
                />
                <div>
                  <span className="font-medium text-xs">Share My Dietary Pattern</span>
                  <span className="tiny text-muted block">Members see whether you are Vegetarian, Vegan, Jain, etc.</span>
                </div>
              </label>

              <label className="sharing-switch-row">
                <input
                  type="checkbox"
                  checked={shareAllergies}
                  onChange={(e) => handleToggleSharing("allergies", e.target.checked)}
                />
                <div>
                  <span className="font-medium text-xs">Share My Food Allergens List</span>
                  <span className="tiny text-muted block">Household inventory cross-checks against your declared allergens to keep you safe.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Migration Preview Dialog */}
      {pendingTargetHousehold && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="flex items-start gap-3">
              <div className="icon-pill-header bg-amber-50 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Switch to {pendingTargetHousehold.name}?</h4>
                <p className="text-xs text-muted mt-1">
                  You have {localItemCount} item{localItemCount === 1 ? "" : "s"} in your personal kitchen. Your personal items remain safe and private.
                </p>
              </div>
            </div>

            <div className="modal-actions-row mt-16">
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => setPendingTargetHousehold(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary-sm"
                onClick={handleConfirmSwitch}
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h4 className="font-semibold text-sm">Invite Member to {currentHousehold?.name}</h4>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowInviteModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!generatedInviteLink ? (
              <form onSubmit={handleSendInvite} className="mt-12 space-y-3">
                <div>
                  <label className="field-label required">Member Email</label>
                  <input
                    type="email"
                    required
                    placeholder="family.member@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input-text"
                  />
                </div>

                <div>
                  <label className="field-label">Assigned Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as HouseholdMemberRole)}
                    className="input-select"
                  >
                    <option value="member">Member (Can Edit Inventory & Shopping)</option>
                    <option value="viewer">Viewer (Read-Only Access)</option>
                    <option value="admin">Admin (Can Manage Members)</option>
                  </select>
                </div>

                {inviteStatus && <div className="status-msg text-xs text-muted">{inviteStatus}</div>}

                <div className="modal-actions-row">
                  <button type="button" className="btn-secondary-sm" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary-sm">
                    Generate Invitation
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-12 space-y-3">
                <p className="text-xs text-muted">
                  Share this invitation link with your family member. It expires in 7 days:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteLink}
                    className="input-text text-xs"
                  />
                  <button
                    type="button"
                    className="btn-copy"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="btn-primary-sm full-width"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New Household Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h4 className="font-semibold text-sm">Create a New Household</h4>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewHousehold} className="mt-12 space-y-3">
              <div>
                <label className="field-label required">Household Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verma Family Kitchen"
                  value={newHhName}
                  onChange={(e) => setNewHhName(e.target.value)}
                  className="input-text"
                />
              </div>

              <div>
                <label className="field-label">Type</label>
                <select
                  value={newHhType}
                  onChange={(e) => setNewHhType(e.target.value)}
                  className="input-select"
                >
                  <option value="Family">Family Kitchen</option>
                  <option value="Shared Flat">Shared Flat / Roommates</option>
                  <option value="Friends">Friends / Community</option>
                </select>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-sm">
                  Create Household
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
