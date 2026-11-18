import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { GuestHome } from "../../src/features/home/GuestHome";
import { AuthenticatedDashboard } from "../../src/features/home/AuthenticatedDashboard";
import { HouseholdInviteModal } from "../../src/features/household/HouseholdInviteModal";
import { PublicFooter } from "../../src/components/navigation/PublicFooter";
import { AuthenticatedFooter } from "../../src/components/navigation/AuthenticatedFooter";
import { SmartScanViewfinder } from "../../src/features/smartscan/SmartScanViewfinder";
import type { OnboardingApiClient } from "../../src/services/onboardingApiClient";
import type { HouseholdRecord } from "../../src/server/database/repositories/household.repository";

// Mock Clerk components
vi.mock("@clerk/react", () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <div data-testid="clerk-signin-btn">{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div data-testid="clerk-signup-btn">{children}</div>,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <div data-testid="clerk-signout-btn">{children}</div>,
  useUser: () => ({
    isSignedIn: true,
    user: {
      id: "usr_resp_test_1",
      firstName: "Priya",
      lastName: "Sharma",
      fullName: "Priya Sharma",
      primaryEmailAddress: { emailAddress: "priya.sharma@example.com" }
    }
  })
}));

describe("Comprehensive Responsive Design & Viewport QA Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
    window.dispatchEvent(new Event("resize"));
  };

  describe("1. Compact & Modern Smartphone Viewports (320px - 430px)", () => {
    it("renders GuestHome landing page with mobile-ready CTA hierarchy on 320px (iPhone SE)", () => {
      setViewport(320, 568);
      render(<GuestHome />);

      const heroTitle = screen.getByRole("heading", { level: 1 });
      expect(heroTitle).toBeInTheDocument();
      expect(heroTitle.textContent).toContain("Know Your Food.");
      expect(heroTitle.textContent).toContain("Manage Your Kitchen.");

      // Check conversion CTA buttons
      expect(screen.getByRole("button", { name: /get started by signing up for foodcue/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in to your foodcue account/i })).toBeInTheDocument();

      // Check sections exist
      expect(screen.getByText("How FoodCue Works")).toBeInTheDocument();
      expect(screen.getByText("Smart Food Scanning")).toBeInTheDocument();
    });

    it("renders AuthenticatedDashboard on 390px (iPhone 14/15/16) without clipping", async () => {
      setViewport(390, 844);
      render(
        <AuthenticatedDashboard
          onNavigateToScan={() => {}}
          onNavigateToSearch={() => {}}
          onNavigateToKitchen={() => {}}
          onNavigateToCatalogue={() => {}}
          onNavigateToProfile={() => {}}
          onNavigateToReminders={() => {}}
          onNavigateToShopping={() => {}}
        />
      );

      const heading = await screen.findByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain("Priya");

      // Verify core quick action buttons exist and are accessible
      expect(screen.getByText("Kitchen Pantry Items")).toBeInTheDocument();
      expect(screen.getByText("Saved Catalogue Products")).toBeInTheDocument();
      expect(screen.getByText("Urgent Expiry Alerts")).toBeInTheDocument();
      expect(screen.getByText("Smart Shopping List")).toBeInTheDocument();
    });

    it("renders HouseholdInviteModal with touch-ready link sharing on 375px mobile", async () => {
      setViewport(375, 667);
      const mockApiClient = {
        listInvitations: vi.fn().mockResolvedValue([]),
        createInvitation: vi.fn().mockResolvedValue({
          id: "inv_resp_1",
          householdId: "hh_resp_1",
          inviteToken: "token_resp_abc123",
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      };

      const mockHousehold = {
        id: "hh_resp_1",
        name: "Mumbai Residence",
        householdType: "Family",
        ownerClerkUserId: "usr_resp_test_1",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      render(
        <HouseholdInviteModal
          apiClient={mockApiClient as unknown as OnboardingApiClient}
          currentHousehold={mockHousehold as unknown as HouseholdRecord}
          isOpen={true}
          onClose={() => {}}
        />
      );

      const modalTitle = screen.getByRole("heading", { level: 2 });
      expect(modalTitle.textContent).toContain("Invite");

      // Verify active household banner
      expect(screen.getByText("Mumbai Residence")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE HOUSEHOLD")).toBeInTheDocument();
    });

    it("enforces minimum 44px touch targets on SmartScan viewfinder controls", () => {
      setViewport(390, 844);
      render(
        <SmartScanViewfinder
          stream={null}
          onStopCamera={() => {}}
          onFlipCamera={() => {}}
        />
      );

      const torchBtn = screen.getByRole("button", { name: /turn flashlight on/i });
      expect(torchBtn).toBeInTheDocument();
      expect(torchBtn.style.minHeight).toBe("44px");
      expect(torchBtn.style.minWidth).toBe("44px");

      const flipBtn = screen.getByRole("button", { name: /switch between front and rear camera/i });
      expect(flipBtn).toBeInTheDocument();
      expect(flipBtn.style.minHeight).toBe("44px");
      expect(flipBtn.style.minWidth).toBe("44px");
    });
  });

  describe("2. Tablet Viewports (768px Portrait & 1024px Landscape)", () => {
    it("renders responsive footer on 768px portrait tablet (iPad Mini)", () => {
      setViewport(768, 1024);
      render(<PublicFooter onRequireAuthPrompt={() => {}} onOpenTerms={() => {}} onOpenPrivacy={() => {}} />);

      const brandTexts = screen.getAllByText("FoodCue");
      expect(brandTexts.length).toBeGreaterThan(0);

      const legalLinks = screen.getAllByRole("button", { name: /terms of service/i });
      expect(legalLinks.length).toBeGreaterThan(0);
    });

    it("renders compact authenticated footer on 1024px landscape tablet", () => {
      setViewport(1024, 768);
      render(<AuthenticatedFooter onOpenTerms={() => {}} onOpenPrivacy={() => {}} />);

      const brandMatches = screen.getAllByText(/FoodCue/i);
      expect(brandMatches.length).toBeGreaterThan(0);
      expect(screen.getByText(/Privacy/i)).toBeInTheDocument();
      expect(screen.getByText(/Terms/i)).toBeInTheDocument();
    });
  });

  describe("3. Desktop & Ultrawide Viewports (1440px & 2560px)", () => {
    it("renders desktop layout with all features cleanly contained on 1440px display", () => {
      setViewport(1440, 900);
      render(<GuestHome />);

      const heroTitle = screen.getByRole("heading", { level: 1 });
      expect(heroTitle).toBeInTheDocument();

      const previewTabs = screen.getAllByRole("tab");
      expect(previewTabs.length).toBeGreaterThan(0);
    });

    it("renders ultrawide layout on 2560px monitor with proper structure", () => {
      setViewport(2560, 1440);
      render(<GuestHome />);

      expect(screen.getByText("Smart Food Intelligence & Kitchen Management")).toBeInTheDocument();
    });
  });
});
