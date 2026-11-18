import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider, useTranslation, LanguageSelector, SUPPORTED_LANGUAGES } from "../../src/i18n";

function TestConsumer() {
  const { t, language } = useTranslation();
  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <h1 data-testid="nav-kitchen">{t.nav.kitchen}</h1>
      <p data-testid="hero-headline">{t.hero.headlinePart1}</p>
      <LanguageSelector />
    </div>
  );
}

describe("Phase 10: Indian Regional Language Localization", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("provides 5 Indian regional languages (English, Hindi, Marathi, Tamil, Telugu)", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(5);
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(["en", "hi", "mr", "ta", "te"]);
  });

  it("defaults to English when no preference is saved", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId("current-lang").textContent).toBe("en");
    expect(screen.getByTestId("nav-kitchen").textContent).toBe("My Kitchen");
    expect(screen.getByTestId("hero-headline").textContent).toBe("Know Your Food.");
  });

  it("switches to Hindi dynamically and renders Hindi text", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    const select = screen.getByLabelText("Language selector");
    fireEvent.change(select, { target: { value: "hi" } });

    expect(screen.getByTestId("current-lang").textContent).toBe("hi");
    expect(screen.getByTestId("nav-kitchen").textContent).toBe("मेरी रसोई");
    expect(screen.getByTestId("hero-headline").textContent).toBe("अपने भोजन को जानें।");
    expect(localStorage.getItem("foodcue_preferred_language")).toBe("hi");
  });

  it("switches to Marathi and renders Marathi text", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    const select = screen.getByLabelText("Language selector");
    fireEvent.change(select, { target: { value: "mr" } });

    expect(screen.getByTestId("current-lang").textContent).toBe("mr");
    expect(screen.getByTestId("nav-kitchen").textContent).toBe("माझे स्वयंपाकघर");
  });

  it("switches to Tamil and renders Tamil text", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    const select = screen.getByLabelText("Language selector");
    fireEvent.change(select, { target: { value: "ta" } });

    expect(screen.getByTestId("current-lang").textContent).toBe("ta");
    expect(screen.getByTestId("nav-kitchen").textContent).toBe("என் சமையலறை");
  });

  it("switches to Telugu and renders Telugu text", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    const select = screen.getByLabelText("Language selector");
    fireEvent.change(select, { target: { value: "te" } });

    expect(screen.getByTestId("current-lang").textContent).toBe("te");
    expect(screen.getByTestId("nav-kitchen").textContent).toBe("నా వంటగది");
  });
});
