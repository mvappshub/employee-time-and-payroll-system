import { describe, expect, it, vi } from "vitest";

import {
  calcAverageSourceSnapshot,
  calcReducedAverageHourlyBasis,
  calcMonthlyTaxBeforeCredits,
  calcMonthlySummary,
  calcPaySlip,
  calculateDay,
  calculateMonthDays,
  convertDailySickPayReductionLimitsToHourly,
  roundTaxBase,
  roundUpToWholeCrown,
  SICK_PAY_HOURLY_REDUCTION_LIMITS_2026,
  type MonthlySummary
} from "./domain/payroll/calc";
import * as legalConstants from "./domain/payroll/legalConstants";
import type { EmployeeSettings, Holiday, ShiftType, TimeRecord } from "./domain/shared/types";

const employee: EmployeeSettings = {
  name: "Test",
  employeeNumber: "",
  employmentType: "pracovni_pomer",
  remunerationType: "mzda",
  employmentStartDate: "2026-01-01",
  workload: 1,
  weeklyHours: 40,
  workDaysPerWeek: 5,
  weekendWorking: false,
  shiftStart: "06:00",
  shiftEnd: "14:30",
  standardBreak: 0.5,
  nightWorkAllowed: true,
  nightFrom: "22:00",
  nightTo: "06:00",
  overtimeAllowed: true,
  baseSalary: 32000,
  personalBonus: 0.25,
  nightSurcharge: 0.1,
  weekendSurcharge: 0.1,
  holidaySurcharge: 1,
  overtimeSurcharge: 0.25,
  sickCompensation: 0.6,
  holidayCompensationMode: "time-off",
  overtimeCompensationMode: "premium",
  appliesHealthMinimumBase: true,
  healthMinimumBaseExceptionReason: "",
  taxDeclarationSigned: true,
  taxpayerCreditApplied: true,
  vacationEntitlementHours: 0,
  vacationUsedHours: 0,
  vacationRemainingHours: 0,
};

function monthlySummary(overrides: Partial<MonthlySummary> = {}): MonthlySummary {
  return {
    workDaysWH: 20,
    workHoursWH: 160,
    workedDays: 20,
    workedHours: 160,
    totalHolidayCredit: 0,
    totalHolidayWorked: 0,
    totalVacation: 0,
    totalSick: 0,
    totalNight: 0,
    totalWeekend: 0,
    totalHolidayTotal: 0,
    totalOvertime: 0,
    totalRecognized: 160,
    totalSaldo: 0,
    holidayDaysInMonth: 0,
    freeDaysInMonth: 0,
    calendarWorkDays: 20,
    calendarWorkHours: 160,
    monthlyFundHours: 160,
    ...overrides,
  };
}

describe("calcPaySlip", () => {
  it("handles a regular month without deviations", () => {
    const payslip = calcPaySlip(employee, monthlySummary(), 0, 0, 250);

    expect(payslip.hrubaMzda).toBe(40000);
    expect(payslip.nightSurchargeCalc).toBe(0);
    expect(payslip.weekendSurchargeCalc).toBe(0);
    expect(payslip.holidaySurchargeCalc).toBe(0);
    expect(payslip.overtimeSurchargeCalc).toBe(0);
    expect(payslip.saldoMesic).toBe(0);
  });

  it("includes manual reward in gross wage and uses correct 2026 payroll rates", () => {
    const payslip = calcPaySlip(employee, monthlySummary(), 1000, 0, 250);

    expect(payslip.hrubaMzda).toBe(41000);
    expect(payslip.zpFirma).toBe(3690);
    expect(payslip.spFirma).toBe(10168);
    expect(payslip.cistaMzda).toBe(32664);
  });

  it("increases net wage when a monthly manual reward is entered", () => {
    const withoutReward = calcPaySlip(employee, monthlySummary(), 0, 0, 250);
    const withReward = calcPaySlip(employee, monthlySummary(), 1000, 0, 250);

    expect(withReward.hrubaMzda).toBeGreaterThan(withoutReward.hrubaMzda);
    expect(withReward.cistaMzda).toBeGreaterThan(withoutReward.cistaMzda);
  });

  it("does not include statutory sick compensation in contribution base or tax base", () => {
    const payslip = calcPaySlip(
      employee,
      monthlySummary({
        workedDays: 19,
        workedHours: 152,
        totalSick: 8,
        totalRecognized: 160,
      }),
      0,
      0,
      250,
    );

    expect(payslip.sickHourlyBasis).toBe(225);
    expect(payslip.sickCalc).toBe(1080);
    expect(payslip.zpPrac).toBe(38000);
    expect(payslip.zakladDane).toBe(38000);
    expect(payslip.cistaMzda).toBe(31542);
  });

  it("uses the automatic PHV parameter for vacation and surcharge calculations", () => {
    const payslip = calcPaySlip(
      employee,
      monthlySummary({
        workedDays: 19,
        workedHours: 152,
        totalVacation: 8,
        totalNight: 4,
        totalRecognized: 160,
      }),
      0,
      0,
      250,
    );

    expect(payslip.prumHodinovy).toBe(250);
    expect(payslip.vacationCalc).toBe(2000);
    expect(payslip.nightSurchargeCalc).toBe(100);
  });

  it("never falls back to hourly rate when automatic PHV differs from monthly hourly rate", () => {
    const payslip = calcPaySlip(
      employee,
      monthlySummary({
        workedDays: 19,
        workedHours: 152,
        totalVacation: 8,
        totalRecognized: 160,
      }),
      0,
      0,
      250,
    );

    expect(payslip.averageHourlyEarnings).toBe(250);
    expect(payslip.vacationCalc).toBe(2000);
  });

  it("stores average-source gross independently from general gross wage", () => {
    const averageSource = calcAverageSourceSnapshot(
      employee,
      monthlySummary({
        workedHours: 152,
        workedDays: 19,
        totalRecognized: 160,
        totalNight: 4,
        totalWeekend: 8,
      }),
      1000,
      false,
      250,
    );

    expect(averageSource.workedHoursForAverage).toBe(152);
    expect(averageSource.workedDaysForAverage).toBe(19);
    expect(averageSource.grossForAverage).toBeGreaterThan(0);
    expect(averageSource.grossForAverage).not.toBe(41000);
  });

  it("includes manual reward in average gross only when explicitly enabled", () => {
    const withoutReward = calcAverageSourceSnapshot(employee, monthlySummary(), 1000, false, 250);
    const withReward = calcAverageSourceSnapshot(employee, monthlySummary(), 1000, true, 250);

    expect(withReward.grossForAverage - withoutReward.grossForAverage).toBe(1000);
  });

  it("throws when automatic PHV is missing", () => {
    expect(() =>
      calcPaySlip(
        employee,
        monthlySummary(),
        0,
        0,
        0,
      ),
    ).toThrow("Chybí podklady pro automatický výpočet PHV");
  });

  it("throws for invalid negative automatic PHV instead of silently producing a fallback result", () => {
    expect(() =>
      calcPaySlip(
        employee,
        monthlySummary(),
        0,
        0,
        -250,
      ),
    ).toThrow("Chybí podklady pro automatický výpočet PHV");
  });

  it("uses legal minimum weekend and night surcharges in wage regime", () => {
    const payslip = calcPaySlip(
      {
        ...employee,
        remunerationType: "mzda",
        nightSurcharge: 0.05,
        weekendSurcharge: 0.05,
      },
      monthlySummary({
        totalNight: 4,
        totalWeekend: 8,
      }),
      0,
      0,
      250,
    );

    expect(payslip.nightSurchargeRate).toBe(0.1);
    expect(payslip.weekendSurchargeRate).toBe(0.1);
    expect(payslip.nightSurchargeCalc).toBe(100);
    expect(payslip.weekendSurchargeCalc).toBe(200);
  });

  it("enforces higher legal minimums for weekend and night work in pay-grade regime", () => {
    const payslip = calcPaySlip(
      {
        ...employee,
        remunerationType: "plat",
        nightSurcharge: 0.1,
        weekendSurcharge: 0.1,
      },
      monthlySummary({
        totalNight: 4,
        totalWeekend: 8,
      }),
      0,
      0,
      250,
    );

    expect(payslip.nightSurchargeRate).toBe(0.2);
    expect(payslip.weekendSurchargeRate).toBe(0.25);
    expect(payslip.nightSurchargeCalc).toBe(200);
    expect(payslip.weekendSurchargeCalc).toBe(500);
  });

  it("prefers compensatory time off for holiday work unless premium mode is enabled", () => {
    const baseSummary = monthlySummary({
      workedHours: 168,
      totalHolidayWorked: 8,
      totalHolidayTotal: 8,
      totalRecognized: 168,
    });

    const timeOffPayslip = calcPaySlip(employee, baseSummary, 0, 0, 250);
    const premiumPayslip = calcPaySlip(
      { ...employee, holidayCompensationMode: "premium" },
      baseSummary,
      0,
      0,
      250,
    );

    expect(timeOffPayslip.holidaySurchargeCalc).toBe(0);
    expect(timeOffPayslip.holidayCompLeaveHours).toBe(8);
    expect(premiumPayslip.holidaySurchargeCalc).toBe(2000);
    expect(premiumPayslip.holidayCompLeaveHours).toBe(0);
  });

  it("enforces a minimum 100 percent holiday premium when premium mode is selected", () => {
    const payslip = calcPaySlip(
      { ...employee, holidayCompensationMode: "premium", holidaySurcharge: 0.2 },
      monthlySummary({
        workedHours: 168,
        totalHolidayWorked: 8,
        totalHolidayTotal: 8,
        totalRecognized: 168,
      }),
      0,
      0,
      250,
    );

    expect(payslip.holidaySurchargeRate).toBe(1);
    expect(payslip.holidaySurchargeCalc).toBe(2000);
  });

  it("keeps a higher configured holiday premium above the legal minimum", () => {
    const payslip = calcPaySlip(
      { ...employee, holidayCompensationMode: "premium", holidaySurcharge: 1.5 },
      monthlySummary({
        workedHours: 168,
        totalHolidayWorked: 8,
        totalHolidayTotal: 8,
        totalRecognized: 168,
      }),
      0,
      0,
      250,
    );

    expect(payslip.holidaySurchargeRate).toBe(1.5);
    expect(payslip.holidaySurchargeCalc).toBe(3000);
  });

  it("supports compensatory time off for overtime instead of overtime premium", () => {
    const baseSummary = monthlySummary({
      workedHours: 168,
      totalOvertime: 8,
      totalRecognized: 168,
      totalSaldo: 8,
    });

    const timeOffPayslip = calcPaySlip(
      { ...employee, overtimeCompensationMode: "time-off" },
      baseSummary,
      0,
      0,
      250,
    );
    const premiumPayslip = calcPaySlip(employee, baseSummary, 0, 0, 250);

    expect(timeOffPayslip.overtimeSurchargeCalc).toBe(0);
    expect(timeOffPayslip.overtimeCompLeaveHours).toBe(8);
    expect(premiumPayslip.overtimeSurchargeCalc).toBe(500);
    expect(premiumPayslip.overtimeCompLeaveHours).toBe(0);
  });

  it("ignores any rogue employee-level reward field and uses only the monthly manual reward input", () => {
    const rogueEmployee = { ...employee, manualReward: 5000 } as EmployeeSettings & { manualReward: number };
    const withoutReward = calcPaySlip(rogueEmployee, monthlySummary(), 0, 0, 250);
    const withReward = calcPaySlip(rogueEmployee, monthlySummary(), 1000, 0, 250);

    expect(withoutReward.hrubaMzda).toBe(40000);
    expect(withReward.hrubaMzda).toBe(41000);
  });
});

describe("rounding helpers", () => {
  it("rounds zero and tiny contribution values up to whole crowns", () => {
    expect(roundUpToWholeCrown(0)).toBe(0);
    expect(roundUpToWholeCrown(0.01)).toBe(1);
    expect(roundUpToWholeCrown(1710.0001)).toBe(1711);
  });

  it("rounds the tax base to whole crowns up to 100 and then to whole hundreds", () => {
    expect(roundTaxBase(0)).toBe(0);
    expect(roundTaxBase(99.01)).toBe(100);
    expect(roundTaxBase(100)).toBe(100);
    expect(roundTaxBase(100.01)).toBe(200);
    expect(roundTaxBase(199.99)).toBe(200);
  });

  it("applies the monthly tax threshold boundary correctly", () => {
    expect(calcMonthlyTaxBeforeCredits(146900)).toBe(22035);
    expect(calcMonthlyTaxBeforeCredits(146901)).toBe(22036);
    expect(calcMonthlyTaxBeforeCredits(146902)).toBe(22036);
    expect(calcMonthlyTaxBeforeCredits(146905)).toBe(22037);
  });

  it("uses the threshold for the requested month", () => {
    const constantSpy = vi.spyOn(legalConstants, "getConstantForMonth").mockImplementation((key, month) => {
      if (key === "taxThreshold" && month === "2027-01") return 100000;
      return 146901;
    });

    expect(calcMonthlyTaxBeforeCredits(120000, "2026-01")).toBe(18000);
    expect(calcMonthlyTaxBeforeCredits(120000, "2027-01")).toBe(19600);

    constantSpy.mockRestore();
  });
});

describe("DPN hourly reduction basis", () => {
  it("converts 2026 daily reduction limits to hourly limits rounded up to halere", () => {
    expect(SICK_PAY_HOURLY_REDUCTION_LIMITS_2026).toEqual({
      first: 285.78,
      second: 428.58,
      third: 856.98,
    });
    expect(convertDailySickPayReductionLimitsToHourly({ first: 1.001, second: 2.001, third: 3.001 })).toEqual({
      first: 0.18,
      second: 0.36,
      third: 0.53,
    });
  });

  it("returns 0 for zero or negative PHV", () => {
    expect(calcReducedAverageHourlyBasis(0)).toBe(0);
    expect(calcReducedAverageHourlyBasis(-1)).toBe(0);
  });

  it("reduces low PHV at 90 percent in the first band", () => {
    expect(calcReducedAverageHourlyBasis(250)).toBe(225);
  });

  it("handles threshold boundaries with 90, 60 and 30 percent bands", () => {
    expect(calcReducedAverageHourlyBasis(285.78)).toBeCloseTo(257.202, 6);
    expect(calcReducedAverageHourlyBasis(428.58)).toBeCloseTo(342.882, 6);
    expect(calcReducedAverageHourlyBasis(856.98)).toBeCloseTo(471.402, 6);
  });

  it("ignores PHV above the third hourly limit and stays monotonic", () => {
    const atThird = calcReducedAverageHourlyBasis(856.98);
    const aboveThird = calcReducedAverageHourlyBasis(1200);

    expect(aboveThird).toBeCloseTo(atThird, 6);
    expect(aboveThird).toBeLessThanOrEqual(1200);
    expect(aboveThird).toBeGreaterThanOrEqual(0);
    expect(calcReducedAverageHourlyBasis(500)).toBeGreaterThan(calcReducedAverageHourlyBasis(400));
  });
});

describe("calculateDay", () => {
  it("holiday on a regular workday has rawPlanHours = 0 when not worked", () => {
    const record: TimeRecord = {
      date: "2026-12-25",
      shift: "ranní",
      arrival: "",
      departure: "",
    };
    const holidays: Holiday[] = [{ date: "2026-12-25", name: "1. svátek vánoční" }];
    const day = calculateDay(record, employee, holidays);
    expect(day.rawPlanHours).toBe(0);
    expect(day.planHours).toBe(0);
  });

  it("does not consume vacation on a holiday that falls on a regular workday", () => {
    const record: TimeRecord = {
      date: "2026-12-25",
      shift: "dovolená",
      arrival: "",
      departure: "",
    };
    const holidays: Holiday[] = [{ date: "2026-12-25", name: "1. svátek vánoční" }];

    const day = calculateDay(record, employee, holidays);

    expect(day.rawPlanHours).toBe(0);
    expect(day.planHours).toBe(0);
    expect(day.vacation).toBe(0);
    expect(day.holidayCredit).toBe(0);
    expect(day.recognizedHours).toBe(0);
  });

  it("treats an explicit overtime shift as work outside the regular plan", () => {
    const record: TimeRecord = {
      date: "2026-04-11",
      shift: "přesčas",
      arrival: "08:00",
      departure: "12:30",
    };

    const day = calculateDay(record, employee, []);

    expect(day.planHours).toBe(0);
    expect(day.worked).toBe(4.5);
    expect(day.overtime).toBe(4.5);
    expect(day.saldo).toBe(4.5);
  });

  it("counts work on an otherwise unplanned day as overtime", () => {
    const record: TimeRecord = {
      date: "2026-04-11",
      shift: "ranní",
      arrival: "06:00",
      departure: "14:30",
    };

    const day = calculateDay(record, employee, []);

    expect(day.planHours).toBe(0);
    expect(day.worked).toBe(8);
    expect(day.overtime).toBe(8);
    expect(day.saldo).toBe(8);
  });

  it("uses the configured standard break for a long shift", () => {
    const customEmployee = { ...employee, standardBreak: 0.75 };
    const record: TimeRecord = {
      date: "2026-04-07",
      shift: "ranní",
      arrival: "06:00",
      departure: "14:45",
    };

    const day = calculateDay(record, customEmployee, []);

    expect(day.breakHours).toBe(0.75);
    expect(day.worked).toBe(8);
  });

  it("does not subtract a meal break from a short shift under six hours", () => {
    const customEmployee = { ...employee, standardBreak: 0.75 };
    const record: TimeRecord = {
      date: "2026-04-07",
      shift: "ranní",
      arrival: "06:00",
      departure: "11:00",
    };

    const day = calculateDay(record, customEmployee, []);

    expect(day.breakHours).toBe(0);
    expect(day.worked).toBe(5);
  });

  it("holiday on a workday has rawPlanHours 0 when not worked", () => {
    const record: TimeRecord = {
      date: "2026-05-08",
      shift: "ranní",
      arrival: "",
      departure: "",
    };
    const holidays: Holiday[] = [{ date: "2026-05-08", name: "Den vítězství" }];
    const day = calculateDay(record, employee, holidays);
    expect(day.rawPlanHours).toBe(0);
    expect(day.planHours).toBe(0);
  });

  it("counts sick compensation only in the first 14 calendar days of a sickness streak", () => {
    const records: TimeRecord[] = [
      { date: "2026-04-01", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-02", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-03", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-04", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-05", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-06", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-07", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-08", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-09", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-10", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-11", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-12", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-13", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-14", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-15", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-16", shift: "nemoc", arrival: "", departure: "" },
    ];

    const days = calculateMonthDays(records, employee, []);

    expect(days[0]?.sick).toBe(8);
    expect(days[13]?.sick).toBe(8);
    expect(days[14]?.sick).toBe(0);
    expect(days[15]?.sick).toBe(0);
  });

  it("resets a sickness streak after a non-sick gap day", () => {
    const records: TimeRecord[] = [
      { date: "2026-04-01", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-02", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-04-03", shift: "volno", arrival: "", departure: "" },
      { date: "2026-04-04", shift: "nemoc", arrival: "", departure: "" },
    ];

    const days = calculateMonthDays(records, employee, []);

    expect(days[0]?.sick).toBe(8);
    expect(days[1]?.sick).toBe(8);
    expect(days[2]?.sick).toBe(0);
    expect(days[3]?.sick).toBe(0);
  });

  it("respects carried-over sickness days from the previous month", () => {
    const records: TimeRecord[] = [
      { date: "2026-05-04", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-05-05", shift: "nemoc", arrival: "", departure: "" },
      { date: "2026-05-06", shift: "nemoc", arrival: "", departure: "" },
    ];

    const days = calculateMonthDays(records, employee, [], 13);

    expect(days[0]?.sick).toBe(8);
    expect(days[1]?.sick).toBe(0);
    expect(days[2]?.sick).toBe(0);
  });

  it("calculates night hours correctly for a shift crossing midnight", () => {
    const record: TimeRecord = {
      date: "2026-04-07",
      shift: "noční",
      arrival: "21:00",
      departure: "05:00",
    };

    const day = calculateDay(record, employee, []);

    expect(day.nightHours).toBe(7);
  });

  it("holiday combined with sickness counts as calendar sickness day but does not compensate hours", () => {
    const record: TimeRecord = {
      date: "2026-05-08",
      shift: "nemoc",
      arrival: "",
      departure: "",
    };
    const holidays: Holiday[] = [{ date: "2026-05-08", name: "Den vítězství" }];

    const day = calculateMonthDays([record], employee, holidays)[0];

    expect(day?.rawPlanHours).toBe(0);
    expect(day?.planHours).toBe(0);
    expect(day?.holidayCredit).toBe(0);
    expect(day?.sickCalendarDay).toBe(true);
    expect(day?.sickCompensatedHours).toBe(0);
    expect(day?.sick).toBe(0);
    expect(day?.recognizedHours).toBe(0);
  });

  it("compensates sickness hours in shift operation on a planned non-holiday weekend day", () => {
    const shiftEmployee: EmployeeSettings = {
      ...employee,
      weekendWorking: true,
    };
    const record: TimeRecord = {
      date: "2026-04-11",
      shift: "nemoc",
      arrival: "",
      departure: "",
    };

    const day = calculateMonthDays([record], shiftEmployee, [])[0];

    expect(day?.sickCalendarDay).toBe(true);
    expect(day?.sickCompensatedHours).toBe(8);
    expect(day?.sick).toBe(8);
  });
});

describe("DPN compensation in payslip", () => {
  it("derives statutory sick compensation basis from automatic PHV", () => {
    const payslip = calcPaySlip(
      employee,
      monthlySummary({
        workedDays: 19,
        workedHours: 152,
        totalSick: 8,
        totalRecognized: 160,
      }),
      0,
      0,
      250,
    );

    expect(payslip.sickHourlyBasis).toBe(225);
    expect(payslip.sickCalc).toBe(1080);
  });

  it("reduces DPN basis even when automatic PHV is 1 CZK per hour", () => {
    const payslip = calcPaySlip(
      employee,
      monthlySummary({
        workedHours: 96,
        totalVacation: 40,
        totalSick: 40,
        totalRecognized: 176,
      }),
      0,
      0,
      1,
    );

    expect(payslip.averageHourlyEarnings).toBe(1);
    expect(payslip.sickHourlyBasis).toBe(0.9);
    expect(payslip.sickCalc).toBeCloseTo(21.6, 6);
  });

  it("uses recognized hours from timesheet for monthly balance instead of manual real-hours input", () => {
    const payslip = calcPaySlip(
      employee,
      monthlySummary({
        workedHours: 140,
        totalHolidayCredit: 20,
        totalRecognized: 160,
        totalSaldo: 0,
      }),
      0,
      0,
      250,
    );

    expect(payslip.celkemOdpracNeodprac).toBe(160);
    expect(payslip.saldoMesic).toBe(0);
  });
});

describe("saldoMesic — monthly deviation from plan", () => {
  it("equals sum of recognizedHours minus planHours", () => {
    const payslip = calcPaySlip(
      employee,
      monthlySummary({
        workedHours: 144,
        totalHolidayCredit: 8,
        totalRecognized: 152,
        totalSaldo: -8,
      }),
      0,
      0,
      250,
    );

    expect(payslip.saldoMesic).toBe(-8);
  });

  it("is 0 in a regular month without deviations", () => {
    const payslip = calcPaySlip(employee, monthlySummary(), 0, 0, 250);
    expect(payslip.saldoMesic).toBe(0);
  });

  it("is positive when working outside the plan", () => {
    const payslip = calcPaySlip(
      employee,
      monthlySummary({
        workedHours: 168,
        totalRecognized: 168,
        totalSaldo: 8,
      }),
      0,
      0,
      250,
    );
    expect(payslip.saldoMesic).toBe(8);
  });

  it("is negative when under the plan", () => {
    const payslip = calcPaySlip(
      employee,
      monthlySummary({
        workedHours: 140,
        totalHolidayCredit: 8,
        totalRecognized: 148,
        totalSaldo: -12,
      }),
      0,
      0,
      250,
    );
    expect(payslip.saldoMesic).toBe(-12);
  });
});

describe("saldo — worked minus planHours only", () => {
  it("is 0 when 8 planned and 8 worked", () => {
    const record: TimeRecord = {
      date: "2026-04-07",
      shift: "ranní",
      arrival: "06:00",
      departure: "14:30",
    };
    const day = calculateDay(record, employee, []);
    expect(day.saldo).toBe(0);
  });

  it("is +2 when 8 planned and 10 worked", () => {
    const record: TimeRecord = {
      date: "2026-04-07",
      shift: "ranní",
      arrival: "06:00",
      departure: "16:30",
    };
    const day = calculateDay(record, employee, []);
    expect(day.saldo).toBe(2);
  });

  it("is -2 when 8 planned and 6 worked", () => {
    const record: TimeRecord = {
      date: "2026-04-07",
      shift: "ranní",
      arrival: "06:00",
      departure: "12:30",
    };
    const day = calculateDay(record, employee, []);
    expect(day.saldo).toBe(-2);
  });

  it("nemoc counts as planHours for saldo purposes", () => {
    const record: TimeRecord = {
      date: "2026-04-07",
      shift: "nemoc",
      arrival: "",
      departure: "",
    };
    const day = calculateDay(record, employee, []);
    expect(day.saldo).toBe(0);
  });

  it("dovolená counts as planHours for saldo purposes", () => {
    const record: TimeRecord = {
      date: "2026-04-07",
      shift: "dovolená",
      arrival: "",
      departure: "",
    };
    const day = calculateDay(record, employee, []);
    expect(day.saldo).toBe(0);
  });

  it("holiday without work has rawPlanHours 8, holidayCredit 8, saldo 0", () => {
    const record: TimeRecord = {
      date: "2026-05-08",
      shift: "ranní",
      arrival: "",
      departure: "",
    };
    const holidays: Holiday[] = [{ date: "2026-05-08", name: "Den vítězství" }];
    const day = calculateDay(record, employee, holidays);
    expect(day.rawPlanHours).toBe(0);
    expect(day.planHours).toBe(0);
    expect(day.worked).toBe(0);
    expect(day.holidayCredit).toBe(8);
    expect(day.saldo).toBe(0);
  });
});

describe("P1-03 — monthly summary workday counts", () => {
  it("counts working days as those with planHours > 0", () => {
    const records: TimeRecord[] = [
      { date: "2026-04-01", shift: "ranní", arrival: "06:00", departure: "14:30" },
      { date: "2026-04-02", shift: "ranní", arrival: "06:00", departure: "14:30" },
      { date: "2026-04-03", shift: "ranní", arrival: "06:00", departure: "14:30" },
      { date: "2026-04-04", shift: "volno", arrival: "", departure: "" },
      { date: "2026-04-05", shift: "volno", arrival: "", departure: "" },
    ];
    const days = calculateMonthDays(records, employee, []);
    const sum = calcMonthlySummary(days);
    expect(sum.workDaysWH).toBe(3);
  });

  it("counts free days as calendar days outside the monthly fund", () => {
    const records: TimeRecord[] = [
      { date: "2026-04-01", shift: "ranní", arrival: "06:00", departure: "14:30" },
      { date: "2026-04-02", shift: "volno", arrival: "", departure: "" },
      { date: "2026-04-03", shift: "volno", arrival: "", departure: "" },
    ];
    const days = calculateMonthDays(records, employee, []);
    const sum = calcMonthlySummary(days);
    expect(sum.freeDaysInMonth).toBe(0);
  });

  it("counts holidays in the month", () => {
    const records: TimeRecord[] = [
      { date: "2026-04-01", shift: "ranní", arrival: "06:00", departure: "14:30" },
      { date: "2026-04-06", shift: "ranní", arrival: "06:00", departure: "14:30" },
      { date: "2026-04-07", shift: "volno", arrival: "", departure: "" },
    ];
    const holidays: Holiday[] = [{ date: "2026-04-06", name: "Velikonoční pondělí" }];
    const days = calculateMonthDays(records, employee, holidays);
    const sum = calcMonthlySummary(days);
    expect(sum.holidayDaysInMonth).toBe(1);
  });

  it("different months produce different fond hodin", () => {
    const mayRecords: TimeRecord[] = Array.from({ length: 31 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, '0')}`,
      shift: i % 7 === 5 || i % 7 === 6 ? ("volno" as ShiftType) : ("ranní" as ShiftType),
      arrival: i % 7 === 5 || i % 7 === 6 ? "" : "06:00",
      departure: i % 7 === 5 || i % 7 === 6 ? "" : "14:30",
    }));
    const aprilRecords: TimeRecord[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-04-${String(i + 1).padStart(2, '0')}`,
      shift: i % 7 === 5 || i % 7 === 6 ? ("volno" as ShiftType) : ("ranní" as ShiftType),
      arrival: i % 7 === 5 || i % 7 === 6 ? "" : "06:00",
      departure: i % 7 === 5 || i % 7 === 6 ? "" : "14:30",
    }));
    const mayDays = calculateMonthDays(mayRecords as TimeRecord[], employee, []);
    const aprilDays = calculateMonthDays(aprilRecords as TimeRecord[], employee, []);
    const maySum = calcMonthlySummary(mayDays);
    const aprilSum = calcMonthlySummary(aprilDays);
    expect(maySum.workHoursWH).not.toBe(aprilSum.workHoursWH);
  });

  it("workHoursWH equals sum of planHours for the month", () => {
    const records: TimeRecord[] = [
      { date: "2026-04-01", shift: "ranní", arrival: "06:00", departure: "14:30" },
      { date: "2026-04-02", shift: "ranní", arrival: "06:00", departure: "14:30" },
      { date: "2026-04-03", shift: "ranní", arrival: "06:00", departure: "14:30" },
      { date: "2026-04-04", shift: "volno", arrival: "", departure: "" },
    ];
    const days = calculateMonthDays(records, employee, []);
    const sum = calcMonthlySummary(days);
    expect(sum.workHoursWH).toBe(sum.workDaysWH * 8);
  });
});
