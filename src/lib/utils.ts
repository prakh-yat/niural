import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatShortDate(value: Date | string) {
  return format(new Date(value), "MMM d, yyyy");
}

export function formatLongDateTime(value: Date | string) {
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function formatInterviewSlotWindow(start: Date | string, end: Date | string) {
  return `${format(new Date(start), "EEE, MMM d")} · ${format(new Date(start), "h:mm a")} - ${format(new Date(end), "h:mm a")}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatOfferStatusLabel(
  status: string,
  audience: "admin" | "candidate" = "admin",
) {
  if (audience === "candidate" && status === "sent") {
    return "Received";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
