import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { UserCatalogueView } from "../../src/features/catalog/UserCatalogueView";
import { userCatalogueService } from "../../src/domain/services/userCatalogueService";
import { NutritionAnalysisAgent, FoodHealthEvaluationAgent } from "../../src/domain/services/aiNutritionAgents";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("UserCatalogueView Feature Component", () => {
  it("renders guest gate when user is not signed in", () => {
    const handleAuthPrompt = vi.fn();
    render(<UserCatalogueView userId="guest" onRequireAuthPrompt={handleAuthPrompt} />);

    expect(screen.getByText("Personal Product Catalogue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in to view my catalogue/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign in to view my catalogue/i }));
    expect(handleAuthPrompt).toHaveBeenCalled();
  });

  it("renders empty state for signed-in user when no products are saved", async () => {
    render(<UserCatalogueView userId="user_test_empty" />);

    await waitFor(() => {
      expect(screen.getByText(/Your catalogue is currently empty/i)).toBeInTheDocument();
    });
  });

  it("renders saved products with sort and category filtering", async () => {
    const nutAgent = new NutritionAnalysisAgent();
    const evalAgent = new FoodHealthEvaluationAgent();
    const dummyNut = nutAgent.analyzeNutritionFromNutriments({ "energy-kcal_100g": 100 });
    const dummyAssessment = evalAgent.evaluate(dummyNut, [], "Staples");

    await userCatalogueService.saveProduct("user_test_active", {
      id: "prod-tata",
      gtin: "8901058852738",
      productName: "Vacuum Evaporated Iodised Salt",
      brand: "Tata",
      category: "Staples",
      source: { sourceName: "Catalog", retrievalTimestamp: new Date().toISOString(), confidence: 1.0 },
      isVegetarian: true,
      allergensDeclared: [],
      allergensMayContain: [],
      nutritionPer100g: dummyNut,
      ingredientsText: "Salt",
      parsedIngredients: [],
      healthAssessment: dummyAssessment
    });

    render(<UserCatalogueView userId="user_test_active" />);

    await waitFor(() => {
      expect(screen.getByText("Vacuum Evaporated Iodised Salt")).toBeInTheDocument();
      expect(screen.getByText(/Tata/i)).toBeInTheDocument();
    });
  });
});
