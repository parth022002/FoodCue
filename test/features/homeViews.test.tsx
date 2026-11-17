import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GuestHome } from "../../src/features/home/GuestHome";
import { AuthenticatedDashboard } from "../../src/features/home/AuthenticatedDashboard";

// Mock Clerk useUser hook
vi.mock("@clerk/react", () => ({
  useUser: () => ({
    user: {
      id: "user_test_dash",
      firstName: "Aarav",
      fullName: "Aarav Sharma"
    },
    isSignedIn: true
  })
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
      expect(screen.getByText(/Know What You Eat/i)).toBeInTheDocument();
      expect(screen.getByText(/Make Better Choices/i)).toBeInTheDocument();

      // Action Buttons
      const scanBtn = screen.getByRole("button", { name: /scan a food product/i });
      expect(scanBtn).toBeInTheDocument();
      fireEvent.click(scanBtn);
      expect(handleScan).toHaveBeenCalled();

      // How it Works section
      expect(screen.getByText("How FoodCue Works")).toBeInTheDocument();
      expect(screen.getByText("Clear Health Score")).toBeInTheDocument();
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
      expect(screen.getByText(/Welcome back,/i)).toBeInTheDocument();
      expect(screen.getByText("Aarav")).toBeInTheDocument();

      // Guard Bar
      expect(screen.getByText(/Active Personal Guard:/i)).toBeInTheDocument();

      // Core Cards
      expect(screen.getByText("Kitchen Pantry Items")).toBeInTheDocument();
      expect(screen.getByText("Saved Catalogue Products")).toBeInTheDocument();
      expect(screen.getByText("Urgent Expiry Reminders")).toBeInTheDocument();
      expect(screen.getByText("Smart Shopping List")).toBeInTheDocument();

      // Action click
      fireEvent.click(screen.getByRole("button", { name: /view my catalogue/i }));
      expect(handleCatalogue).toHaveBeenCalled();
    });
  });
});
