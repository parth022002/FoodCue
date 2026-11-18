import React, { useState, useEffect } from "react";
import { useUser, SignInButton, SignUpButton } from "@clerk/react";
import { Users, CheckCircle2, AlertTriangle, ArrowRight, LogIn, UserPlus } from "lucide-react";
import type { OnboardingApiClient } from "../../services/onboardingApiClient";

interface InvitationAcceptViewProps {
  token: string;
  apiClient: OnboardingApiClient;
  onAccepted: (householdId: string) => void;
  onCancel: () => void;
}

export const InvitationAcceptView: React.FC<InvitationAcceptViewProps> = ({
  token,
  apiClient,
  onAccepted,
  onCancel
}) => {
  const { isSignedIn, user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<{
    valid: boolean;
    householdId?: string;
    householdName?: string;
    role?: string;
    expiresAt?: string;
  } | null>(null);

  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiClient
      .validateInvitation(token)
      .then((data) => {
        if (!mounted) return;
        if (data.valid) {
          setInvitationData(data);
        } else {
          setError(data.reason || "This invitation is invalid or has expired.");
        }
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Error validating invitation.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, apiClient]);

  async function handleAccept() {
    setIsAccepting(true);
    setError(null);
    try {
      const res = await apiClient.acceptInvitation(token);
      onAccepted(res.householdId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation.");
      setIsAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="invite-view-card">
        <div className="loading-spinner-box">
          <div className="spinner" />
          <p className="mt-8 text-sm text-muted">Verifying invitation credentials...</p>
        </div>
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="invite-view-card">
        <div className="icon-pill-lg bg-red-100 text-red-600">
          <AlertTriangle className="icon-lg" />
        </div>
        <h3 className="invite-title">Invitation Unavailable</h3>
        <p className="invite-desc">{error || "This invitation link is invalid, expired, or has already been used."}</p>
        <button type="button" className="btn-secondary mt-16" onClick={onCancel}>
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="invite-view-card">
      <div className="icon-pill-lg bg-indigo-100 text-indigo-700">
        <Users className="icon-lg" />
      </div>

      <h2 className="invite-title">You're Invited to Join {invitationData.householdName}!</h2>
      <p className="invite-desc">
        A family member or friend invited you to collaborate on their kitchen pantry, coordinate grocery lists, and share food intelligence.
      </p>

      <div className="invite-details-box mt-16">
        <div className="detail-row">
          <span className="lbl">Household:</span>
          <strong>{invitationData.householdName}</strong>
        </div>
        <div className="detail-row">
          <span className="lbl">Assigned Role:</span>
          <span className="role-tag">{invitationData.role?.toUpperCase()}</span>
        </div>
        <div className="detail-row">
          <span className="lbl">Valid Until:</span>
          <span>{invitationData.expiresAt ? new Date(invitationData.expiresAt).toLocaleDateString() : "7 days"}</span>
        </div>
      </div>

      {!isSignedIn ? (
        <div className="auth-required-box mt-20">
          <p className="text-xs text-muted mb-12">
            Please sign in or create a FoodCue account to accept this household invitation.
          </p>
          <div className="flex gap-3 justify-center">
            <SignInButton mode="modal">
              <button type="button" className="btn-secondary-sm">
                <LogIn className="btn-icon" />
                <span>Sign In</span>
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button type="button" className="btn-primary-sm">
                <UserPlus className="btn-icon" />
                <span>Create Free Account</span>
              </button>
            </SignUpButton>
          </div>
        </div>
      ) : (
        <div className="accept-actions mt-24 flex gap-3 justify-center">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={isAccepting}>
            Decline
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <span>Joining Household...</span>
            ) : (
              <>
                <CheckCircle2 className="btn-icon" />
                <span>Accept & Join as {user?.fullName || "Member"}</span>
                <ArrowRight className="btn-icon" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
