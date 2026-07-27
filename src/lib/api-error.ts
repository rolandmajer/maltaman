// Deliberately dependency-free (no auth.ts/next-auth import) so modules that need ApiError but
// must stay safe to import from non-request contexts (PDF rendering, the seed script, tests)
// don't transitively pull in NextAuth — see room-element-service.ts for why this matters.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
