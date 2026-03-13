export const STATUS_CLASSES: Record<string, string> = {
  pending:       "bg-yellow-50  text-yellow-800  border-yellow-200",
  confirmed:     "bg-blue-50    text-blue-800    border-blue-200",
  checked_in:    "bg-violet-50  text-violet-800  border-violet-200",
  in_progress:   "bg-orange-50  text-orange-800  border-orange-200",
  completed:     "bg-green-50   text-green-800   border-green-200",
  cancelled:     "bg-red-50     text-red-800     border-red-200",
  no_show:       "bg-gray-100   text-gray-600    border-gray-200",
  waiting:       "bg-yellow-50  text-yellow-800  border-yellow-200",
  waiting_parts: "bg-purple-50  text-purple-800  border-purple-200",
  on_hold:       "bg-gray-100   text-gray-600    border-gray-200",
  qc:            "bg-blue-50    text-blue-800    border-blue-200",
  draft:         "bg-gray-100   text-gray-600    border-gray-200",
  sent:          "bg-blue-50    text-blue-800    border-blue-200",
  viewed:        "bg-violet-50  text-violet-800  border-violet-200",
  approved:      "bg-green-50   text-green-800   border-green-200",
  rejected:      "bg-red-50     text-red-800     border-red-200",
  expired:       "bg-orange-50  text-orange-800  border-orange-200",
  partial:       "bg-orange-50  text-orange-800  border-orange-200",
  paid:          "bg-green-50   text-green-800   border-green-200",
  overdue:       "bg-red-50     text-red-800     border-red-200",
  void:          "bg-gray-100   text-gray-600    border-gray-200",
  delivered:     "bg-teal-50    text-teal-800    border-teal-200",
};

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function statusClass(status: string): string {
  return STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
}
