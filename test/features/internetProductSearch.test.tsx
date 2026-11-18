import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { InternetProductSearch } from "../../src/features/search/InternetProductSearch";

beforeEach(() => {
  vi.spyOn(global, "fetch").mockImplementation(() =>
    Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ products: [] })
    } as unknown as Response)
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("InternetProductSearch Feature Component", () => {
  it("renders search bar and popular search suggestion chips", () => {
    render(<InternetProductSearch userId="test-user" />);

    expect(screen.getByPlaceholderText(/search by product name, brand/i)).toBeInTheDocument();
    expect(screen.getByText("Popular in India:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Amul Butter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maggi 2-Minute Noodles" })).toBeInTheDocument();
  });

  it("searches and displays matching products from local catalog", async () => {
    render(<InternetProductSearch userId="test-user" />);

    const input = screen.getByPlaceholderText(/search by product name, brand/i);
    fireEvent.change(input, { target: { value: "Tata Salt" } });

    const searchBtn = screen.getByRole("button", { name: /^search$/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/View Food Intelligence/i).length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  it("opens product intelligence card when clicking view details", async () => {
    render(<InternetProductSearch userId="test-user" />);

    const input = screen.getByPlaceholderText(/search by product name, brand/i);
    fireEvent.change(input, { target: { value: "Tata" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/View Food Intelligence/i).length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    fireEvent.click(screen.getAllByText(/View Food Intelligence/i)[0]);

    await waitFor(() => {
      expect(screen.getByText(/What does this mean for you\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Nutritional Strengths/i)).toBeInTheDocument();
    });
  });
});
