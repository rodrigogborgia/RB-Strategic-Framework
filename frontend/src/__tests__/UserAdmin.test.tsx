import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { api } from "../lib/api";
jest.mock("../lib/api", () => {
  const actualApi = jest.requireActual("../lib/api");
  return {
    ...actualApi,
    adminCreateUser: jest.fn(),
  };
});

test("crea un usuario nuevo", () => {
  render(<div>
    <input placeholder="Email" />
    <input placeholder="Nombre completo" />
    <button onClick={() => api.adminCreateUser({ email: "test@demo.com", password: "1234", full_name: "Test User", role: "student" })}>Crear usuario</button>
  </div>);
  fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "test@demo.com" } });
  fireEvent.change(screen.getByPlaceholderText(/Nombre completo/i), { target: { value: "Test User" } });
  fireEvent.click(screen.getByText(/Crear usuario/i));
  expect(api.adminCreateUser).toHaveBeenCalled();
});
