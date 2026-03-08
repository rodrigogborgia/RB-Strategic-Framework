import { api } from "../../lib/api";

describe("Integración descarga de PDF", () => {
  it("envía el lead para descarga de PDF", async () => {
    const unique = Date.now();
    const response = await api.pdfDownload(
      "Test Integracion",
      `pdf-integration-${unique}@example.com`,
      "si_te_calentas_perdes",
    );

    expect(response).toBeDefined();
    expect(response.ok).toBe(true);
    expect(typeof response.message).toBe("string");
    expect(response.message.length).toBeGreaterThan(0);
  });
});
