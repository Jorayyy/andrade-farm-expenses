export const EXPENSE_CATEGORIES = [
  "Seeds",
  "Fertilizer",
  "Pesticides",
  "Irrigation",
  "Land Preparation",
  "Harvest & Drying",
  "Labor",
  "Feed",
  "Veterinary",
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
  "ha",
  "mm",
  "cm",
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

// ---------------------------------------------------------------------------
// Rice paddy options
// ---------------------------------------------------------------------------

export const PADDY_STATUSES = ["Active", "Fallow", "Rented out"] as const;

export const IRRIGATION_TYPES = ["Irrigated", "Partially irrigated", "Rainfed"] as const;

export const WATER_SOURCES = [
  "NIA canal",
  "Deep well",
  "Shallow tube well",
  "River",
  "Spring",
  "Pond",
  "Rain only",
  "Other",
] as const;

export const SOIL_TYPES = [
  "Clay",
  "Clay loam",
  "Silty clay",
  "Loam",
  "Silt loam",
  "Sandy loam",
  "Sandy",
  "Other",
] as const;

export const SEASON_TYPES = ["Wet", "Dry"] as const;

export const PLANTING_METHODS = ["Transplanted", "Direct-seeded"] as const;

export const SEASON_STATUSES = [
  "Planned",
  "Land preparation",
  "Nursery",
  "Vegetative",
  "Reproductive",
  "Ripening",
  "Harvested",
  "Failed",
] as const;

export const OPERATION_TYPES = [
  "Land preparation",
  "Nursery / sowing",
  "Transplanting",
  "Basal fertilizer",
  "Topdress fertilizer",
  "Pesticide",
  "Herbicide",
  "Weeding",
  "Irrigation",
  "Drainage",
  "Harvest",
  "Other",
] as const;

export const ISSUE_TYPES = ["Pest", "Disease", "Weed", "Nutrient", "Water", "Weather", "Other"] as const;

export const TASK_TYPES = [
  "Irrigation",
  "Fertilizer",
  "Spray",
  "Scouting",
  "Weeding",
  "Harvest",
  "Maintenance",
  "Other",
] as const;

export const TASK_PRIORITIES = ["Low", "Normal", "High", "Urgent"] as const;

export const TASK_STATUSES = ["Open", "Done", "Skipped"] as const;

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/paddies", label: "Paddies", icon: "Waves" },
  { href: "/planner", label: "Planner", icon: "CalendarDays" },
  { href: "/expenses", label: "Expenses", icon: "Receipt" },
  { href: "/income", label: "Income", icon: "TrendingUp" },
  { href: "/inventory", label: "Inventory", icon: "Package" },
  { href: "/livestock", label: "Livestock", icon: "Beef" },
  { href: "/crops", label: "Other crops", icon: "Sprout" },
  { href: "/reports", label: "Reports", icon: "FileSpreadsheet" },
] as const;
