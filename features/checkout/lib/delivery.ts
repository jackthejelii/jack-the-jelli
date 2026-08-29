// Delivery zones and fees — the one place either is defined.
//
// The checkout summary renders from this and `placeOrder` recomputes from it,
// so the number the customer agrees to and the number stored on the order can
// never disagree. Nothing the client submits about the fee is read.
//
// No server-only import here: the checkout form is a client component.

/**
 * The 64 districts, grouped by division so the <select> can render optgroups.
 * Districts are the courier's unit of pricing; upazila/thana stays free text
 * for the MVP — a ~500-entry cascading dataset is bundle weight the courier
 * doesn't need.
 */
export const DISTRICTS_BY_DIVISION = {
  Barishal: [
    "Barguna",
    "Barishal",
    "Bhola",
    "Jhalokati",
    "Patuakhali",
    "Pirojpur",
  ],
  Chattogram: [
    "Bandarban",
    "Brahmanbaria",
    "Chandpur",
    "Chattogram",
    "Cumilla",
    "Cox's Bazar",
    "Feni",
    "Khagrachhari",
    "Lakshmipur",
    "Noakhali",
    "Rangamati",
  ],
  Dhaka: [
    "Dhaka",
    "Faridpur",
    "Gazipur",
    "Gopalganj",
    "Kishoreganj",
    "Madaripur",
    "Manikganj",
    "Munshiganj",
    "Narayanganj",
    "Narsingdi",
    "Rajbari",
    "Shariatpur",
    "Tangail",
  ],
  Khulna: [
    "Bagerhat",
    "Chuadanga",
    "Jashore",
    "Jhenaidah",
    "Khulna",
    "Kushtia",
    "Magura",
    "Meherpur",
    "Narail",
    "Satkhira",
  ],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
  Rajshahi: [
    "Bogura",
    "Chapai Nawabganj",
    "Joypurhat",
    "Naogaon",
    "Natore",
    "Pabna",
    "Rajshahi",
    "Sirajganj",
  ],
  Rangpur: [
    "Dinajpur",
    "Gaibandha",
    "Kurigram",
    "Lalmonirhat",
    "Nilphamari",
    "Panchagarh",
    "Rangpur",
    "Thakurgaon",
  ],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
} as const;

export const DIVISIONS = Object.keys(
  DISTRICTS_BY_DIVISION,
) as (keyof typeof DISTRICTS_BY_DIVISION)[];

const DIVISION_BY_DISTRICT = new Map<string, string>(
  DIVISIONS.flatMap((division) =>
    DISTRICTS_BY_DIVISION[division].map(
      (district) => [district, division] as [string, string],
    ),
  ),
);

export function isKnownDistrict(district: string): boolean {
  return DIVISION_BY_DISTRICT.has(district);
}

/**
 * The division a district belongs to.
 *
 * The checkout form has a Division select, but only to shorten the district
 * list — the stored division is derived from the district here, so the two can
 * never disagree no matter what the client submits.
 */
export function getDivisionForDistrict(district: string): string | null {
  return DIVISION_BY_DISTRICT.get(district.trim()) ?? null;
}

export const DELIVERY_ZONES = ["inside-dhaka", "outside-dhaka"] as const;
export type DeliveryZone = (typeof DELIVERY_ZONES)[number];

/** Same-city courier rates only apply within Dhaka district itself. */
const INSIDE_DHAKA_DISTRICTS = new Set(["Dhaka"]);

const DELIVERY_FEES: Record<DeliveryZone, number> = {
  "inside-dhaka": 60,
  "outside-dhaka": 120,
};

/** Subtotal (in taka) at or above which delivery is on us. */
export const FREE_DELIVERY_THRESHOLD = 5000;

export function getDeliveryZone(district: string): DeliveryZone {
  return INSIDE_DHAKA_DISTRICTS.has(district.trim())
    ? "inside-dhaka"
    : "outside-dhaka";
}

/**
 * The fee for a subtotal in a zone. Takes the zone rather than the district so
 * the stored `deliveryZone` on an old order still reprices identically even if
 * the district list is later regrouped.
 */
export function getDeliveryFee(zone: DeliveryZone, subtotal: number): number {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  return DELIVERY_FEES[zone];
}

/** How much more the customer must add to stop paying for delivery. */
export function amountToFreeDelivery(subtotal: number): number {
  return Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
}
