import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone } from "date-fns-tz";

const LAGOS_TZ = "Africa/Lagos";

export function formatLagosTime(date: string | Date, pattern = "p") {
  return formatInTimeZone(date, LAGOS_TZ, pattern);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z\s'-]/g, "")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const VALID_DOMAINS = () => {
  const domains = ["gmail.com", "yahoo.com", "outlook.com"];

  if (process.env.NODE_ENV === "development") {
    domains.push("example.com");
  }

  return domains;
};
