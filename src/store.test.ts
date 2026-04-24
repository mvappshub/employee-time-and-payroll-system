import { describe, expect, it } from "vitest";

import { useStore } from "./infrastructure/state/store";

describe("holiday defaults", () => {
  it("contains Czech public holidays for 2026", () => {
    const holidays = useStore.getState().holidays;

    expect(holidays.some(h => h.date === "2026-04-06")).toBe(true);
    expect(holidays.some(h => h.date === "2026-12-25")).toBe(true);
  });
});

describe("month initialization", () => {
  it("starts a new month empty instead of prefilled", () => {
    useStore.getState().initMonth("2030-01");

    const records = useStore.getState().records["2030-01"];
    expect(records).toHaveLength(31);
    expect(records?.every(record => record.shift === "" && record.arrival === "" && record.departure === "")).toBe(true);
    expect(useStore.getState().monthStatus["2030-01"]).toBe("empty");
  });

  it("prefills only the selected month on explicit request", () => {
    useStore.getState().initMonth("2030-02");
    useStore.getState().prefillMonth("2030-02");

    const records = useStore.getState().records["2030-02"];
    expect(records?.some(record => record.shift === "ranní")).toBe(true);
    expect(useStore.getState().monthStatus["2030-02"]).toBe("prefilled");
    expect(useStore.getState().records["2030-03"]).toBeUndefined();
  });
});

describe("employmentType", () => {
  it("defaults to pracovni_pomer", () => {
    const { employee } = useStore.getState();
    expect(employee.employmentType).toBe("pracovni_pomer");
  });

  it("migrates legacy HPP to pracovni_pomer", () => {
    useStore.getState().setEmployee({ employmentType: "HPP" as never });
    expect(useStore.getState().employee.employmentType).toBe("pracovni_pomer");
  });

  it("does not allow free-text employmentType", () => {
    const { employee } = useStore.getState();
    const validTypes = ["pracovni_pomer", "dpc", "dpp"];
    expect(validTypes.includes(employee.employmentType)).toBe(true);
  });
});

describe("payslip metadata defaults", () => {
  it("starts with empty employer profile and vacation summary fields", () => {
    const { employer, employee } = useStore.getState();

    expect(employer).toEqual({ name: "", ico: "", seat: "" });
    expect(employee.employeeNumber).toBe("");
    expect(employee.vacationEntitlementHours).toBe(0);
    expect(employee.vacationUsedHours).toBe(0);
    expect(employee.vacationRemainingHours).toBe(0);
  });

  it("keeps the current employer when loading a legacy month without employer snapshot", () => {
    useStore.getState().setEmployer({ name: "ACME", ico: "12345678", seat: "Praha" });

    useStore.getState().hydrateMonth("2030-04", {
      employee: useStore.getState().employee,
      records: [],
      paySlipInputs: {
        manualReward: 0,
        includeManualRewardInAverage: false,
        unworked: 0,
        sickCarryoverDays: 0,
      },
    });

    expect(useStore.getState().employer).toEqual({
      name: "ACME",
      ico: "12345678",
      seat: "Praha",
    });
  });

  it("hydrates persisted workflow status from a saved month record", () => {
    useStore.getState().hydrateMonth("2030-05", {
      employee: useStore.getState().employee,
      records: [],
      paySlipInputs: {
        manualReward: 0,
        includeManualRewardInAverage: false,
        unworked: 0,
        sickCarryoverDays: 0,
      },
      workflowStatus: "closed",
    });

    expect(useStore.getState().monthStatus["2030-05"]).toBe("closed");
  });
});
