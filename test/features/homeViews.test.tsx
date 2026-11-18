import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GuestHome } from "../../src/features/home/GuestHome";
import { AuthenticatedDashboard } from "../../src/features/home/AuthenticatedDashboard";

// Mock Clerk useUser hook and auth buttons
vi.mock("@clerk/react", () => ({
  useUser: () => ({
    user: {
      id: "user_test_dash",
      firstName: "Aarav",
      fullName: "Aarav Sharma"
    },
    isSignedIn: true
  }),
  SignInButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

afterEach(() => {
  cleanup();
});

describe("Homepage Redesign Views (Guest vs Authenticated)", () => {
  describe("GuestHome Component", () => {
    it("renders hero section with tagline and instant action buttons", () => {
      const handleScan = vi.fn();
      const handleSearch = vi.fn();
      const handleAuth = vi.fn();

      render(
        <GuestHome
          onOpenScan={handleScan}
          onOpenSearch={handleSearch}
          onRequireAuthPrompt={handleAuth}
        />
      );

      // Hero Title
      expect(screen.getByText(/Know Your Food/i)).toBeInTheDocument();
      expect(screen.getByText(/Manage Your Kitchen/i)).toBeInTheDocument();

      // Action Buttons
      expect(screen.getByRole("button", { name: /get started by signing up for foodcue/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in to your foodcue account/i })).toBeInTheDocument();

      // How it Works section
      expect(screen.getByText("How FoodCue Works")).toBeInTheDocument();
      expect(screen.getByText("Understand Your Products")).toBeInTheDocument();

      // Product Introduction section
      expect(screen.getByText("A Connected Way to Understand and Manage Your Food")).toBeInTheDocument();

      // Features section
      expect(screen.getByText("Built for Real Kitchens & Real Families")).toBeInTheDocument();
      expect(screen.getByText("Smart Food Scanning")).toBeInTheDocument();
      expect(screen.getByText("Allergy Awareness")).toBeInTheDocument();

      // Preview Section
      expect(screen.getByText("Designed for Real Kitchens")).toBeInTheDocument();

      // Trust & Transparency
      expect(screen.getByText("Trust, Transparency & Data Accuracy")).toBeInTheDocument();

      // Final CTA
      expect(screen.getByText("Start Managing Your Kitchen with FoodCue.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create your account/i })).toBeInTheDocument();

      // Verification that no development age-range references (10 to 70) exist in rendered output
      expect(screen.queryByText(/10 to 70/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/ages 10/i)).not.toBeInTheDocument();
    });
  });

  describe("AuthenticatedDashboard Component", () => {
    it("renders personalized greeting, guard bar, and 4 core summary cards", () => {
      const handleScan = vi.fn();
      const handleSearch = vi.fn();
      const handleKitchen = vi.fn();
      const handleCatalogue = vi.fn();
      const handleProfile = vi.fn();
      const handleReminders = vi.fn();
      const handleShopping = vi.fn();

      render(
        <AuthenticatedDashboard
          onNavigateToScan={handleScan}
          onNavigateToSearch={handleSearch}
          onNavigateToKitchen={handleKitchen}
          onNavigateToCatalogue={handleCatalogue}
          onNavigateToProfile={handleProfile}
          onNavigateToReminders={handleReminders}
          onNavigateToShopping={handleShopping}
        />
      );

      // Greeting
      expect(screen.getByText(/(Welcome back|Good (morning|afternoon|evening)),/i)).toBeInTheDocument();
      expect(screen.getByText("Aarav")).toBeInTheDocument();

      // Guard Bar
      expect(screen.getByText(/Personal Kitchen Mode/i)).toBeInTheDocument();

      // Core Cards
      expect(screen.getByText("Kitchen Pantry Items")).toBeInTheDocument();
      expect(screen.getByText("Saved Catalogue Products")).toBeInTheDocument();
      expect(screen.getByText("Urgent Expiry Alerts")).toBeInTheDocument();
      expect(screen.getByText("Smart Shopping List")).toBeInTheDocument();

      // Action click
      fireEvent.click(screen.getByRole("button", { name: /view my catalogue/i }));
      expect(handleCatalogue).toHaveBeenCalled();
    });
  });
});
