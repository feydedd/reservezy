export default function TenantNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Booking page unavailable</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        This subdomain is not linked to an active Reservezy workspace yet, or the
        owner disabled bookings.
      </p>
    </div>
  );
}
