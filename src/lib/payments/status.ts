/** Mapping statut paiement DB ↔ logique app (l'enum DB est en minuscules) */
export type DbPaymentStatus = "pending" | "paid" | "failed" | "cancelled";
export type AppPaymentStatus = DbPaymentStatus;

export function toDbPaymentStatus(status: AppPaymentStatus): DbPaymentStatus {
  return status;
}

export function fromDbPaymentStatus(status: string): AppPaymentStatus {
  switch (status.toLowerCase()) {
    case "success":
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
}

/** Catégories DB = miss | master */
export type DbCategory = "miss" | "master";

export function toDbCategory(category: string): DbCategory {
  return category.toLowerCase() === "master" ? "master" : "miss";
}
