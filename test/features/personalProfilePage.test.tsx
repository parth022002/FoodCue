import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { PersonalProfilePage } from "../../src/features/profile/PersonalProfilePage";
import type { OnboardingApiClient } from "../../src/services/onboardingApiClient";
import type {
  FullUserProfileBundle,
  UserProfileRecord
} from "../../src/server/database/repositories/profile.repository";
import type {
  HouseholdRecord,
  HouseholdMemberWithProfile,
  HouseholdMemberRole
} from "../../src/server/database/repositories/household.repository";

// Mock Clerk useUser and useAuth
const mockUser = {
  id: "user_aarav_profile_test",
  fullName: "Aarav Sharma",
  firstName: "Aarav",
  lastName: "Sharma",
  primaryEmailAddress: { emailAddress: "aarav.sharma@example.com" },
  imageUrl: null,
  createdAt: "2026-01-15T10:00:00Z"
};

vi.mock("@clerk/react", () => ({
  useUser: () => ({
    isSignedIn: true,
    isLoaded: true,
    user: mockUser
  }),
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("mock_jwt_token"),
    signOut: vi.fn().mockResolvedValue(undefined)
  }),
  SignInButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe("FoodCue Personal Profile Page & Full-Stack Account Management", () => {
  let mockApiClient: Partial<OnboardingApiClient>;
  let mockProfileBundle: FullUserProfileBundle;
  let mockHouseholds: Array<HouseholdRecord & { userRole: HouseholdMemberRole; memberCount: number }>;
  let mockHouseholdMembers: HouseholdMemberWithProfile[];

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    const mockProfile: UserProfileRecord = {
      id: "prof_123",
      clerkUserId: "user_aarav_profile_test",
      fullName: "Aarav Sharma",
      profileImageUrl: null,
      age: 29,
      gender: "Male",
      country: "India",
      state: "Maharashtra",
      city: "Mumbai",
      preferredLanguage: "en",
      timezone: "Asia/Kolkata",
      onboardingStatus: "ONBOARDING_COMPLETED",
      createdAt: "2026-01-15T10:00:00Z",
      updatedAt: "2026-02-01T10:00:00Z"
    };

    mockProfileBundle = {
      profile: mockProfile,
      preferences: [
        { id: "p1", clerkUserId: "user_aarav_profile_test", preferenceType: "dietary_pattern", preferenceValue: "Vegetarian", createdAt: "" },
        { id: "p2", clerkUserId: "user_aarav_profile_test", preferenceType: "food_like", preferenceValue: "Fruits", createdAt: "" },
        { id: "p3", clerkUserId: "user_aarav_profile_test", preferenceType: "food_dislike", preferenceValue: "Bitter Gourd", createdAt: "" },
        { id: "p4", clerkUserId: "user_aarav_profile_test", preferenceType: "preferred_cuisine", preferenceValue: "North Indian", createdAt: "" },
        { id: "p5", clerkUserId: "user_aarav_profile_test", preferenceType: "preferred_ingredient", preferenceValue: "Paneer", createdAt: "" },
        { id: "p6", clerkUserId: "user_aarav_profile_test", preferenceType: "food_restriction", preferenceValue: "Lactose Intolerance", createdAt: "" }
      ],
      allergies: [
        {
          id: "a1",
          clerkUserId: "user_aarav_profile_test",
          allergenName: "Peanuts",
          allergenCategory: "food",
          severity: "moderate",
          notes: "Mild hives",
          consentObtained: true,
          createdAt: ""
        }
      ],
      allergyStatus: "ALLERGIES_SPECIFIED",
      onboardingStatus: "ONBOARDING_COMPLETED"
    };

    const householdId = "hh_sharma_family";
    mockHouseholds = [
      {
        id: householdId,
        name: "Sharma Family Kitchen",
        description: "Our home kitchen",
        householdType: "Family",
        location: "Mumbai",
        ownerClerkUserId: "user_aarav_profile_test",
        status: "active",
        createdAt: "2026-01-15T10:00:00Z",
        updatedAt: "2026-01-15T10:00:00Z",
        userRole: "owner",
        memberCount: 2
      }
    ];

    mockHouseholdMembers = [
      {
        id: "m1",
        householdId,
        clerkUserId: "user_aarav_profile_test",
        role: "owner",
        membershipStatus: "active",
        joinedAt: "2026-01-15T10:00:00Z",
        fullName: "Aarav Sharma",
        profileImageUrl: null
      },
      {
        id: "m2",
        householdId,
        clerkUserId: "user_priya_test",
        role: "member",
        membershipStatus: "active",
        joinedAt: "2026-01-16T10:00:00Z",
        fullName: "Priya Sharma",
        profileImageUrl: null
        // Notice: Priya's age, gender, private likes/dislikes, and medical allergies are NOT present
      }
    ];

    mockApiClient = {
      getProfile: vi.fn().mockResolvedValue(mockProfileBundle),
      saveProfile: vi.fn().mockImplementation((payload) => Promise.resolve({
        ...mockProfileBundle,
        profile: { ...mockProfileBundle.profile, ...payload.profile }
      })),
      listHouseholds: vi.fn().mockResolvedValue(mockHouseholds),
      getHouseholdDetails: vi.fn().mockResolvedValue({
        household: mockHouseholds[0],
        members: mockHouseholdMembers,
        pendingInvitations: []
      }),
      getSharingPreferences: vi.fn().mockResolvedValue([
        { id: "s1", clerkUserId: "user_aarav_profile_test", householdId, informationCategory: "dietary_preferences", sharingEnabled: true, updatedAt: "" },
        { id: "s2", clerkUserId: "user_aarav_profile_test", householdId, informationCategory: "allergies", sharingEnabled: false, updatedAt: "" },
        { id: "s3", clerkUserId: "user_aarav_profile_test", householdId, informationCategory: "food_likes", sharingEnabled: false, updatedAt: "" }
      ]),
      setSharingPreference: vi.fn().mockResolvedValue(true),
      deleteAccount: vi.fn().mockResolvedValue({ success: true, message: "Account deleted" })
    };
  });

  it("Test A: Loads and displays authenticated user profile information and completion strength", async () => {
    render(
      <PersonalProfilePage
        apiClient={mockApiClient as OnboardingApiClient}
        currentHousehold={mockHouseholds[0]}
        onNavigateToDashboard={vi.fn()}
      />
    );

    // Wait for profile loading to resolve
    await screen.findByRole("heading", { name: "Aarav Sharma" });

    // Header Details
    expect(screen.getAllByText("aarav.sharma@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText(/Verified Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Profile Completeness/i)).toBeInTheDocument();

    // Personal Information form values loaded
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Aarav Sharma");
    expect(screen.getByLabelText(/Age \(Optional\)/i)).toHaveValue(29);
    expect(screen.getByLabelText(/Gender/i)).toHaveValue("Male");
    expect(screen.getByLabelText(/Country/i)).toHaveValue("India");
    expect(screen.getByLabelText(/City/i)).toHaveValue("Mumbai");
  });

  it("Test B: Allows editing personal demographics and saving to the database", async () => {
    render(
      <PersonalProfilePage
        apiClient={mockApiClient as OnboardingApiClient}
        currentHousehold={mockHouseholds[0]}
        onNavigateToDashboard={vi.fn()}
      />
    );

    await screen.findByRole("heading", { name: "Aarav Sharma" });

    // Edit Name and Age
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: "Aarav K. Sharma" } });

    const ageInput = screen.getByLabelText(/Age \(Optional\)/i);
    fireEvent.change(ageInput, { target: { value: "30" } });

    // Verify Unsaved Changes indicator is shown
    expect(screen.getAllByText(/Unsaved Changes/i).length).toBeGreaterThan(0);

    // Click Save Changes
    const saveButton = screen.getByRole("button", { name: /Save Profile Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiClient.saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({
            fullName: "Aarav K. Sharma",
            age: 30
          })
        })
      );
    });

    // Check success state
    expect(await screen.findByText(/Changes Saved!/i)).toBeInTheDocument();
  });

  it("Test C: Manages food preferences, likes, dislikes, and cuisines with add/remove actions", async () => {
    render(
      <PersonalProfilePage
        apiClient={mockApiClient as OnboardingApiClient}
        currentHousehold={mockHouseholds[0]}
        onNavigateToDashboard={vi.fn()}
      />
    );

    await screen.findByRole("heading", { name: "Aarav Sharma" });

    // Add a custom food like
    const customLikeInput = screen.getByPlaceholderText(/Type a favourite food or ingredient/i);
    fireEvent.change(customLikeInput, { target: { value: "Dark Chocolate" } });
    fireEvent.click(screen.getByRole("button", { name: /Add Like/i }));

    expect(screen.getByText("Dark Chocolate")).toBeInTheDocument();

    // Remove an existing food like ("Fruits")
    const removeFruitsBtn = screen.getByLabelText("Remove like: Fruits");
    fireEvent.click(removeFruitsBtn);
    expect(screen.queryByText("Fruits")).not.toBeInTheDocument();

    // Add a custom dislike
    const customDislikeInput = screen.getByPlaceholderText(/Type an ingredient you dislike/i);
    fireEvent.change(customDislikeInput, { target: { value: "Okra" } });
    fireEvent.click(screen.getByRole("button", { name: /Add Dislike/i }));

    expect(screen.getByText("Okra")).toBeInTheDocument();

    // Save and verify atomic payload
    fireEvent.click(screen.getByRole("button", { name: /Save Profile Changes/i }));

    await waitFor(() => {
      expect(mockApiClient.saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.arrayContaining([
            { type: "food_like", value: "Dark Chocolate" },
            { type: "food_dislike", value: "Okra" }
          ])
        })
      );
    });
  });

  it("Test D: Handles allergies declaration, custom allergen entry, severity levels, and safety consent", async () => {
    render(
      <PersonalProfilePage
        apiClient={mockApiClient as OnboardingApiClient}
        currentHousehold={mockHouseholds[0]}
        onNavigateToDashboard={vi.fn()}
      />
    );

    await screen.findByRole("heading", { name: "Aarav Sharma" });
    expect(screen.getAllByText("Peanuts").length).toBeGreaterThan(0);

    // Add custom allergen
    const allergenInput = screen.getByPlaceholderText(/Allergen Name/i);
    fireEvent.change(allergenInput, { target: { value: "Pine Nuts" } });

    const notesInput = screen.getByPlaceholderText(/Optional reaction notes/i);
    fireEvent.change(notesInput, { target: { value: "Causes immediate rash" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Allergen/i }));

    expect(screen.getByText("Pine Nuts")).toBeInTheDocument();
    expect(screen.getByText(/"Causes immediate rash"/i)).toBeInTheDocument();

    // Remove Peanuts
    const removePeanutBtn = screen.getByLabelText("Remove allergy Peanuts");
    fireEvent.click(removePeanutBtn);

    // Save and verify payload
    fireEvent.click(screen.getByRole("button", { name: /Save Profile Changes/i }));

    await waitFor(() => {
      expect(mockApiClient.saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          allergyStatus: "ALLERGIES_SPECIFIED",
          allergies: expect.arrayContaining([
            expect.objectContaining({
              name: "Pine Nuts",
              notes: "Causes immediate rash"
            })
          ])
        })
      );
    });
  });

  it("Test E: Renders household members with strict privacy protection (no private profile leaks)", async () => {
    render(
      <PersonalProfilePage
        apiClient={mockApiClient as OnboardingApiClient}
        currentHousehold={mockHouseholds[0]}
        onNavigateToDashboard={vi.fn()}
      />
    );

    await screen.findByRole("heading", { name: "Aarav Sharma" });
    expect(screen.getByText("Sharma Family Kitchen")).toBeInTheDocument();

    // Both members displayed
    expect(screen.getAllByText("Aarav Sharma").length).toBeGreaterThan(0);
    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();

    // Verify privacy indicator
    expect(screen.getByText(/Other Members' Private Profiles & Allergies Are Hidden/i)).toBeInTheDocument();

    // Verify what members can access explanation is visible
    expect(screen.getByText(/What Household Members Can Access:/i)).toBeInTheDocument();
    expect(screen.getByText(/Synchronised ledger of pantry items/i)).toBeInTheDocument();
  });

  it("Test F: Toggles household privacy sharing preferences and persists settings", async () => {
    render(
      <PersonalProfilePage
        apiClient={mockApiClient as OnboardingApiClient}
        currentHousehold={mockHouseholds[0]}
        onNavigateToDashboard={vi.fn()}
      />
    );

    await screen.findByRole("heading", { name: "Aarav Sharma" });
    expect(screen.getByText(/Privacy & Household Sharing Controls/i)).toBeInTheDocument();

    // Toggle Share Allergen Warnings switch
    const shareAllergiesSwitch = screen.getByRole("switch", { name: /Toggle Share Allergen Warnings/i });
    expect(shareAllergiesSwitch).toHaveAttribute("aria-checked", "false");

    fireEvent.click(shareAllergiesSwitch);
    expect(shareAllergiesSwitch).toHaveAttribute("aria-checked", "true");

    // Click Save Changes
    fireEvent.click(screen.getByRole("button", { name: /Save Profile Changes/i }));

    await waitFor(() => {
      expect(mockApiClient.setSharingPreference).toHaveBeenCalledWith(
        "hh_sharma_family",
        "allergies",
        true
      );
    });
  });

  it("Test G: Prompts user when attempting to navigate away with unsaved changes", async () => {
    const handleDashboardNav = vi.fn();
    render(
      <PersonalProfilePage
        apiClient={mockApiClient as OnboardingApiClient}
        currentHousehold={mockHouseholds[0]}
        onNavigateToDashboard={handleDashboardNav}
      />
    );

    await screen.findByRole("heading", { name: "Aarav Sharma" });

    // Modify a field to trigger dirty state
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Aarav Edited" } });

    // Click "Back to Dashboard"
    fireEvent.click(screen.getByRole("button", { name: /Return to Dashboard/i }));

    // Discard modal should appear
    expect(screen.getByText(/Discard Unsaved Changes\?/i)).toBeInTheDocument();
    expect(handleDashboardNav).not.toHaveBeenCalled();

    // Click Discard Changes
    fireEvent.click(screen.getByRole("button", { name: /Discard Changes/i }));
    expect(handleDashboardNav).toHaveBeenCalled();
  });

  it("Test H: Blocks deletion if user is Household Owner with active members, requiring transfer", async () => {
    render(
      <PersonalProfilePage
        apiClient={mockApiClient as OnboardingApiClient}
        currentHousehold={mockHouseholds[0]}
        onNavigateToDashboard={vi.fn()}
      />
    );

    await screen.findByRole("heading", { name: "Aarav Sharma" });

    // Click Delete My Account
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));

    // Owner constraint should trigger because memberCount > 1
    expect(screen.getByText(/Action Required: Transfer Household Ownership First/i)).toBeInTheDocument();
    expect(screen.getByText(/"Sharma Family Kitchen"/i)).toBeInTheDocument();
  });
});
