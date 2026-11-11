export const EXPENSE_CATEGORIES = [
  "Seeds",
  "Fertilizer",
  "Pesticides",
  "Feed",
  "Veterinary",
  "Labor",
  "Fuel",
  "Equipment",
  "Transport",
  "Utilities",
  "Land & Rent",
  "Repairs",
  "Supplies",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Crop Sales",
  "Livestock Sales",
  "Livestock Products",
  "Produce",
  "Services",
  "Subsidies",
  "Other",
] as const;

export const INVENTORY_CATEGORIES = [
  "Seeds",
  "Fertilizer",
  "Pesticides",
  "Feed",
  "Veterinary",
  "Fuel",
  "Tools",
  "Supplies",
  "Produce",
  "Other",
] as const;

export const UNITS = [
  "kg",
  "g",
  "sack",
  "bag",
  "liter",
  "ml",
  "piece",
  "box",
  "crate",
  "pack",
  "head",
  "bottle",
] as const;

export const PAYMENT_METHODS = [
  "Cash",
  "GCash",
  "Maya",
  "Bank Transfer",
  "Check",
  "Credit",
] as const;

export const LIVESTOCK_SPECIES = [
  "Cattle",
  "Carabao",
  "Goat",
  "Sheep",
  "Pig",
  "Chicken",
  "Duck",
  "Rabbit",
  "Other",
] as const;

export const LIVESTOCK_STATUSES = [
  "Active",
  "Breeding",
  "Quarantine",
  "Sold",
  "Deceased",
] as const;

export const LIVESTOCK_SEXES = ["Male", "Female"] as const;

export const CROP_STATUSES = [
  "Planned",
  "Growing",
  "Harvested",
  "Failed",
] as const;

export const AREA_UNITS = ["ha", "sqm", "acre"] as const;

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/expenses", label: "Expenses", icon: "Receipt" },
  { href: "/income", label: "Income", icon: "TrendingUp" },
  { href: "/inventory", label: "Inventory", icon: "Package" },
  { href: "/livestock", label: "Livestock", icon: "Beef" },
  { href: "/crops", label: "Crops", icon: "Sprout" },
  { href: "/reports", label: "Reports", icon: "FileSpreadsheet" },
] as const;
