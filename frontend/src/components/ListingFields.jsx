import { MapPin } from "@phosphor-icons/react";
import {
  BATHROOM_OPTIONS,
  BEDROOM_OPTIONS,
  CATEGORIES,
  COUNTRIES,
  JOB_RATE_PERIODS,
  NO_ROOM_TYPES,
  PROPERTY_TYPES,
  RENT_PERIODS,
  US_STATES,
} from "@/lib/marketplace";

export const inputClass =
  "w-full h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white";

export const labelClass =
  "text-xs font-medium tracking-widest text-neutral-500 uppercase";

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <label className={labelClass}>{label}</label>
    <div className="mt-2">{children}</div>
  </div>
);

/**
 * All listing fields, shared by the "New post" and "Edit" forms.
 *
 * Props:
 *  - form, setField(field, value)
 *  - onCategoryChange: pass to show the category picker (create only)
 *  - picturesSlot: rendered right after the category picker
 */
export default function ListingFields({
  form,
  setField,
  onCategoryChange,
  picturesSlot,
}) {
  const isJob = form.category === "jobs";
  const isHousing = form.category === "housing";
  const isRent = isHousing && form.listing_type === "rent";
  const hasRooms = isHousing && !NO_ROOM_TYPES.includes(form.property_type);

  const handleCountryChange = (country) => {
    setField("country", country);
    if (country !== "United States") setField("state", "");
  };

  const priceLabel = isJob ? "Rate ($)" : isRent ? "Rent ($)" : "Price ($)";
  const preview = [form.city.trim(), form.state, form.country]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      {onCategoryChange && (
        <div
          className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800"
          role="radiogroup"
          aria-label="Category"
          data-testid="listing-category-picker"
        >
          {CATEGORIES.map(({ key, label, icon: Icon }) => {
            const active = form.category === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onCategoryChange(key)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm"
                    : "text-neutral-500"
                }`}
                data-testid={`listing-category-${key}`}
              >
                <Icon
                  size={18}
                  weight={active ? "bold" : "regular"}
                  className={active ? "text-green-600" : ""}
                />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {picturesSlot}

      {isHousing && (
        <Field label="Listing type">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "rent", label: "For rent" },
              { value: "sale", label: "For sale" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField("listing_type", opt.value)}
                className={`h-11 rounded-lg text-sm font-medium ${
                  form.listing_type === opt.value
                    ? "bg-green-600 text-black"
                    : "bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white"
                }`}
                data-testid={`housing-type-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      )}

      {isJob ? (
        <Field label="Job title">
          <input
            required
            className={inputClass}
            value={form.job_title}
            onChange={(e) => setField("job_title", e.target.value)}
            placeholder="e.g. Caregiver, Driver, Accountant"
            data-testid="job-title-input"
          />
        </Field>
      ) : (
        <Field label="Title">
          <input
            required
            className={inputClass}
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder={isHousing ? "e.g. 3-bed house with garden" : ""}
            data-testid="listing-title-input"
          />
        </Field>
      )}

      <div className={`grid gap-3 ${isJob || isRent ? "grid-cols-2" : "grid-cols-1"}`}>
        <Field label={priceLabel}>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            inputMode="decimal"
            className={inputClass}
            value={form.price}
            onChange={(e) => setField("price", e.target.value)}
            data-testid="listing-price-input"
          />
        </Field>

        {isJob && (
          <Field label="Rate period">
            <select
              className={inputClass}
              value={form.rate_period}
              onChange={(e) => setField("rate_period", e.target.value)}
              data-testid="job-rate-period-select"
            >
              {JOB_RATE_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {isRent && (
          <Field label="Per">
            <select
              className={inputClass}
              value={form.rent_period}
              onChange={(e) => setField("rent_period", e.target.value)}
              data-testid="housing-rent-period-select"
            >
              {RENT_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {isHousing && (
        <div className={`grid gap-3 ${hasRooms ? "grid-cols-3" : "grid-cols-1"}`}>
          <Field label="Type">
            <select
              className={`${inputClass} px-2 text-sm`}
              value={form.property_type}
              onChange={(e) => setField("property_type", e.target.value)}
              data-testid="housing-property-type-select"
            >
              {PROPERTY_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          {hasRooms && (
            <>
              <Field label="Beds">
                <select
                  className={`${inputClass} px-2 text-sm`}
                  value={form.bedrooms}
                  onChange={(e) => setField("bedrooms", e.target.value)}
                  data-testid="housing-bedrooms-select"
                >
                  <option value="">–</option>
                  {BEDROOM_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n === "0" ? "Studio" : n}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Baths">
                <select
                  className={`${inputClass} px-2 text-sm`}
                  value={form.bathrooms}
                  onChange={(e) => setField("bathrooms", e.target.value)}
                  data-testid="housing-bathrooms-select"
                >
                  <option value="">–</option>
                  {BATHROOM_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
      )}

      {/* Location — every category */}
      <div className="rounded-xl p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-3">
        <p className={`${labelClass} flex items-center gap-1.5`}>
          <MapPin size={14} weight="fill" className="text-green-600" />
          Where is it?
        </p>

        <div>
          <p className="text-xs text-neutral-500 mb-1">Country</p>
          <select
            required
            className={inputClass}
            value={form.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            data-testid="listing-country-select"
          >
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {form.country === "United States" && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">State</p>
            <select
              required
              className={inputClass}
              value={form.state}
              onChange={(e) => setField("state", e.target.value)}
              data-testid="listing-state-select"
            >
              <option value="">Select state</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <p className="text-xs text-neutral-500 mb-1">City or town</p>
          <input
            required
            className={inputClass}
            value={form.city}
            onChange={(e) => setField("city", e.target.value)}
            placeholder="Enter city or town"
            data-testid="listing-city-input"
          />
        </div>

        {preview && form.country && form.city.trim() && (
          <p className="text-xs text-neutral-500">
            Shown on your post as{" "}
            <span className="font-medium text-black dark:text-white">{preview}</span>
          </p>
        )}
      </div>

      <Field label="Description">
        <textarea
          required
          rows={4}
          className="w-full rounded-lg p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white resize-none"
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder={
            isJob
              ? "Describe the role, duties, requirements and how to apply."
              : isHousing
              ? "Describe the property, area, amenities and when it's available."
              : "Describe what you are offering."
          }
          data-testid="listing-description-input"
        />
      </Field>
    </>
  );
}
