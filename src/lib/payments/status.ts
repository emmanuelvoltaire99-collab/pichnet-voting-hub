/** Mapping statut paiement DB (AI Studio) ↔ logique app */
export type DbPaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
export type AppPaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export function toDbPaymentStatus(status: AppPaymentStatus): DbPaymentStatus {
  switch (status) {
    case "paid":
      return "SUCCESS";
    case "failed":
      return "FAILED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export function fromDbPaymentStatus(status: string): AppPaymentStatus {
  switch (status.toUpperCase()) {
    case "SUCCESS":
    case "PAID":
      return "paid";
    case "FAILED":
      return "failed";
    case "CANCELLED":
    case "CANCELED":
      return "cancelled";
    default:
      return "pending";
  }
}

/** Catégories DB = MISS | MASTER */
export type DbCategory = "MISS" | "MASTER";

export function toDbCategory(category: string): DbCategory {
  return category.toUpperCase() === "MASTER" ? "MASTER" : "MISS";
}
