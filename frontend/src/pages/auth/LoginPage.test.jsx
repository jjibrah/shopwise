import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
const login = vi.fn();
vi.mock("../../features/auth/AuthContext", () => ({
  useAuth: () => ({ login }),
}));
function setup(state) {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<p>Owner workspace</p>} />
        <Route path="/pos" element={<p>Staff workspace</p>} />
        <Route path="/app/reports" element={<p>Reports workspace</p>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "owner@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password1" },
  });
}
describe("Pharmacy sign in", () => {
  beforeEach(() => {
    login.mockReset();
  });
  it.each([
    ["owner", "Owner workspace"],
    ["shopkeeper", "Staff workspace"],
  ])("opens the correct workspace for %s", async (role, heading) => {
    login.mockResolvedValue({ role });
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText(heading);
    expect(login).toHaveBeenCalledWith("owner@example.com", "password1");
  });
  it("preserves the originally requested destination", async () => {
    login.mockResolvedValue({ role: "owner" });
    setup({ from: { pathname: "/app/reports" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Reports workspace");
  });
  it("shows an API error and allows retrying", async () => {
    login.mockRejectedValue(new Error("Invalid credentials"));
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid credentials",
      ),
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
  it("reveals and hides the entered password without changing it", () => {
    setup();
    const input = screen.getByLabelText("Password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("password1");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
