import { createContext, useContext, useState, useEffect } from "react";

export type Language = "hi" | "en";

interface I18nContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "hi",
  setLang: () => {},
  t: (k) => k,
});

export function useI18n() {
  return useContext(I18nContext);
}

// Translations
const TRANSLATIONS: Record<Language, Record<string, string>> = {
  hi: {
    // Common
    home: "Home",
    search: "Search",
    hotels: "Hotels",
    restaurants: "Restaurants",
    spas: "Spas",
    places: "Places",
    bookings: "Bookings",
    notifications: "Notifications",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    submit: "Submit",
    book_now: "Book Now",
    reserve: "Reserve",
    view: "View",
    map: "Map",
    share: "Share",
    call: "Call",
    back: "Back",
    next: "Next",
    loading: "Loading...",
    no_data: "No data available",
    see_all: "See all",
    // Home
    welcome: "Namaste",
    welcome_tagline: "Agra mein aapka swagat hai",
    search_placeholder: "Hotel, jagah, restaurant dhundho...",
    top_hotels: "Top Hotels in Agra",
    popular_restaurants: "Popular Restaurants",
    explore_agra: "Explore Agra",
    featured: "Featured in Agra",
    recent_alerts: "Recent Alerts",
    // Hotel
    hotel_detail: "Hotel Details",
    check_in: "Check-in",
    check_out: "Check-out",
    total_rooms: "Total Rooms",
    amenities: "Amenities",
    nearby_places: "Nearby Places",
    price_per_night: "Price per night",
    // Restaurant
    restaurant_detail: "Restaurant Details",
    cuisine: "Cuisine",
    seating: "Seating Capacity",
    opening_hours: "Opening Hours",
    // Spa
    spa_detail: "Spa Details",
    facilities: "Facilities",
    // Dashboard
    today_checkins: "Today's Check-ins",
    active_guests: "Active Guests",
    pending_bookings: "Pending Bookings",
    revenue: "Revenue",
    today_appointments: "Today's Appointments",
    pending_appointments: "Pending",
    today_reservations: "Today's Reservations",
    // Form
    draft_saved: "Draft saved",
    draft_restore: "Aapka draft save hua tha",
    draft_restore_desc: "Pehle se bharaya hua data restore karein",
    profile_complete: "Profile complete",
    // Auth
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    full_name: "Full Name",
    phone: "Phone Number",
    // Errors
    required_field: "This field is required",
    invalid_email: "Invalid email address",
    // Language
    language: "Language",
    hindi: "Hindi",
    english: "English",
    // Empty states
    no_hotels_yet: "Abhi koi hotel approved nahi hai",
    no_restaurants_yet: "Abhi koi restaurant available nahi hai",
    // Customer nav
    my_bookings: "My Bookings",
    my_payments: "Payments",
    my_reservations: "My Reservations",
    help_support: "Help & Support",
    list_your_business: "List Your Business",
    // Nearby
    distance: "Distance",
    from_taj_mahal: "from Taj Mahal",
    from_airport: "from Airport",
    from_railway: "from Railway Station",
    // Info links
    contact_us: "Contact Us",
    privacy_policy: "Privacy Policy",
    terms_of_use: "Terms of Use",
    // Misc
    trips: "Trips",
    refunds: "Refunds",
    // Bookings
    book_appointment: "Book Appointment",
    reserve_table: "Reserve a Table",
    book_room: "Book This Room",
    fully_booked: "Fully Booked",
    view_menu_reserve: "View Menu & Reserve",
    confirm_booking: "Confirm Booking",
    booking_confirmed: "Booking Confirmed!",
    cancel_booking: "Cancel Booking",
    booking_not_found: "Booking not found",
    // Admin
    owner_requests: "Owner Requests",
    verified: "Verified",
    pending: "Pending",
    rejected: "Rejected",
  },
  en: {
    // Common
    home: "Home",
    search: "Search",
    hotels: "Hotels",
    restaurants: "Restaurants",
    spas: "Spas",
    places: "Places",
    bookings: "Bookings",
    notifications: "Notifications",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    submit: "Submit",
    book_now: "Book Now",
    reserve: "Reserve",
    view: "View",
    map: "Map",
    share: "Share",
    call: "Call",
    back: "Back",
    next: "Next",
    loading: "Loading...",
    no_data: "No data available",
    see_all: "See all",
    // Home
    welcome: "Namaste",
    welcome_tagline: "Welcome to Agra",
    search_placeholder: "Search hotels, places, restaurants...",
    top_hotels: "Top Hotels in Agra",
    popular_restaurants: "Popular Restaurants",
    explore_agra: "Explore Agra",
    featured: "Featured in Agra",
    recent_alerts: "Recent Alerts",
    // Hotel
    hotel_detail: "Hotel Details",
    check_in: "Check-in",
    check_out: "Check-out",
    total_rooms: "Total Rooms",
    amenities: "Amenities",
    nearby_places: "Nearby Places",
    price_per_night: "Price per night",
    // Restaurant
    restaurant_detail: "Restaurant Details",
    cuisine: "Cuisine",
    seating: "Seating Capacity",
    opening_hours: "Opening Hours",
    // Spa
    spa_detail: "Spa Details",
    facilities: "Facilities",
    // Dashboard
    today_checkins: "Today's Check-ins",
    active_guests: "Active Guests",
    pending_bookings: "Pending Bookings",
    revenue: "Revenue",
    today_appointments: "Today's Appointments",
    pending_appointments: "Pending",
    today_reservations: "Today's Reservations",
    // Form
    draft_saved: "Draft saved",
    draft_restore: "You have a saved draft",
    draft_restore_desc: "Restore your previously entered data",
    profile_complete: "Profile complete",
    // Auth
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    full_name: "Full Name",
    phone: "Phone Number",
    // Errors
    required_field: "This field is required",
    invalid_email: "Invalid email address",
    // Language
    language: "Language",
    hindi: "Hindi",
    english: "English",
    // Empty states
    no_hotels_yet: "No hotels available yet",
    no_restaurants_yet: "No restaurants available yet",
    // Customer nav
    my_bookings: "My Bookings",
    my_payments: "Payments",
    my_reservations: "My Reservations",
    help_support: "Help & Support",
    list_your_business: "List Your Business",
    // Nearby
    distance: "Distance",
    from_taj_mahal: "from Taj Mahal",
    from_airport: "from Airport",
    from_railway: "from Railway Station",
    // Info links
    contact_us: "Contact Us",
    privacy_policy: "Privacy Policy",
    terms_of_use: "Terms of Use",
    // Misc
    trips: "Trips",
    refunds: "Refunds",
  },
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("app_lang") as Language) || "hi";
    }
    return "hi";
  });

  function setLang(l: Language) {
    setLangState(l);
    localStorage.setItem("app_lang", l);
  }

  function t(key: string) {
    return TRANSLATIONS[lang][key] ?? key;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}
