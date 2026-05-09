"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

type WorkingHourDraft = {
  dayOfWeek: number;
  openMinutes: number;
  closeMinutes: number;
};

type HolidayDraft = { date: string; label?: string };

type ServiceDraft = {
  id?: string;
  name: string;
  description?: string;
  durationMinutes: number;
  pricePence: number;
  sortOrder: number;
};

type StaffDraft = {
  fullName: string;
  email: string;
  password: string;
  offeredServiceIds: string[];
  workingHours: WorkingHourDraft[];
};

type OnboardingApiPayload = {
  business: Record<string, unknown>;
  branding: {
    logoUrl?: string | null;
    primaryColour?: string | null;
    secondaryColour?: string | null;
    googleFontFamily?: string | null;
  } | null;
  availability: { workingHours: WorkingHourDraft[]; holidays: HolidayDraft[] };
  services: ServiceDraft[];
  staff: StaffDraft[];
  navigation: {
    nextWizardStep: number | null;
    checkoutUnlocked: boolean;
  };
};

function splitTime(minutesTotal: number) {
  const hours = Math.floor(minutesTotal / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutesTotal % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  const total = hh * 60 + mm;
  if (hh >= 24 || mm >= 60) {
    return null;
  }
  return total;
}

export function CheckoutReturnBanner(): JSX.Element | null {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeState = params.get("checkout");

    if (stripeState === "success") {
      setMessage(
        "Stripe is finalising billing in the background. We will reload once your vault unlocks — this can take a few seconds.",
      );
      params.delete("checkout");
      window.history.replaceState({}, "", `${window.location.pathname}`);
      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        const res = await fetch("/api/onboarding");
        const body = await res.json();
        if (body?.business?.onboardingComplete) {
          window.location.href = "/dashboard";
          return;
        }
        if (attempts < 20) {
          window.setTimeout(poll, 2000);
        } else {
          setMessage(
            "Still waiting on Stripe webhook confirmation — refresh shortly or revisit your dashboard manually.",
          );
        }
      };
      poll().catch(() => null);
      return undefined;
    }

    if (stripeState === "cancel") {
      setMessage("Stripe checkout canceled — resume whenever you’re ready.");
      params.delete("checkout");
      window.history.replaceState({}, "", `${window.location.pathname}`);
    }

    return undefined;
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-[#8b86f9]/35 bg-[#8b86f9]/10 p-4 text-sm text-[#e9d5ff]">
      {message}
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState<number | null>(null);

  const [payload, setPayload] = useState<OnboardingApiPayload | null>(null);
  const [activeStep, setActiveStep] = useState(3);

  const [brandLogo, setBrandLogo] = useState("");
  const [brandPrimary, setBrandPrimary] = useState("");
  const [brandSecondary, setBrandSecondary] = useState("");
  const [brandFont, setBrandFont] = useState("");

  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [businessHours, setBusinessHours] = useState<WorkingHourDraft[]>([]);
  const [holidays, setHolidays] = useState<HolidayDraft[]>([]);

  const [slotMode, setSlotMode] = useState<"FIXED" | "FLEXIBLE">("FLEXIBLE");
  const [serviceDrafts, setServiceDrafts] = useState<ServiceDraft[]>([]);

  const [allowStaffSelector, setAllowStaffSelector] = useState(false);
  const [staffDrafts, setStaffDrafts] = useState<StaffDraft[]>([]);

  const [allowGuestCancelReschedule, setAllowGuestCancelReschedule] =
    useState(false);
  const [cancelNoticeHours, setCancelNoticeHours] = useState(24);

  useEffect(() => {
    fetch("/api/onboarding")
      .then(async (res) => {
        if (!res.ok) {
          setLoadError("Unable to hydrate onboarding workspace.");
          return;
        }

        const data = (await res.json()) as OnboardingApiPayload;
        setPayload(data);

        const next = data.navigation.nextWizardStep ?? 3;
        setActiveStep(next);

        setBrandLogo(String(data.branding?.logoUrl ?? ""));
        setBrandPrimary(String(data.branding?.primaryColour ?? ""));
        setBrandSecondary(String(data.branding?.secondaryColour ?? ""));
        setBrandFont(String(data.branding?.googleFontFamily ?? ""));

        setBufferMinutes(
          Number(data.business.bookingBufferMinutes ?? 15) ?? 15,
        );
        const hours = [...(data.availability.workingHours ?? [])].sort(
          (first, second) => first.dayOfWeek - second.dayOfWeek,
        );
        setBusinessHours(
          hours.length
            ? hours
            : [1, 2, 3, 4, 5].map((weekday) => ({
                dayOfWeek: weekday,
                openMinutes: 9 * 60,
                closeMinutes: 17 * 60,
              })),
        );
        setHolidays(data.availability.holidays ?? []);

        const slotSeed = String(data.business.slotMode ?? "FLEXIBLE");
        setSlotMode(slotSeed === "FIXED" ? "FIXED" : "FLEXIBLE");
        setServiceDrafts(
          (data.services ?? []).map((svc, idx) => ({
            id: svc.id,
            name: svc.name,
            description: svc.description ?? "",
            durationMinutes: svc.durationMinutes,
            pricePence: svc.pricePence,
            sortOrder: svc.sortOrder ?? idx,
          })),
        );

        setAllowStaffSelector(
          Boolean(data.business.allowCustomerStaffSelection),
        );

        const staffSeed = Array.isArray(data.staff)
          ? (data.staff as Array<StaffDraft>).map((member) => ({
              fullName: member.fullName,
              email: member.email,
              password: "",
              offeredServiceIds:
                typeof member.offeredServiceIds !== "undefined"
                  ? [...member.offeredServiceIds]
                  : [],
              workingHours: Array.isArray(member.workingHours)
                ? [...member.workingHours]
                : [],
            }))
          : [];
        setStaffDrafts(staffSeed);

        setAllowGuestCancelReschedule(
          Boolean(data.business.allowCustomerCancelReschedule),
        );
        setCancelNoticeHours(
          Number(data.business.cancellationNoticeHours ?? 24) || 24,
        );
      })
      .catch(() => setLoadError("Offline or blocked request."));
  }, []);

  const serviceIdOptions = useMemo(
    () => serviceDrafts.filter((svc) => Boolean(svc.id)),
    [serviceDrafts],
  );

  const mutateStep = async (body: Record<string, unknown>, stepMarker: number) => {
    setSavingStep(stepMarker);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const dataUnknown: unknown = await res.json();

      if (!res.ok && dataUnknown && typeof dataUnknown === "object") {
        const typed = dataUnknown as { error?: string };
        setLoadError(typed.error ?? "Save failed.");
        setSavingStep(null);
        return;
      }

      if (!dataUnknown || typeof dataUnknown !== "object") {
        setLoadError("Unexpected server response.");
        setSavingStep(null);
        return;
      }

      const nextPayload = dataUnknown as OnboardingApiPayload;
      setPayload(nextPayload);
      setLoadError(null);
      setActiveStep(nextPayload.navigation.nextWizardStep ?? stepMarker + 1);
      router.refresh();
      setSavingStep(null);
    } catch {
      setLoadError("Network error saving this step.");
      setSavingStep(null);
    }
  };

  const saveBranding = () =>
    mutateStep(
      {
        step: "branding",
        data: {
          logoUrl: brandLogo.trim(),
          primaryColour: brandPrimary.trim(),
          secondaryColour: brandSecondary.trim(),
          googleFontFamily: brandFont.trim(),
        },
      },
      3,
    );

  const saveAvailability = () =>
    mutateStep(
      {
        step: "availability",
        data: {
          bookingBufferMinutes: bufferMinutes,
          workingHours: businessHours,
          holidays,
        },
      },
      4,
    );

  const saveServices = () =>
    mutateStep(
      {
        step: "services",
        data: {
          slotMode,
          services: serviceDrafts.map((svc, idx) => ({
            ...(svc.id ? { id: svc.id } : {}),
            name: svc.name,
            description: svc.description ?? "",
            durationMinutes: svc.durationMinutes,
            pricePence: svc.pricePence,
            sortOrder: svc.sortOrder ?? idx,
          })),
        },
      },
      5,
    );

  const saveStaff = () =>
    mutateStep(
      {
        step: "staff",
        data: {
          allowCustomerStaffSelection: allowStaffSelector,
          members: staffDrafts.map((member) => ({
            fullName: member.fullName,
            email: member.email.toLowerCase(),
            password: member.password,
            offeredServiceIds: member.offeredServiceIds,
            workingHours: member.workingHours,
          })),
        },
      },
      6,
    );

  const saveBookingRules = () =>
    mutateStep(
      {
        step: "bookingRules",
        data: {
          allowCustomerStaffSelection: allowStaffSelector,
          allowCustomerCancelReschedule: allowGuestCancelReschedule,
          cancellationNoticeHours: cancelNoticeHours,
        },
      },
      7,
    );

  const startStripeCheckout = async (tier: "BASIC" | "STANDARD" | "PREMIUM") => {
    setSavingStep(8);
    try {
      const res = await fetch("/api/billing/onboarding-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const dataUnknown = await res.json();

      if (res.status === 503 || res.status === 501) {
        setLoadError(
          typeof (dataUnknown as { error?: string }).error === "string"
            ? String((dataUnknown as { error: string }).error)
            : "Stripe is not wired — add CLI keys.",
        );
        setSavingStep(null);
        return;
      }

      if (
        typeof dataUnknown !== "object" ||
        !(dataUnknown as { url?: string }).url
      ) {
        setLoadError("Stripe did not return a checkout redirect.");
        setSavingStep(null);
        return;
      }

      window.location.href = String((dataUnknown as { url: string }).url);
    } catch {
      setLoadError("Unable to initiate Stripe Checkout.");
      setSavingStep(null);
    }
  };

  const stepRail = (
    <>
      {[3, 4, 5, 6, 7, 8].map((marker) => (
        <button
          key={marker}
          type="button"
          onClick={() => setActiveStep(marker)}
          className={`flex-1 rounded-full px-2 py-2 text-[11px] font-semibold leading-tight ${
            marker === activeStep
              ? "bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] text-white shadow-[0_0_20px_rgba(139,134,249,0.35)]"
              : "bg-white/[0.06] text-slate-400"
          }`}
        >
          {marker === 8 ? "Stripe" : `Step ${marker}`}
        </button>
      ))}
    </>
  );

  const renderActivePanel = () => {
    switch (activeStep) {
      case 3:
        return (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Branding shell
            </h2>
            <p className="text-sm text-slate-400">
              Logo URL (HTTPS) plus colour tokens — uploads land later with Blob
              storage.
            </p>
            <label className="block space-y-1 text-xs font-semibold text-slate-300">
              Logo URL
              <input
                className="w-full rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 text-sm font-normal text-slate-100 placeholder:text-slate-500"
                value={brandLogo}
                onChange={(event) => setBrandLogo(event.target.value)}
                placeholder="https://…"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1 text-xs font-semibold text-slate-300">
                Primary colour (#RRGGBB)
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 font-mono text-sm font-normal tracking-tight text-slate-100 placeholder:text-slate-500"
                  value={brandPrimary}
                  placeholder="#065f46"
                  onChange={(event) =>
                    setBrandPrimary(event.target.value.toUpperCase())
                  }
                />
              </label>
              <label className="block space-y-1 text-xs font-semibold text-slate-300">
                Secondary colour (#RRGGBB)
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 font-mono text-sm font-normal tracking-tight text-slate-100 placeholder:text-slate-500"
                  value={brandSecondary}
                  placeholder="#a7f3d0"
                  onChange={(event) =>
                    setBrandSecondary(event.target.value.toUpperCase())
                  }
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-semibold text-slate-300">
              Google Font family override
              <input
                className="w-full rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 text-sm font-normal text-slate-100 placeholder:text-slate-500"
                placeholder="Merriweather"
                value={brandFont}
                onChange={(event) => setBrandFont(event.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={savingStep !== null}
              onClick={() => saveBranding()}
              className="rounded-full slot-glow bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {savingStep === 3 ? "Saving…" : "Save & continue"}
            </button>
          </section>
        );
      case 4:
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-white">
              Availability scaffolding
            </h2>

            <label className="block space-y-1 text-xs font-semibold text-slate-300">
              Buffer minutes between bookings
              <input
                type="number"
                min={0}
                max={240}
                className="w-32 rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 text-sm font-normal text-slate-100 placeholder:text-slate-500"
                value={bufferMinutes}
                onChange={(event) =>
                  setBufferMinutes(Number(event.target.value || 0))
                }
              />
            </label>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-white/[0.04] text-[11px] uppercase tracking-[0.2em]">
                    <th className="p-3 text-left">Day</th>
                    <th className="p-3 text-left">Open</th>
                    <th className="p-3 text-left">Close</th>
                  </tr>
                </thead>
                <tbody>
                  {businessHours.map((hourRow, index) => (
                    <tr key={`${hourRow.dayOfWeek}-${index}`} className="border-t">
                      <td className="whitespace-nowrap p-3 text-left font-semibold text-slate-300">
                        {DAY_LABELS[hourRow.dayOfWeek]}
                      </td>
                      <td className="p-3">
                        <input
                          className="w-full rounded-lg border border-white/10 bg-[#080810]/90 px-2 py-2 font-mono text-sm tracking-tighter text-slate-100 placeholder:text-slate-500"
                          value={splitTime(hourRow.openMinutes)}
                          onChange={(event) => {
                            const parsed = parseTime(event.target.value);
                            if (parsed === null) {
                              return;
                            }
                            setBusinessHours((prev) =>
                              prev.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, openMinutes: parsed }
                                  : row,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          className="w-full rounded-lg border border-white/10 bg-[#080810]/90 px-2 py-2 font-mono text-sm tracking-tighter text-slate-100 placeholder:text-slate-500"
                          value={splitTime(hourRow.closeMinutes)}
                          onChange={(event) => {
                            const parsedClose = parseTime(event.target.value);
                            if (parsedClose === null) {
                              return;
                            }
                            setBusinessHours((prev) =>
                              prev.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, closeMinutes: parsedClose }
                                  : row,
                              ),
                            );
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Holiday closures
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setHolidays([...holidays, { date: "", label: "" }])
                  }
                  className="text-xs font-semibold text-[#c4b5fd] underline"
                >
                  Add closure
                </button>
              </div>
              {holidays.length === 0 && (
                <p className="text-sm text-slate-500">
                  Skip if you reopen year-round — you can always add blackout
                  days later inside the dashboard.
                </p>
              )}
              {holidays.map((holidayRow, idx) => (
                <div
                  key={`${holidayRow.date}-${idx}`}
                  className="flex flex-wrap items-end gap-2"
                >
                  <label className="flex flex-1 flex-col text-xs font-semibold text-slate-300">
                    Calendar date (YYYY-MM-DD)
                    <input
                      type="text"
                      className="rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 font-mono text-sm font-normal tracking-tight text-slate-100 placeholder:text-slate-500"
                      value={holidayRow.date}
                      onChange={(event) =>
                        setHolidays((prev) =>
                          prev.map((existing, mappedIndex) =>
                            mappedIndex === idx
                              ? { ...existing, date: event.target.value }
                              : existing,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="flex flex-1 flex-col text-xs font-semibold text-slate-300">
                    Label
                    <input
                      type="text"
                      className="rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 font-normal text-sm text-slate-100 placeholder:text-slate-500"
                      placeholder="Bank holiday blackout"
                      value={holidayRow.label ?? ""}
                      onChange={(event) =>
                        setHolidays((prev) =>
                          prev.map((existing, mappedIndex) =>
                            mappedIndex === idx
                              ? {
                                  ...existing,
                                  label: event.target.value,
                                }
                              : existing,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600"
                    onClick={() =>
                      setHolidays((prev) =>
                        prev.filter((_, filteredIndex) => filteredIndex !== idx),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={savingStep !== null}
              onClick={() => saveAvailability()}
              className="rounded-full slot-glow bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {savingStep === 4 ? "Saving…" : "Save & continue"}
            </button>
          </section>
        );
      case 5:
        return (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Services roster</h2>

            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={slotMode === "FLEXIBLE"}
                  onChange={() => setSlotMode("FLEXIBLE")}
                />
                Flexible duration windows
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={slotMode === "FIXED"}
                  onChange={() => setSlotMode("FIXED")}
                />
                Discrete fixed slots
              </label>
            </div>

            <button
              type="button"
              className="text-xs font-semibold text-[#c4b5fd] underline"
              onClick={() =>
                setServiceDrafts((draft) => [
                  ...draft,
                  {
                    name: "New offering",
                    description: "",
                    durationMinutes: 45,
                    pricePence: 4000,
                    sortOrder: draft.length,
                  },
                ])
              }
            >
              Add service
            </button>

            <div className="space-y-4">
              {serviceDrafts.map((svcDraft, svcIndex) => (
                <div
                  key={svcDraft.id ?? `${svcDraft.name}-${svcIndex}`}
                  className="space-y-2 rounded-xl border border-white/[0.08] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      className="flex-1 rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 text-sm font-semibold text-slate-100 shadow-sm placeholder:text-slate-500"
                      value={svcDraft.name}
                      placeholder="Offering name"
                      onChange={(event) =>
                        setServiceDrafts((prev) =>
                          prev.map((row, mappedIndex) =>
                            mappedIndex === svcIndex
                              ? { ...row, name: event.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600"
                      onClick={() =>
                        setServiceDrafts((prev) =>
                          prev.filter(
                            (_, filteredIndex) => filteredIndex !== svcIndex,
                          ),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                    placeholder="Description"
                    value={svcDraft.description ?? ""}
                    onChange={(event) =>
                      setServiceDrafts((prev) =>
                        prev.map((row, mappedIndex) =>
                          mappedIndex === svcIndex
                            ? {
                                ...row,
                                description: event.target.value,
                              }
                            : row,
                        ),
                      )
                    }
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Duration minutes
                      <input
                        type="number"
                        min={5}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 text-sm font-normal text-slate-100 placeholder:text-slate-500"
                        value={svcDraft.durationMinutes}
                        onChange={(event) =>
                          setServiceDrafts((prev) =>
                            prev.map((row, mappedIndex) =>
                              mappedIndex === svcIndex
                                ? {
                                    ...row,
                                    durationMinutes: Number(
                                      event.target.value || "0",
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-300">
                      Price GBP (pounds)
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 font-normal text-sm text-slate-100 placeholder:text-slate-500"
                        value={svcDraft.pricePence / 100}
                        onChange={(event) =>
                          setServiceDrafts((prev) =>
                            prev.map((row, mappedIndex) =>
                              mappedIndex === svcIndex
                                ? {
                                    ...row,
                                    pricePence: Math.round(
                                      Number(event.target.value || "0") * 100,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={
                savingStep !== null || serviceDrafts.length === 0
              }
              onClick={() => saveServices()}
              className="rounded-full slot-glow bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {savingStep === 5 ? "Saving…" : "Save & continue"}
            </button>
          </section>
        );
      case 6:
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Staff provisioning</h2>

            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={allowStaffSelector}
                onChange={(event) => setAllowStaffSelector(event.target.checked)}
              />
              Let guests intentionally pick teammates on the storefront
            </label>

            <button
              type="button"
              className="text-xs font-semibold text-[#c4b5fd] underline"
              onClick={() =>
                setStaffDrafts((existing) => [
                  ...existing,
                  {
                    fullName: "",
                    email: "",
                    password: "",
                    offeredServiceIds: [],
                    workingHours: [],
                  },
                ])
              }
            >
              Add staff member
            </button>

            {staffDrafts.length === 0 && (
              <p className="text-sm text-slate-400">
                Optional at launch — Solo operators can revisit after launch from
                the dashboard.
              </p>
            )}

            {staffDrafts.map((memberDraft, draftIndex) => (
              <div
                key={`${memberDraft.email}-${draftIndex}`}
                className="space-y-3 rounded-xl border border-white/[0.08] p-4"
              >
                <div className="flex justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">
                    Teammate {draftIndex + 1}
                  </h3>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600"
                    onClick={() =>
                      setStaffDrafts((prevDraft) =>
                        prevDraft.filter(
                          (_, teammateIndex) => teammateIndex !== draftIndex,
                        ),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Name
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 font-normal text-sm shadow-sm"
                      value={memberDraft.fullName}
                      onChange={(event) =>
                        setStaffDrafts((prevDraft) =>
                          prevDraft.map((row, teammateIndex) =>
                            teammateIndex === draftIndex
                              ? { ...row, fullName: event.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-300">
                    Email
                    <input
                      type="email"
                      className="mt-1 w-full rounded-lg border px-3 py-2 font-normal text-sm shadow-sm"
                      value={memberDraft.email}
                      onChange={(event) =>
                        setStaffDrafts((prevDraft) =>
                          prevDraft.map((row, teammateIndex) =>
                            teammateIndex === draftIndex
                              ? { ...row, email: event.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                </div>

                <label className="text-xs font-semibold text-slate-300">
                  Password (credential login)
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border px-3 py-2 font-normal text-sm shadow-sm"
                    value={memberDraft.password}
                    onChange={(event) =>
                      setStaffDrafts((prevDraft) =>
                        prevDraft.map((row, teammateIndex) =>
                          teammateIndex === draftIndex
                            ? { ...row, password: event.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </label>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Services they fulfil
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {serviceIdOptions.map((svc) => (
                      <label
                        key={`${svc.id}-${svc.sortOrder}-${svc.name}`}
                        className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={memberDraft.offeredServiceIds.includes(
                            String(svc.id ?? ""),
                          )}
                          onChange={(event) => {
                            const idValue = String(svc.id);
                            setStaffDrafts((prevDraft) =>
                              prevDraft.map((rowRecord, teammateIndex) => {
                                if (teammateIndex !== draftIndex) return rowRecord;
                                if (event.target.checked) {
                                  return {
                                    ...rowRecord,
                                    offeredServiceIds: Array.from(
                                      new Set([
                                        ...rowRecord.offeredServiceIds,
                                        idValue,
                                      ]),
                                    ).filter(Boolean),
                                  };
                                }

                                return {
                                  ...rowRecord,
                                  offeredServiceIds:
                                    rowRecord.offeredServiceIds.filter(
                                      (existingId) => existingId !== idValue,
                                    ),
                                };
                              }),
                            );
                          }}
                        />
                        {svc.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Custom hours omitted here inherit storefront defaults —
                    advanced rota scheduling continues inside dashboards.
                  </p>
                </div>
              </div>
            ))}

            <button
              type="button"
              disabled={
                savingStep !== null ||
                staffDrafts.some(
                  (member) =>
                    !member.fullName.trim() ||
                    !member.email.trim() ||
                    member.password.trim().length < 8,
                )
              }
              onClick={() => saveStaff()}
              className="rounded-full slot-glow bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {staffDrafts.length === 0
                ? "Skip team roster — continue"
                : savingStep === 6
                  ? "Saving…"
                  : "Save teammates"}
            </button>
          </section>
        );
      case 7:
        return (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Booking etiquette
            </h2>

            <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide">
              Cancellation notice minimum (hours ahead)
              <input
                type="number"
                min={1}
                max={336}
                className="w-32 rounded-lg border border-white/10 bg-[#080810]/90 px-3 py-2 font-normal text-sm text-slate-100 placeholder:text-slate-500"
                value={cancelNoticeHours}
                onChange={(event) =>
                  setCancelNoticeHours(Number(event.target.value || 24))
                }
              />
            </label>

            <label className="flex items-start gap-2 text-sm font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={allowGuestCancelReschedule}
                onChange={(event) =>
                  setAllowGuestCancelReschedule(event.target.checked)
                }
              />
              Let guests reschedule / cancel securely via emailed magic links —
              surfaced only on Premium storefronts downstream.
            </label>

            <label className="flex items-start gap-2 text-sm font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={allowStaffSelector}
                onChange={(event) => setAllowStaffSelector(event.target.checked)}
              />
              Mirror staff picker visibility on the storefront
            </label>

            <button
              type="button"
              disabled={savingStep !== null}
              onClick={() => saveBookingRules()}
              className="rounded-full slot-glow bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {savingStep === 7 ? "Saving…" : "Save & reveal billing"}
            </button>
          </section>
        );
      case 8:
        return (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Activate subscription billing
            </h2>

            {!payload?.navigation.checkoutUnlocked && (
              <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                Checkout unlocks automatically after Steps 3–7 have each been
                saved once.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              {(
                ["BASIC", "STANDARD", "PREMIUM"] as Array<
                  "BASIC" | "STANDARD" | "PREMIUM"
                >
              ).map((tier) => (
                <div
                  key={tier}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 p-6 text-sm shadow-sm"
                >
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Tier
                    </p>
                    <h3 className="text-xl font-semibold capitalize text-white">
                      {tier.toLowerCase()}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Stripe Checkout attaches the Stripe price IDs defined in{" "}
                      <code>.env</code>; webhook completion flips onboarding to
                      `complete`.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={
                      !payload?.navigation.checkoutUnlocked ||
                      savingStep === 8
                    }
                    onClick={() => startStripeCheckout(tier)}
                    className="mt-6 rounded-full slot-glow bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] px-4 py-2 font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                  >
                    {savingStep === 8 ? "Redirecting…" : "Proceed with Stripe"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  if (loadError && !payload) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-red-900">
        {loadError}{" "}
        <button
          type="button"
          className="ml-4 font-semibold underline"
          onClick={() => router.refresh()}
        >
          Reload
        </button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#11111f]/95 p-10 text-center text-sm font-semibold text-slate-500">
        Hydrating onboarding context…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 ring-1 ring-amber-500/20">
          {loadError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          <span className="font-semibold text-white">
            {payload.business.name as string}
          </span>
          • Subdomain ·{" "}
          <strong>{payload.business.subdomain as string}</strong>
        </p>
        <Link
          className="text-xs font-semibold text-[#c4b5fd] underline-offset-4 hover:underline"
          href="/dashboard"
          title="Available after billing completion"
        >
          Jump to dashboard
        </Link>
      </div>

      <nav className="flex flex-wrap gap-2">{stepRail}</nav>

      {renderActivePanel()}
    </div>
  );
}
