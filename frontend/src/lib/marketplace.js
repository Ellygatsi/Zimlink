import {
  SquaresFour,
  Tag,
  Wrench,
  Briefcase,
  House,
} from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/* Static lists                                                        */
/* ------------------------------------------------------------------ */

export const COUNTRIES = [
  "United States",
  "Zimbabwe",
  "South Africa",
  "United Kingdom",
  "Canada",
  "Australia",
  "New Zealand",
  "Botswana",
  "Zambia",
  "Mozambique",
  "Namibia",
  "Malawi",
  "Kenya",
  "Tanzania",
  "Ghana",
  "Nigeria",
  "Uganda",
  "Rwanda",
  "Ireland",
  "Germany",
  "France",
  "Netherlands",
  "United Arab Emirates",
  "Other",
];

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

export const CATEGORIES = [
  { key: "goods", label: "Goods", icon: Tag },
  { key: "services", label: "Services", icon: Wrench },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "housing", label: "Housing", icon: House },
];

export const FILTER_CATEGORIES = [
  { key: "all", label: "All", icon: SquaresFour },
  ...CATEGORIES,
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export const getCategory = (key) => CATEGORY_MAP[key] || CATEGORY_MAP.goods;

export const JOB_RATE_PERIODS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Per month" },
];

export const RENT_PERIODS = [
  { value: "monthly", label: "Month" },
  { value: "weekly", label: "Week" },
  { value: "daily", label: "Day" },
  { value: "yearly", label: "Year" },
];

export const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "room", label: "Room" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

// Property types where bedrooms/bathrooms don't apply.
export const NO_ROOM_TYPES = ["land", "commercial"];

export const BEDROOM_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];
export const BATHROOM_OPTIONS = ["1", "1.5", "2", "2.5", "3", "4", "5", "6"];

const PERIOD_LABELS = {
  hourly: "hour",
  daily: "day",
  weekly: "week",
  biweekly: "2 weeks",
  monthly: "month",
  yearly: "year",
};

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

export const formatPeriod = (period) => PERIOD_LABELS[period] || period || "";

export const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return `$${value ?? ""}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

/** Returns { amount: "$650", per: "month" | null } for any listing. */
export const getPrice = (item) => {
  if (item.category === "jobs") {
    return {
      amount: formatMoney(item.rate ?? item.price),
      per: formatPeriod(item.rate_period) || null,
    };
  }
  if (item.category === "housing" && item.listing_type !== "sale") {
    return {
      amount: formatMoney(item.price),
      per: formatPeriod(item.rent_period || "monthly"),
    };
  }
  return { amount: formatMoney(item.price), per: null };
};

export const formatLocation = (item) =>
  [item?.city, item?.state, item?.country].filter(Boolean).join(", ");

export const getImages = (item) => {
  if (Array.isArray(item?.images) && item.images.length > 0) return item.images;
  if (item?.image_url) return [item.image_url];
  return [];
};

export const getDisplayTitle = (item) =>
  item?.category === "jobs" ? item.job_title || item.title : item?.title;

export const getPropertyLabel = (value) =>
  PROPERTY_TYPES.find((p) => p.value === value)?.label || "";

export const getListingTypeLabel = (value) =>
  value === "sale" ? "For sale" : "For rent";

export const formatBedrooms = (n, long = false) => {
  if (n == null || n === "") return null;
  if (Number(n) === 0) return "Studio";
  const unit = long ? (Number(n) === 1 ? "bedroom" : "bedrooms") : "bed";
  return `${n} ${unit}`;
};

export const formatBathrooms = (n, long = false) => {
  if (n == null || n === "") return null;
  const unit = long ? (Number(n) === 1 ? "bathroom" : "bathrooms") : "bath";
  return `${n} ${unit}`;
};

/* ------------------------------------------------------------------ */
/* Form helpers (shared by create + edit)                              */
/* ------------------------------------------------------------------ */

export const EMPTY_FORM = {
  category: "goods",
  title: "",
  description: "",
  price: "",
  image_url: "",
  images: [],
  // jobs
  job_title: "",
  rate_period: "hourly",
  // housing
  listing_type: "rent",
  rent_period: "monthly",
  property_type: "house",
  bedrooms: "",
  bathrooms: "",
  // location (all categories)
  country: "",
  state: "",
  city: "",
};

export const formFromItem = (item) => ({
  ...EMPTY_FORM,
  category: item.category || "goods",
  title: item.title || "",
  description: item.description || "",
  price: item.category === "jobs" ? item.rate ?? item.price ?? "" : item.price ?? "",
  job_title: item.job_title || item.title || "",
  rate_period: item.rate_period || "hourly",
  listing_type: item.listing_type || "rent",
  rent_period: item.rent_period || "monthly",
  property_type: item.property_type || "house",
  bedrooms: item.bedrooms ?? "",
  bathrooms: item.bathrooms ?? "",
  country: item.country || "",
  state: item.state || "",
  city: item.city || "",
});

/** Returns an error message, or null if the form is valid. */
export const validateListing = (form) => {
  const isJob = form.category === "jobs";
  const price = Number.parseFloat(form.price);

  if (!(isJob ? form.job_title : form.title).trim()) {
    return isJob ? "Enter a job title." : "Enter a title.";
  }
  if (!Number.isFinite(price) || price < 0) {
    return isJob ? "Enter a valid rate." : "Enter a valid price.";
  }
  if (!form.country) return "Select a country.";
  if (form.country === "United States" && !form.state) {
    return "Select a U.S. state.";
  }
  if (!form.city.trim()) return "Enter a city or town.";
  return null;
};

/** Builds the API payload. Location is sent for every category. */
export const buildPayload = (form) => {
  const isJob = form.category === "jobs";
  const isHousing = form.category === "housing";
  const isRent = isHousing && form.listing_type === "rent";
  const hasRooms = isHousing && !NO_ROOM_TYPES.includes(form.property_type);
  const price = Number.parseFloat(form.price);

  return {
    category: form.category,
    title: (isJob ? form.job_title : form.title).trim(),
    description: form.description.trim(),
    price,

    job_title: isJob ? form.job_title.trim() : null,
    rate: isJob ? price : null,
    rate_period: isJob ? form.rate_period : null,

    listing_type: isHousing ? form.listing_type : null,
    rent_period: isRent ? form.rent_period : null,
    property_type: isHousing ? form.property_type : null,
    bedrooms: hasRooms && form.bedrooms !== "" ? Number(form.bedrooms) : null,
    bathrooms: hasRooms && form.bathrooms !== "" ? Number(form.bathrooms) : null,

    country: form.country,
    state: form.country === "United States" ? form.state || null : null,
    city: form.city.trim(),
  };
};

