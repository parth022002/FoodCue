import React, { useState, useEffect } from "react";
import {
  Users,
  X,
  Copy,
  Check,
  Send,
  Share2,
  Mail,
  MessageCircle,
  MessageSquare,
  Shield,
  Trash2,
  AlertTriangle,
  Sparkles,
  UserPlus
} from "lucide-react";
import type {
  HouseholdRecord,
  HouseholdMemberRole,
  HouseholdInvitationRecord
} from "../../server/database/repositories/household.repository";
import type { OnboardingApiClient } from "../../services/onboardingApiClient";

interface HouseholdInviteModalProps {
  apiClient: OnboardingApiClient;
  currentHousehold: HouseholdRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onHouseholdCreated?: (household: HouseholdRecord) => void;
}

export const HouseholdInviteModal: React.FC<HouseholdInviteModalProps> = ({
  apiClient,
  currentHousehold,
  isOpen,
  onClose,
  onHouseholdCreated
}) => {
  // Invitee details
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdMemberRole>("member");
  const [personalMessage, setPersonalMessage] = useState(
    "Join my FoodCue household! Let's manage our kitchen inventory, coordinate shopping lists, and stay organized together."
  );

  // Link generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pending invitations list
  const [pendingInvites, setPendingInvites] = useState<HouseholdInvitationRecord[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Solo mode household creation
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [createHhError, setCreateHhError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentHousehold) {
      loadPendingInvites(currentHousehold.id);
    }
  }, [isOpen, currentHousehold]);

  async function loadPendingInvites(hhId: string) {
    setLoadingInvites(true);
    try {
      const details = await apiClient.getHouseholdDetails(hhId);
      setPendingInvites(details.invitations.filter((i) => i.status === "pending"));
    } catch {
      // Graceful fallback
    } finally {
      setLoadingInvites(false);
    }
  }

  async function handleCreateHousehold() {
    if (!newHouseholdName.trim()) {
      setCreateHhError("Please enter a name for your household.");
      return;
    }

    setIsCreatingHousehold(true);
    setCreateHhError(null);
    try {
      const created = await apiClient.createHousehold({
        name: newHouseholdName.trim(),
        householdType: "Family"
      });
      if (onHouseholdCreated) {
        onHouseholdCreated(created);
      }
    } catch (err) {
      setCreateHhError(err instanceof Error ? err.message : "Failed to create household.");
    } finally {
      setIsCreatingHousehold(false);
    }
  }

  async function handleGenerateLink() {
    if (!currentHousehold) return;

    setIsGenerating(true);
    setErrorMsg(null);
    setCopiedLink(false);

    try {
      const result = await apiClient.createInvitation({
        householdId: currentHousehold.id,
        email: inviteEmail.trim() || undefined,
        role: inviteRole
      });

      const fullUrl = `${window.location.origin}${result.inviteUrl}`;
      setGeneratedInviteUrl(fullUrl);

      // Refresh pending invitations
      loadPendingInvites(currentHousehold.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate invitation link.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyLink() {
    if (!generatedInviteUrl) return;

    try {
      await navigator.clipboard.writeText(generatedInviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setErrorMsg("Unable to copy automatically. Please copy the URL manually.");
    }
  }

  async function handleRevoke(invitationId: string) {
    if (!currentHousehold) return;
    setRevokingId(invitationId);
    try {
      const ok = await apiClient.revokeInvitation(invitationId);
      if (ok) {
        setPendingInvites((prev) => prev.filter((i) => i.id !== invitationId));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to revoke invitation.");
    } finally {
      setRevokingId(null);
    }
  }

  // Social Sharing Handlers
  const shareText = `${personalMessage} Accept your invitation here: ${generatedInviteUrl || ""}`;

  function handleShareWhatsApp() {
    if (!generatedInviteUrl) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleShareTelegram() {
    if (!generatedInviteUrl) return;
    const url = `https://t.me/share/url?url=${encodeURIComponent(generatedInviteUrl)}&text=${encodeURIComponent(personalMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleShareEmail() {
    if (!generatedInviteUrl) return;
    const subject = `Join my FoodCue household (${currentHousehold?.name || "Kitchen"})`;
    const body = `${personalMessage}\n\nJoin here: ${generatedInviteUrl}`;
    const url = `mailto:${encodeURIComponent(inviteEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  function handleShareSMS() {
    if (!generatedInviteUrl) return;
    const url = `sms:?body=${encodeURIComponent(shareText)}`;
    window.location.href = url;
  }

  async function handleNativeShare() {
    if (!generatedInviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my FoodCue household: ${currentHousehold?.name || "Kitchen"}`,
          text: personalMessage,
          url: generatedInviteUrl
        });
      } catch {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
      <div className="modal-dialog-large household-invite-dialog">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="icon-pill-lg bg-emerald-100 text-brand-green">
              <UserPlus className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="invite-modal-title" className="modal-title">
                Invite Your Family & Friends
              </h2>
              <p className="modal-subtitle">
                Bring your household together. Share kitchen inventory, coordinate shopping lists, and manage your food essentials with people you trust.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close invite modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-scroll-body">
          {errorMsg && (
            <div className="error-alert-banner mb-4">
              <AlertTriangle className="tiny-icon" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Condition 1: Solo Mode (No Household Yet) */}
          {!currentHousehold ? (
            <div className="solo-mode-prompt-box">
              <div className="icon-bubble bg-indigo-50 text-indigo-700">
                <Users className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                You are currently in Personal Kitchen Mode
              </h3>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                To invite family members, roommates, or friends to collaborate, create a shared household workspace first.
              </p>

              {createHhError && (
                <div className="error-alert-banner mt-3 text-xs">
                  <span>{createHhError}</span>
                </div>
              )}

              <div className="create-hh-inline-form mt-4">
                <input
                  type="text"
                  placeholder="e.g. The Sharma Household, 42 Elm St Kitchen"
                  value={newHouseholdName}
                  onChange={(e) => setNewHouseholdName(e.target.value)}
                  className="input-field text-sm"
                  aria-label="Household Name"
                  disabled={isCreatingHousehold}
                />
                <button
                  type="button"
                  className="btn-primary whitespace-nowrap text-sm"
                  onClick={handleCreateHousehold}
                  disabled={isCreatingHousehold}
                >
                  {isCreatingHousehold ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <Sparkles className="btn-icon" aria-hidden="true" />
                      <span>Create Household</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Household Context Banner */}
              <div className="household-context-card">
                <div className="hh-context-left">
                  <Users className="hh-icon text-brand-green" aria-hidden="true" />
                  <div>
                    <span className="hh-tag">ACTIVE HOUSEHOLD</span>
                    <h4 className="hh-name">{currentHousehold.name}</h4>
                  </div>
                </div>
                <div className="hh-privacy-badge">
                  <Shield className="tiny-icon text-brand-green" aria-hidden="true" />
                  <span>Private & Isolated</span>
                </div>
              </div>

              {/* Step 1: Configure Invitation */}
              <div className="invite-form-grid mt-4">
                {/* Invitee Email Input */}
                <div className="form-group">
                  <label htmlFor="invite-email" className="field-label">
                    Invitee Email <span className="text-muted">(Optional)</span>
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    placeholder="family.member@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input-field"
                    disabled={isGenerating}
                  />
                  <p className="field-helper">
                    Leave blank to generate a universal link that any family member can accept.
                  </p>
                </div>

                {/* Role Selector */}
                <div className="form-group">
                  <label htmlFor="invite-role" className="field-label">
                    Assigned Role
                  </label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as HouseholdMemberRole)}
                    className="select-field"
                    disabled={isGenerating}
                  >
                    <option value="member">Collaborative Member (Full kitchen & shopping list access)</option>
                    <option value="viewer">Viewer (Read-only kitchen & grocery list access)</option>
                    <option value="admin">Household Admin (Can manage members and settings)</option>
                  </select>
                  <p className="field-helper">
                    Controls what the invited person can view or modify in your shared kitchen.
                  </p>
                </div>

                {/* Personal Message */}
                <div className="form-group full-width">
                  <label htmlFor="invite-msg" className="field-label">
                    Personal Message <span className="text-muted">(Optional)</span>
                  </label>
                  <textarea
                    id="invite-msg"
                    rows={2}
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    className="textarea-field"
                    placeholder="Add a friendly note to your invitation..."
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Generate Invitation Link Action */}
              <div className="generate-action-row mt-4">
                <button
                  type="button"
                  className="btn-primary w-full justify-center"
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <span>Generating Secure Link...</span>
                  ) : (
                    <>
                      <Send className="btn-icon" aria-hidden="true" />
                      <span>Generate Secure Invitation Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Link & Social Share Drawer */}
              {generatedInviteUrl && (
                <div className="generated-link-card mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                      Ready to Share (Valid for 7 Days)
                    </span>
                    {copiedLink && (
                      <span className="copied-pill">
                        <Check className="tiny-icon" aria-hidden="true" />
                        <span>Copied to Clipboard!</span>
                      </span>
                    )}
                  </div>

                  <div className="link-copy-box">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteUrl}
                      className="link-input-read"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      aria-label="Generated invitation URL"
                    />
                    <button
                      type="button"
                      className="btn-copy-link"
                      onClick={handleCopyLink}
                      aria-label="Copy invitation link"
                    >
                      {copiedLink ? <Check className="btn-icon text-success" /> : <Copy className="btn-icon" />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Social Sharing Options */}
                  <div className="social-sharing-section mt-4">
                    <p className="social-share-title">Or share directly with your family:</p>
                    <div className="social-buttons-grid">
                      <button
                        type="button"
                        className="social-share-btn btn-whatsapp"
                        onClick={handleShareWhatsApp}
                        aria-label="Share via WhatsApp"
                      >
                        <MessageCircle className="btn-icon" aria-hidden="true" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        className="social-share-btn btn-telegram"
                        onClick={handleShareTelegram}
                        aria-label="Share via Telegram"
                      >
                        <Send className="btn-icon" aria-hidden="true" />
                        <span>Telegram</span>
                      </button>

                      <button
                        type="button"
                        className="social-share-btn btn-email"
                        onClick={handleShareEmail}
                        aria-label="Share via Email"
                      >
                        <Mail className="btn-icon" aria-hidden="true" />
                        <span>Email</span>
                      </button>

                      <button
                        type="button"
                        className="social-share-btn btn-sms"
                        onClick={handleShareSMS}
                        aria-label="Share via SMS"
                      >
                        <MessageSquare className="btn-icon" aria-hidden="true" />
                        <span>SMS</span>
                      </button>

                      <button
                        type="button"
                        className="social-share-btn btn-native"
                        onClick={handleNativeShare}
                        aria-label="Open device share sheet"
                      >
                        <Share2 className="btn-icon" aria-hidden="true" />
                        <span>Device Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Invitations Section */}
              <div className="pending-invites-section mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Pending Invitations ({pendingInvites.length})
                  </h4>
                  {loadingInvites && <span className="text-xs text-muted">Refreshing...</span>}
                </div>

                {pendingInvites.length === 0 ? (
                  <p className="text-xs text-muted italic">
                    No pending invitations for this household. Newly created invite links will appear here.
                  </p>
                ) : (
                  <div className="pending-invites-list">
                    {pendingInvites.map((inv) => {
                      const isExpired = new Date(inv.expiresAt).getTime() < Date.now();
                      const daysLeft = Math.max(
                        0,
                        Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      );

                      return (
                        <div key={inv.id} className="pending-invite-row">
                          <div className="invite-info">
                            <span className="invite-target font-medium text-slate-800">
                              {inv.inviteeEmail.includes("link-share") ? "Universal Shareable Link" : inv.inviteeEmail}
                            </span>
                            <div className="invite-meta flex items-center gap-2 text-xs text-slate-500">
                              <span className="role-tag uppercase">{inv.role}</span>
                              <span>•</span>
                              <span>{isExpired ? "Expired" : `Expires in ${daysLeft} days`}</span>
                            </div>
                          </div>

                          <div className="invite-actions">
                            <button
                              type="button"
                              className="btn-revoke-invite"
                              onClick={() => handleRevoke(inv.id)}
                              disabled={revokingId === inv.id}
                              aria-label={`Revoke invitation for ${inv.inviteeEmail}`}
                            >
                              <Trash2 className="tiny-icon" aria-hidden="true" />
                              <span>{revokingId === inv.id ? "Revoking..." : "Revoke"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
