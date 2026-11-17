/**
 * FoodCue Household Collaboration & Sharing Manager (Milestone 5)
 * Multi-tenant shared pantry workspace powered by Clerk Organizations.
 * Guarantees zero silent merging through explicit Migration Preview Dialog.
 */

import React, { useState } from "react";
import { Users, UserPlus, Shield, ShieldAlert, ArrowRightLeft, Check, AlertTriangle, X } from "lucide-react";
import {
  type Household,
  type HouseholdRole,
  type HouseholdMigrationChoice,
  canAdministerHousehold,
  canWritePantryEvents
} from "../../domain/entities/household";

interface HouseholdManagerProps {
  currentHousehold: Household | null; // null = Personal Pantry
  userRole?: HouseholdRole;
  userEmail?: string;
  onSelectHousehold: (household: Household | null, migrationChoice?: HouseholdMigrationChoice) => void;
  onInviteMember?: (email: string, role: HouseholdRole) => Promise<boolean>;
  onClose?: () => void;
  localItemCount?: number;
}

export const HouseholdManager: React.FC<HouseholdManagerProps> = ({
  currentHousehold,
  userRole = "admin",
  userEmail,
  onSelectHousehold,
  onInviteMember,
  onClose,
  localItemCount = 0
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdRole>("member");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // Migration Preview Dialog State
  const [pendingTargetHousehold, setPendingTargetHousehold] = useState<Household | null>(null);
  const [migrationChoice, setMigrationChoice] = useState<HouseholdMigrationChoice>("merge");

  // Sample mock households for UI preview/testing
  const [availableHouseholds] = useState<Household[]>([
    {
      id: "org_sharma_family",
      name: "Sharma Family Kitchen",
      slug: "sharma-family",
      ownerClerkUserId: "user_owner_1",
      members: [
        {
          userId: "u1",
          clerkUserId: "user_owner_1",
          displayName: "Aarav Sharma",
          email: "aarav@example.com",
          role: "admin",
          joinedAt: "2026-11-01T10:00:00Z"
        },
        {
          userId: "u2",
          clerkUserId: "user_member_2",
          displayName: "Pooja Sharma",
          email: "pooja@example.com",
          role: "member",
          joinedAt: "2026-11-05T12:00:00Z"
        }
      ],
      createdAt: "2026-11-01T10:00:00Z",
      updatedAt: "2026-11-17T10:00:00Z"
    }
  ]);

  function handleInitiateSwitch(target: Household | null) {
    if (target && !currentHousehold && localItemCount > 0) {
      // Transitioning from Personal -> Household with existing items: require migration preview!
      setPendingTargetHousehold(target);
    } else {
      onSelectHousehold(target);
    }
  }

  function handleConfirmMigration() {
    if (pendingTargetHousehold) {
      onSelectHousehold(pendingTargetHousehold, migrationChoice);
      setPendingTargetHousehold(null);
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !onInviteMember) return;

    setInviteStatus("Sending invite...");
    try {
      const ok = await onInviteMember(inviteEmail.trim(), inviteRole);
      if (ok) {
        setInviteStatus(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteStatus(null);
        }, 1200);
      } else {
        setInviteStatus("Failed to send invite. Please verify email.");
      }
    } catch {
      setInviteStatus("Error dispatching invitation.");
    }
  }

  return (
    <div
      className="household-manager bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm space-y-6 max-w-lg mx-auto"
      role="region"
      aria-label="Household Sharing & Member Management"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Household Pantry Sharing
            </h3>
            <p className="text-xs text-stone-500">
              Collaborate on kitchen inventory across family members
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-sm font-medium px-2 py-1"
            aria-label="Close household manager"
          >
            Done
          </button>
        )}
      </div>

      {/* Active Workspace Banner */}
      <div className="p-4 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Active Workspace
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              currentHousehold
                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300"
            }`}
          >
            {currentHousehold ? `Role: ${userRole.toUpperCase()}` : "Private"}
          </span>
        </div>

        <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
          {currentHousehold ? currentHousehold.name : "Personal Pantry (Local/Private)"}
        </div>

        <p className="text-xs text-stone-500">
          {currentHousehold
            ? `Shared with ${currentHousehold.members.length} members. Scanned items sync securely to household.`
            : "Visible only on this account. Not shared with any household."}
        </p>
      </div>

      {/* Workspace Switcher */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
          <ArrowRightLeft className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
          Switch Pantry
        </label>

        <div className="space-y-2">
          {/* Option: Personal Pantry */}
          <button
            type="button"
            onClick={() => handleInitiateSwitch(null)}
            className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-colors ${
              !currentHousehold
                ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200"
                : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
            }`}
          >
            <div>
              <div className="text-sm font-medium">Personal Pantry</div>
              <div className="text-xs text-stone-400">Isolated local kitchen ledger</div>
            </div>
            {!currentHousehold && <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />}
          </button>

          {/* Option: Household Pantries */}
          {availableHouseholds.map((hh) => (
            <button
              key={hh.id}
              type="button"
              onClick={() => handleInitiateSwitch(hh)}
              className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-colors ${
                currentHousehold?.id === hh.id
                  ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200"
                  : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
              }`}
            >
              <div>
                <div className="text-sm font-medium">{hh.name}</div>
                <div className="text-xs text-stone-400">{hh.members.length} members · Clerk Organization</div>
              </div>
              {currentHousehold?.id === hh.id && <Check className="w-4 h-4 text-indigo-600" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>

      {/* Member Roster & Invites (When in Household) */}
      {currentHousehold && (
        <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Household Members
            </span>
            {canAdministerHousehold(userRole) && (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Invite Member
              </button>
            )}
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            {currentHousehold.members.map((member) => (
              <div key={member.userId} className="p-3 flex items-center justify-between text-xs bg-white dark:bg-stone-900">
                <div>
                  <div className="font-medium text-stone-900 dark:text-stone-100">{member.displayName || member.email}</div>
                  <div className="text-[11px] text-stone-400">{member.email}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Migration Preview Dialog */}
      {pendingTargetHousehold && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="migration-dialog-title"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h4 id="migration-dialog-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Switching to {pendingTargetHousehold.name}
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  You currently have {localItemCount} food item{localItemCount === 1 ? "" : "s"} in your personal pantry. Choose how to handle your existing items:
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2" role="radiogroup" aria-label="Pantry Migration Options">
              <label
                className={`p-3 rounded-lg border block cursor-pointer transition-colors ${
                  migrationChoice === "merge"
                    ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20"
                    : "border-stone-200 dark:border-stone-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="migration"
                    value="merge"
                    checked={migrationChoice === "merge"}
                    onChange={() => setMigrationChoice("merge")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    Merge Personal Items into Household
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 ml-5 mt-1">
                  Copies all {localItemCount} personal items into {pendingTargetHousehold.name}. All household members will be able to see and track them.
                </p>
              </label>

              <label
                className={`p-3 rounded-lg border block cursor-pointer transition-colors ${
                  migrationChoice === "isolate"
                    ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20"
                    : "border-stone-200 dark:border-stone-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="migration"
                    value="isolate"
                    checked={migrationChoice === "isolate"}
                    onChange={() => setMigrationChoice("isolate")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    Keep Personal Items Separate
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 ml-5 mt-1">
                  Leaves your personal items safe and private. Switches you to an empty shared household pantry.
                </p>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setPendingTargetHousehold(null)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMigration}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                Confirm & Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSendInvite}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 max-w-sm w-full shadow-xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
          >
            <div className="flex items-center justify-between">
              <h4 id="invite-modal-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Invite to Household
              </h4>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-stone-400 hover:text-stone-600"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label htmlFor="invite-email" className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                Member Email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                placeholder="family.member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                Role & Permissions
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInviteRole("member")}
                  className={`p-2 text-xs rounded-lg border text-center font-medium ${
                    inviteRole === "member"
                      ? "border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : "border-stone-200 dark:border-stone-800 text-stone-600"
                  }`}
                >
                  Member (Can Edit)
                </button>
                <button
                  type="button"
                  onClick={() => setInviteRole("viewer")}
                  className={`p-2 text-xs rounded-lg border text-center font-medium ${
                    inviteRole === "viewer"
                      ? "border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : "border-stone-200 dark:border-stone-800 text-stone-600"
                  }`}
                >
                  Guest (Read Only)
                </button>
              </div>
            </div>

            {inviteStatus && (
              <div className="text-xs text-center text-stone-600 dark:text-stone-400">
                {inviteStatus}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Send Invitation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
