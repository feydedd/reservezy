/** Parses `YYYY-MM-DD` into UTC midnight for Postgres `DATE` compatibility. */
export function parseUtcDateOnly(value: string): Date | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) {
    return null;
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  const roundTrip = date.toISOString().slice(0, 10);
  if (
    `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}` !== roundTrip
  ) {
    return null;
  }

  return date;
}
