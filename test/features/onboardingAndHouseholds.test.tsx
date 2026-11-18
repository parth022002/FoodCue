import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { OnboardingWizard } from "../../src/features/onboarding/OnboardingWizard";
import { HouseholdOnboardingModal } from "../../src/features/onboarding/HouseholdOnboardingModal";
import { HouseholdManager } from "../../src/features/household/HouseholdManager";
import { InvitationAcceptView } from "../../src/features/household/InvitationAcceptView";
import type { OnboardingApiClient } from "../../src/services/onboardingApiClient";

// Mock Clerk React hooks
vi.mock("@clerk/react", () => ({
  useUser: () => ({
    isSignedIn: true,
    user: {
      id: "user_test_123",
      fullName: "Aarav Sharma",
      firstName: "Aarav",
      primaryEmailAddress: { emailAddress: "aarav@example.com" }
    }
  }),
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("mock_token")
  }),
  SignInButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe("FoodCue Onboarding, Profile & Household Integration", () => {
  let mockApiClient: Partial<OnboardingApiClient>;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockApiClient = {
      getProfile: vi.fn().mockResolvedValue({
        profile: {
          id: "p1",
          clerkUserId: "user_test_123",
          fullName: "Aarav Sharma",
          onboardingStatus: "PROFILE_PENDING"
        },
        preferences: [],
        allergies: [],
        allergyStatus: "NOT_PROVIDED",
        onboardingStatus: "PROFILE_PENDING"
      }),
      saveProfile: vi.fn().mockResolvedValue({
        profile: {
          id: "p1",
          clerkUserId: "user_test_123",
          fullName: "Aarav Sharma",
          onboardingStatus: "PROFILE_COMPLETED"
        },
        preferences: [{ preferenceType: "dietary_pattern", preferenceValue: "Vegetarian" }],
        allergies: [],
        allergyStatus: "CONFIRMED_NO_ALLERGIES",
        onboardingStatus: "PROFILE_COMPLETED"
      }),
      listHouseholds: vi.fn().mockResolvedValue([
        {
          id: "hh_1",
          name: "Sharma Family Kitchen",
          householdType: "Family",
          ownerClerkUserId: "user_test_123",
          userRole: "owner",
          memberCount: 2
        }
      ]),
      createHousehold: vi.fn().mockResolvedValue({
        id: "hh_new",
        name: "Verma Family Kitchen",
        householdType: "Family",
        ownerClerkUserId: "user_test_123",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }),
      getHouseholdDetails: vi.fn().mockResolvedValue({
        household: {
          id: "hh_1",
          name: "Sharma Family Kitchen",
          householdType: "Family",
          ownerClerkUserId: "user_test_123",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        userRole: "owner",
        members: [
          {
            id: "m1",
            householdId: "hh_1",
            clerkUserId: "user_test_123",
            role: "owner",
            membershipStatus: "active",
            joinedAt: new Date().toISOString(),
            fullName: "Aarav Sharma",
            profileImageUrl: null,
            sharedDietaryPattern: "Vegetarian"
          }
        ],
        invitations: []
      }),
      createInvitation: vi.fn().mockResolvedValue({
        invitation: {
          id: "inv_1",
          householdId: "hh_1",
          invitedByClerkUserId: "user_test_123",
          inviteeEmail: "pooja@example.com",
          invitationTokenHash: "hash123",
          role: "member",
          status: "pending",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString()
        },
        token: "tok_abc123",
        inviteUrl: "/invite/tok_abc123"
      }),
      validateInvitation: vi.fn().mockResolvedValue({
        valid: true,
        invitationId: "inv_1",
        householdId: "hh_1",
        householdName: "Sharma Family Kitchen",
        role: "member",
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      }),
      acceptInvitation: vi.fn().mockResolvedValue({
        success: true,
        householdId: "hh_1",
        role: "member"
      }),
      revokeInvitation: vi.fn().mockResolvedValue(true),
      getSharingPreferences: vi.fn().mockResolvedValue([
        { informationCategory: "dietary_preferences", sharingEnabled: true },
        { informationCategory: "allergies", sharingEnabled: false }
      ]),
      setSharingPreference: vi.fn().mockResolvedValue(true)
    };
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1: ONBOARDING WIZARD MULTI-STEP FLOW
  // ---------------------------------------------------------------------------
  it("walks through OnboardingWizard steps and submits profile bundle", async () => {
    const handleCompleted = vi.fn();

    render(
      <OnboardingWizard
        apiClient={mockApiClient as OnboardingApiClient}
        initialName="Aarav Sharma"
        initialEmail="aarav@example.com"
        onProfileCompleted={handleCompleted}
      />
    );

    // Step 1: Basic Info
    expect(screen.getByRole("heading", { name: /Personal Information/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Aarav Sharma")).toBeInTheDocument();

    const continueBtn = screen.getByRole("button", { name: /continue to diet & taste/i });
    fireEvent.click(continueBtn);

    // Step 2: Food Preferences
    await waitFor(() => {
      expect(screen.getByText(/Dietary & Food Preferences/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /continue to allergies/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continue to allergies/i }));

    // Step 3: Allergies
    await waitFor(() => {
      expect(screen.getByText(/Allergies & Food Restrictions/i)).toBeInTheDocument();
    });

    // Select "Confirmed no known allergies"
    const noAllergyRadio = screen.getByLabelText(/I have NO known food allergies/i);
    fireEvent.click(noAllergyRadio);

    fireEvent.click(screen.getByRole("button", { name: /review profile/i }));

    // Step 4: Review & Confirm
    await waitFor(() => {
      expect(screen.getByText(/Review & Confirm Profile/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: /confirm & continue to household setup/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockApiClient.saveProfile).toHaveBeenCalled();
      expect(handleCompleted).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: HOUSEHOLD ONBOARDING (SOLO VS SHARED)
  // ---------------------------------------------------------------------------
  it("allows continuing individually without creating a household", async () => {
    const handleComplete = vi.fn();

    render(
      <HouseholdOnboardingModal
        apiClient={mockApiClient as OnboardingApiClient}
        onComplete={handleComplete}
      />
    );

    expect(screen.getByText(/Make Your Kitchen a Shared Experience/i)).toBeInTheDocument();

    const soloBtn = screen.getByRole("button", { name: /continue without inviting anyone/i });
    fireEvent.click(soloBtn);

    await waitFor(() => {
      expect(mockApiClient.saveProfile).toHaveBeenCalledWith({
        onboardingStatus: "ONBOARDING_COMPLETED"
      });
      expect(handleComplete).toHaveBeenCalledWith(null);
    });
  });

  it("allows creating a household with sharing controls", async () => {
    const handleComplete = vi.fn();

    render(
      <HouseholdOnboardingModal
        apiClient={mockApiClient as OnboardingApiClient}
        onComplete={handleComplete}
      />
    );

    const createBtns = screen.getAllByRole("button", { name: /create household & invite members/i });
    fireEvent.click(createBtns[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Sharma Family Kitchen or Flat 402/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Sharma Family Kitchen or Flat 402/i);
    fireEvent.change(nameInput, { target: { value: "Verma Family Kitchen" } });

    const submitBtn = screen.getByRole("button", { name: /create household & continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApiClient.createHousehold).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Verma Family Kitchen" })
      );
      expect(handleComplete).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: HOUSEHOLD MANAGER WORKSPACE & SHARING
  // ---------------------------------------------------------------------------
  it("renders HouseholdManager with active workspace and member controls", async () => {
    const handleSelect = vi.fn();

    render(
      <HouseholdManager
        apiClient={mockApiClient as OnboardingApiClient}
        currentHousehold={{
          id: "hh_1",
          name: "Sharma Family Kitchen",
          householdType: "Family",
          ownerClerkUserId: "user_test_123",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: null,
          location: null
        }}
        onSelectHousehold={handleSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Household & Kitchen Sharing/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Sharma Family Kitchen/i).length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: INVITATION ACCEPTANCE VIEW
  // ---------------------------------------------------------------------------
  it("validates invitation token and allows member to accept", async () => {
    const handleAccepted = vi.fn();
    const handleCancel = vi.fn();

    render(
      <InvitationAcceptView
        token="valid_token_123"
        apiClient={mockApiClient as OnboardingApiClient}
        onAccepted={handleAccepted}
        onCancel={handleCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/You're Invited to Join Sharma Family Kitchen!/i)).toBeInTheDocument();
    });

    const acceptBtn = screen.getByRole("button", { name: /accept & join/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(mockApiClient.acceptInvitation).toHaveBeenCalledWith("valid_token_123");
      expect(handleAccepted).toHaveBeenCalledWith("hh_1");
    });
  });
});
