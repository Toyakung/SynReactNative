import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
  // Force the AI client to fall back to the deterministic built-in engine
  // so the UI flow is fully exercised without network.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TK ONE platform flow", () => {
  it("renders the intake step first", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "ความต้องการลูกค้า" })).toBeInTheDocument();
  });

  it("blocks navigation when the requirement is invalid", async () => {
    const user = userEvent.setup();
    render(<App />);
    const min = screen.getByLabelText("งบต่ำสุด (บาท)");
    await user.clear(min); // make budgetMin empty → invalid
    await user.click(screen.getByRole("button", { name: /ถัดไป/ }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    // still on intake
    expect(screen.getByRole("heading", { name: "ความต้องการลูกค้า" })).toBeInTheDocument();
  });

  it("walks intake → candidates → AI analysis (built-in fallback)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /ถัดไป/ }));
    expect(screen.getByRole("heading", { name: "ทรัพย์ที่หามา" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ให้ AI วิเคราะห์/ }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "ผลวิเคราะห์ของ AI" })).toBeInTheDocument(),
    );
    // engine transparency label shows the fallback engine
    expect(await screen.findByText(/built-in/)).toBeInTheDocument();
    // recommendation card present
    expect(screen.getByText("AI แนะนำอันดับ 1")).toBeInTheDocument();
  });

  it("adds a candidate through the modal with validation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /ถัดไป/ }));

    await user.click(screen.getByRole("button", { name: "+ เพิ่มทรัพย์" }));
    const dialog = screen.getByRole("dialog");

    // Save is disabled until a name is provided
    const save = within(dialog).getByRole("button", { name: "บันทึก" });
    expect(save).toBeDisabled();

    await user.type(within(dialog).getByLabelText("ชื่อทรัพย์ *"), "Test Tower");
    expect(save).toBeEnabled();
    await user.click(save);

    expect(screen.getByText("Test Tower")).toBeInTheDocument();
  });
});
