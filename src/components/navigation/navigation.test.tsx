import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FoodCueLogo } from "../brand/FoodCueLogo";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

afterEach(() => {
  cleanup();
});

// Mock Clerk components
const mockUser = {
  id: "user_aarav_nav_test",
  fullName: "Aarav Sharma",
  firstName: "Aarav",
  lastName: "Sharma",
  primaryEmailAddress: { emailAddress: "aarav.sharma@example.com" },
  imageUrl: null
};

let mockIsSignedIn = false;

vi.mock("@clerk/react", () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useUser: () => ({
    user: mockIsSignedIn ? mockUser : null,
    isSignedIn: mockIsSignedIn,
    isLoaded: true
  }),
  useAuth: () => ({
    getToken: async () => (mockIsSignedIn ? "mock_token" : null),
    isSignedIn: mockIsSignedIn,
    isLoaded: true
  })
}));

describe("FoodCue Brand & Navigation Redesign", () => {
  it("renders FoodCueLogo with correct accessibility attributes", () => {
    render(<FoodCueLogo size={40} showText showTagline />);
    expect(screen.getByText("FoodCue")).toBeInTheDocument();
    expect(screen.getByText("Know your food. Manage your kitchen.")).toBeInTheDocument();
  });

  it("renders minimal public landing Navbar with ONLY logo, Sign In and Sign Up when unauthenticated", () => {
    mockIsSignedIn = false;
    const handleSelectTab = vi.fn();
    render(<Navbar activeTab="home" onSelectTab={handleSelectTab} />);

    // Brand and logo
    expect(screen.getByText("FoodCue")).toBeInTheDocument();
    expect(screen.getByText("Know your food. Manage your kitchen.")).toBeInTheDocument();

    // Sign In & Sign Up buttons present
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();

    // No application-specific navigation links on the public landing page
    expect(screen.queryByRole("button", { name: /scan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /my kitchen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /shopping list/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /explore/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /invite/i })).not.toBeInTheDocument();
  });

  it("renders Authenticated Navbar with 5 destinations, Notifications, Invite, and Profile in mandatory order", () => {
    mockIsSignedIn = true;
    const handleSelectTab = vi.fn();
    const handleOpenInvite = vi.fn();

    render(
      <Navbar
        activeTab="kitchen"
        onSelectTab={handleSelectTab}
        onOpenInviteModal={handleOpenInvite}
        notificationCount={2}
      />
    );

    // Brand and logo
    expect(screen.getByText("FoodCue")).toBeInTheDocument();

    // 5 Main Navigation Links
    expect(screen.getByRole("button", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /my kitchen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^scan$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shopping list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /explore/i })).toBeInTheDocument();

    // Right-side actions: Notifications, Invite, Profile
    expect(screen.getByRole("button", { name: /notifications and expiry reminders/i })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Notification count badge

    // Invite Button
    const inviteBtn = screen.getByRole("button", { name: /invite family & friends/i });
    expect(inviteBtn).toBeInTheDocument();
    fireEvent.click(inviteBtn);
    expect(handleOpenInvite).toHaveBeenCalledTimes(1);

    // Profile Trigger
    expect(screen.getByRole("button", { name: /user account and profile menu/i })).toBeInTheDocument();
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();

    // Click tab
    fireEvent.click(screen.getByRole("button", { name: /shopping list/i }));
    expect(handleSelectTab).toHaveBeenCalledWith("shopping");
  });

  it("renders PublicFooter with brand description, capabilities, legal, and account buttons for unauthenticated visitors", () => {
    mockIsSignedIn = false;
    const handleSelectTab = vi.fn();
    render(<Footer onSelectTab={handleSelectTab} />);

    // Brand and description
    expect(screen.getByText(/FoodCue helps you discover food products/i)).toBeInTheDocument();

    // Capabilities
    expect(screen.getByRole("button", { name: /smartscan barcode decoding/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /digital kitchen & pantry/i })).toBeInTheDocument();

    // Legal
    expect(screen.getAllByRole("button", { name: /privacy policy/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /terms of service/i }).length).toBeGreaterThan(0);

    // Account CTAs
    expect(screen.getByRole("button", { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create a free foodcue account/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} FoodCue`, "i"))).toBeInTheDocument();
  });

  it("renders AuthenticatedFooter as a compact, subtle application footer for signed-in users", () => {
    mockIsSignedIn = true;
    const handleSelectTab = vi.fn();
    render(<Footer onSelectTab={handleSelectTab} />);

    // Compact footer
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} FoodCue`, "i"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /privacy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /terms/i })).toBeInTheDocument();
    expect(screen.getByText(/help & feedback/i)).toBeInTheDocument();

    // Marketing columns must NOT be present in authenticated workspace
    expect(screen.queryByText(/Capabilities/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create a free foodcue account/i })).not.toBeInTheDocument();
  });
});
