import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { GuestHome } from "../../src/features/home/GuestHome";
import { AuthGateView } from "../../src/features/auth/AuthGateView";
import { HouseholdInviteModal } from "../../src/features/household/HouseholdInviteModal";
import { TermsOfService } from "../../src/features/legal/TermsOfService";
import type { OnboardingApiClient } from "../../src/services/onboardingApiClient";
import type { HouseholdRecord, HouseholdInvitationRecord } from "../../src/server/database/repositories/household.repository";

afterEach(() => {
  cleanup();
});

// Mock Clerk components
vi.mock("@clerk/react", () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe("FoodCue Authentication Gate, Landing Page & Household Invitation Flows", () => {
  describe("GuestHome Public Landing Page", () => {
    it("renders headline, description, 11 capabilities, 4 steps, and conversion CTAs", () => {
      const handleAuthPrompt = vi.fn();
      render(<GuestHome onRequireAuthPrompt={handleAuthPrompt} />);

      // 1. Hero headline & description
      expect(screen.getByRole("heading", { level: 1, name: /know your food\.\s*manage your kitchen\./i })).toBeInTheDocument();
      expect(screen.getByText(/discover food products, understand available nutrition and ingredient information/i)).toBeInTheDocument();

      // Primary conversion CTAs
      expect(screen.getByRole("button", { name: /get started by signing up/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in to your foodcue account/i })).toBeInTheDocument();

      // Zero camera stream guarantee
      expect(screen.getByText(/zero camera stream storage/i)).toBeInTheDocument();

      // 2. Product Introduction
      expect(screen.getByText(/a connected way to understand and manage your food/i)).toBeInTheDocument();

      // 3. Key Capabilities (all 11)
      expect(screen.getByText("Smart Food Scanning")).toBeInTheDocument();
      expect(screen.getByText("Product Discovery")).toBeInTheDocument();
      expect(screen.getByText("Nutrition Information")).toBeInTheDocument();
      expect(screen.getByText("Ingredient Analysis")).toBeInTheDocument();
      expect(screen.getByText("Food Preferences")).toBeInTheDocument();
      expect(screen.getByText("Allergy Awareness")).toBeInTheDocument();
      expect(screen.getAllByText("Kitchen Inventory")[0]).toBeInTheDocument();
      expect(screen.getByText("Expiry Tracking")).toBeInTheDocument();
      expect(screen.getAllByText("Shopping Lists")[0]).toBeInTheDocument();
      expect(screen.getByText("Household Collaboration")).toBeInTheDocument();
      expect(screen.getByText("Supported Offline Functionality")).toBeInTheDocument();

      // 4. How FoodCue Works (4 steps)
      expect(screen.getByText("Discover Your Food")).toBeInTheDocument();
      expect(screen.getByText("Understand Your Products")).toBeInTheDocument();
      expect(screen.getByText("Organize Your Kitchen")).toBeInTheDocument();
      expect(screen.getByText("Stay Informed")).toBeInTheDocument();

      // 5. Trust and Transparency
      expect(screen.getByText(/trust, transparency & data accuracy/i)).toBeInTheDocument();
      expect(screen.getByText(/always inspect the physical packaging label/i)).toBeInTheDocument();

      // 6. Final Conversion CTA
      expect(screen.getByRole("heading", { level: 2, name: /start managing your kitchen with foodcue\./i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create your account/i })).toBeInTheDocument();
    });
  });

  describe("AuthGateView Authentication Protection", () => {
    it("renders gate with lock icon, explanatory message, Sign In, and Return Home options", () => {
      const handleReturnHome = vi.fn();
      render(<AuthGateView targetFeatureName="My Kitchen & Pantry Inventory" onReturnHome={handleReturnHome} />);

      // Heading with targeted feature name
      expect(screen.getByRole("heading", { level: 1, name: /sign in to access my kitchen & pantry inventory/i })).toBeInTheDocument();
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();

      // CTAs
      expect(screen.getByRole("button", { name: /sign in to your foodcue account/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create a free foodcue account/i })).toBeInTheDocument();

      // Return home
      const backBtn = screen.getByRole("button", { name: /return to public landing page/i });
      expect(backBtn).toBeInTheDocument();
      fireEvent.click(backBtn);
      expect(handleReturnHome).toHaveBeenCalledTimes(1);
    });
  });

  describe("HouseholdInviteModal Sharing & Invitation System", () => {
    let mockApiClient: Partial<OnboardingApiClient>;
    const mockHousehold: HouseholdRecord = {
      id: "hh_sharma_123",
      name: "The Sharma Household",
      householdType: "Family",
      ownerClerkUserId: "user_aarav_123",
      status: "active",
      createdAt: "2026-01-10T10:00:00Z",
      updatedAt: "2026-01-10T10:00:00Z"
    };

    const mockPendingInvite: HouseholdInvitationRecord = {
      id: "inv_456",
      householdId: "hh_sharma_123",
      invitedByClerkUserId: "user_aarav_123",
      inviteeEmail: "priya.sharma@example.com",
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    beforeEach(() => {
      vi.clearAllMocks();
      // Mock clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });

      mockApiClient = {
        getHouseholdDetails: vi.fn().mockResolvedValue({
          household: mockHousehold,
          userRole: "owner",
          members: [],
          invitations: [mockPendingInvite]
        }),
        createInvitation: vi.fn().mockResolvedValue({
          invitation: mockPendingInvite,
          token: "mock_secure_token_64_characters",
          inviteUrl: "/invite/mock_secure_token_64_characters"
        }),
        revokeInvitation: vi.fn().mockResolvedValue(true),
        createHousehold: vi.fn().mockResolvedValue({
          ...mockHousehold,
          id: "hh_new_789",
          name: "The New Family Kitchen"
        })
      };
    });

    it("renders Solo Mode prompt with Create Household inline form when user has no active household", async () => {
      const handleClose = vi.fn();
      const handleCreated = vi.fn();

      render(
        <HouseholdInviteModal
          apiClient={mockApiClient as OnboardingApiClient}
          currentHousehold={null}
          isOpen={true}
          onClose={handleClose}
          onHouseholdCreated={handleCreated}
        />
      );

      expect(screen.getByText(/you are currently in personal kitchen mode/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. the sharma household/i)).toBeInTheDocument();

      // Enter name and click Create
      const nameInput = screen.getByPlaceholderText(/e\.g\. the sharma household/i);
      fireEvent.change(nameInput, { target: { value: "The New Family Kitchen" } });

      const createBtn = screen.getByRole("button", { name: /create household/i });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(mockApiClient.createHousehold).toHaveBeenCalledWith({
          name: "The New Family Kitchen",
          householdType: "Family"
        });
        expect(handleCreated).toHaveBeenCalledWith(
          expect.objectContaining({ name: "The New Family Kitchen" })
        );
      });
    });

    it("renders collaborative household details, generates secure link, copies to clipboard, and shows social share buttons", async () => {
      const handleClose = vi.fn();

      render(
        <HouseholdInviteModal
          apiClient={mockApiClient as OnboardingApiClient}
          currentHousehold={mockHousehold}
          isOpen={true}
          onClose={handleClose}
        />
      );

      // Active household banner
      expect(screen.getByText("The Sharma Household")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE HOUSEHOLD")).toBeInTheDocument();

      // Pending invitations loaded
      await waitFor(() => {
        expect(screen.getByText("priya.sharma@example.com")).toBeInTheDocument();
      });

      // Fill in optional invitee and click Generate Secure Invitation Link
      const emailInput = screen.getByPlaceholderText(/family\.member@example\.com/i);
      fireEvent.change(emailInput, { target: { value: "sister@example.com" } });

      const genBtn = screen.getByRole("button", { name: /generate secure invitation link/i });
      fireEvent.click(genBtn);

      await waitFor(() => {
        expect(mockApiClient.createInvitation).toHaveBeenCalledWith({
          householdId: "hh_sharma_123",
          email: "sister@example.com",
          role: "member"
        });
      });

      // Link generated and displayed
      await waitFor(() => {
        expect(screen.getByLabelText(/generated invitation url/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /copy invitation link/i })).toBeInTheDocument();
      });

      // Copy link
      const copyBtn = screen.getByRole("button", { name: /copy invitation link/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(screen.getByText(/copied to clipboard!/i)).toBeInTheDocument();
      });

      // Social share buttons present
      expect(screen.getByRole("button", { name: /share via whatsapp/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /share via telegram/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /share via email/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /share via sms/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /open device share sheet/i })).toBeInTheDocument();
    });

    it("allows revoking a pending invitation", async () => {
      render(
        <HouseholdInviteModal
          apiClient={mockApiClient as OnboardingApiClient}
          currentHousehold={mockHousehold}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("priya.sharma@example.com")).toBeInTheDocument();
      });

      const revokeBtn = screen.getByRole("button", { name: /revoke invitation for priya\.sharma@example\.com/i });
      fireEvent.click(revokeBtn);

      await waitFor(() => {
        expect(mockApiClient.revokeInvitation).toHaveBeenCalledWith("inv_456");
        expect(screen.queryByText("priya.sharma@example.com")).not.toBeInTheDocument();
      });
    });
  });

  describe("TermsOfService Legal View", () => {
    it("renders legal agreement, packaging precedence warning, and return button", () => {
      const handleBack = vi.fn();
      render(<TermsOfService onBack={handleBack} />);

      expect(screen.getByRole("heading", { level: 1, name: /terms of service/i })).toBeInTheDocument();
      expect(screen.getByText(/not medical advice & mandatory packaging verification/i)).toBeInTheDocument();
      expect(screen.getByText(/camera feed during barcode scanning is processed strictly in temporary device memory/i)).toBeInTheDocument();

      const returnBtn = screen.getByRole("button", { name: /return to application/i });
      fireEvent.click(returnBtn);
      expect(handleBack).toHaveBeenCalledTimes(1);
    });
  });
});
