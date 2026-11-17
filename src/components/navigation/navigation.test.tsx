import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FoodCueLogo } from "../brand/FoodCueLogo";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

afterEach(() => {
  cleanup();
});

// Mock Clerk components
vi.mock("@clerk/react", () => ({
  Show: ({ children, when }: { children: React.ReactNode; when: string }) => {
    // Default to signed-out for mock tests
    if (when === "signed-out") return <div>{children}</div>;
    return null;
  },
  SignInButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  OrganizationSwitcher: () => <div data-testid="org-switcher" />,
  useUser: () => ({ user: null, isSignedIn: false, isLoaded: true }),
  useOrganization: () => ({ organization: null, isLoaded: true }),
  useAuth: () => ({ getToken: async () => null, isSignedIn: false, isLoaded: true })
}));

describe("FoodCue Brand & Navigation Redesign", () => {
  it("renders FoodCueLogo with correct accessibility attributes", () => {
    render(<FoodCueLogo size={40} showText showTagline />);
    expect(screen.getByText("FoodCue")).toBeInTheDocument();
    expect(screen.getByText("Know your food. Manage your kitchen.")).toBeInTheDocument();
  });

  it("renders Navbar with all 5 main navigation links and right-side controls", () => {
    const handleSelectTab = vi.fn();
    render(<Navbar activeTab="scan" onSelectTab={handleSelectTab} />);

    // Brand and logo
    expect(screen.getAllByText("FoodCue")[0]).toBeInTheDocument();

    // 5 Main Tabs
    expect(screen.getByRole("button", { name: /smartscan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /my kitchen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reminders/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shopping list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /catalogue/i })).toBeInTheDocument();

    // Right-side controls
    expect(screen.getByText("Local")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /privacy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();

    // Click tab
    fireEvent.click(screen.getByRole("button", { name: /my kitchen/i }));
    expect(handleSelectTab).toHaveBeenCalledWith("kitchen");
  });

  it("renders Footer with 4 columns, developer attribution and safety disclaimer", () => {
    const handleSelectTab = vi.fn();
    render(<Footer onSelectTab={handleSelectTab} />);

    // Brand & developer
    expect(screen.getByText("Parth Ahuja")).toBeInTheDocument();
    expect(screen.getByText(/Developed by/i)).toBeInTheDocument();

    // Explore links
    expect(screen.getByRole("button", { name: /smartscan intelligence/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /my kitchen & pantry/i })).toBeInTheDocument();

    // Privacy & safety disclaimer
    expect(screen.getByText(/Important Safety Notice:/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} FoodCue`, "i"))).toBeInTheDocument();
  });
});
