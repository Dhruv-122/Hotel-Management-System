import fs from "fs";
import path from "path";
import { Room, Guest, Booking, MenuItem, DiningOrder, Invoice, RoomStatus, RoomType, MenuCategory } from "../src/types";

const DATA_DIR = path.join(process.cwd(), "data");

// Helper to ensure data directory exists and returns safe file paths
function getFilePath(filename: string): string {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  return path.join(DATA_DIR, filename);
}

// Low-level read/write utilities
function readJSON<T>(filename: string, defaultValue: T): T {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    writeJSON(filename, defaultValue);
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading database file ${filename}:`, error);
    return defaultValue;
  }
}

function writeJSON<T>(filename: string, data: T): void {
  const filePath = getFilePath(filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing database file ${filename}:`, error);
  }
}

// SEED DATA DECLARATIONS
const INITIAL_ROOMS: Room[] = [
  { id: "rm-101", roomNumber: "101", type: "Single", capacity: 1, price: 1200, status: "Available" },
  { id: "rm-102", roomNumber: "102", type: "Single", capacity: 1, price: 1200, status: "Available" },
  { id: "rm-103", roomNumber: "103", type: "Double", capacity: 2, price: 2000, status: "Occupied" },
  { id: "rm-104", roomNumber: "104", type: "Double", capacity: 2, price: 2000, status: "Available" },
  { id: "rm-105", roomNumber: "105", type: "Deluxe", capacity: 2, price: 3500, status: "Available" },
  { id: "rm-201", roomNumber: "201", type: "Deluxe", capacity: 2, price: 3500, status: "Occupied" },
  { id: "rm-202", roomNumber: "202", type: "Suite", capacity: 4, price: 6000, status: "Available" },
  { id: "rm-203", roomNumber: "203", type: "Suite", capacity: 4, price: 6000, status: "Maintenance" },
  { id: "rm-204", roomNumber: "204", type: "Double", capacity: 2, price: 2000, status: "Available" },
  { id: "rm-205", roomNumber: "205", type: "Single", capacity: 1, price: 1200, status: "Available" }
];

const INITIAL_GUESTS: Guest[] = [
  { id: "gst-1", name: "John Doe", email: "john.doe@example.com", phone: "+1-555-0199", idProof: "Passport US12345", createdAt: new Date("2026-06-15T10:00:00Z").toISOString() },
  { id: "gst-2", name: "Jane Smith", email: "jane.smith@example.com", phone: "+1-555-0144", idProof: "Driver License DL98765", createdAt: new Date("2026-06-20T11:30:00Z").toISOString() },
  { id: "gst-3", name: "Raj Patel", email: "raj.patel@example.com", phone: "+91-9876543210", idProof: "Aadhaar 1234-5678-9012", createdAt: new Date("2026-07-01T09:15:00Z").toISOString() }
];

const INITIAL_BOOKINGS: Booking[] = [
  { id: "bk-1", guestId: "gst-3", roomId: "rm-103", checkInDate: "2026-07-06", checkOutDate: "2026-07-09", actualCheckIn: new Date().toISOString(), status: "CheckedIn", totalGuests: 2, createdAt: new Date().toISOString() },
  { id: "bk-2", guestId: "gst-2", roomId: "rm-201", checkInDate: "2026-07-05", checkOutDate: "2026-07-08", actualCheckIn: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), status: "CheckedIn", totalGuests: 2, createdAt: new Date().toISOString() },
  { id: "bk-3", guestId: "gst-1", roomId: "rm-101", checkInDate: "2026-07-10", checkOutDate: "2026-07-12", status: "Confirmed", totalGuests: 1, createdAt: new Date().toISOString() }
];

const INITIAL_MENU: MenuItem[] = [
  { id: "mn-1", name: "Masala Dosa", category: "Breakfast", price: 120, description: "Crispy south Indian crepe stuffed with spiced potato masala, served with sambar and chutneys.", isAvailable: true },
  { id: "mn-2", name: "Continental Breakfast Platter", category: "Breakfast", price: 250, description: "Toasted sliced bread, organic butter, jam, eggs of your choice, fresh fruit juice, and warm tea/coffee.", isAvailable: true },
  { id: "mn-3", name: "Paneer Butter Masala with Naan", category: "Lunch", price: 320, description: "Rich, velvety cottage cheese tomato gravy served with 2 freshly made tandoori butter naans.", isAvailable: true },
  { id: "mn-4", name: "Aromatic Chicken Biryani", category: "Lunch", price: 380, description: "Authentic dum biryani prepared with layered fragrant basmati rice, tender chicken, and spices, served with raita.", isAvailable: true },
  { id: "mn-5", name: "Slow-Cooked Dal Makhani & Rice", category: "Dinner", price: 280, description: "Creamy whole black lentils slow-cooked overnight with ghee and spices, paired with hot steamed cumin rice.", isAvailable: true },
  { id: "mn-6", name: "Zesty Fresh Lime Soda", category: "Beverage", price: 80, description: "Chilled sparkling refreshment with your choice of sweet, salted, or mixed lime flavor.", isAvailable: true },
  { id: "mn-7", name: "Traditional Masala Tea", category: "Beverage", price: 60, description: "Freshly brewed strong Indian tea flavored with ginger, cardamom, and aromatic spices.", isAvailable: true },
  { id: "mn-8", name: "Gulab Jamun (2pcs)", category: "Dessert", price: 90, description: "Golden fried soft milk dumplings soaked in a warm, sweet, cardamom-infused sugar syrup.", isAvailable: true }
];

const INITIAL_ORDERS: DiningOrder[] = [
  {
    id: "ord-1",
    bookingId: "bk-1",
    items: [
      { menuItemId: "mn-7", name: "Traditional Masala Tea", quantity: 2, price: 60 },
      { menuItemId: "mn-8", name: "Gulab Jamun (2pcs)", quantity: 1, price: 90 }
    ],
    status: "Served",
    orderTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    totalAmount: 210
  },
  {
    id: "ord-2",
    bookingId: "bk-2",
    items: [
      { menuItemId: "mn-4", name: "Aromatic Chicken Biryani", quantity: 1, price: 380 },
      { menuItemId: "mn-6", name: "Zesty Fresh Lime Soda", quantity: 1, price: 80 }
    ],
    status: "Served",
    orderTime: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    totalAmount: 460
  }
];

const INITIAL_INVOICES: Invoice[] = [];

// Initialize Store Class
class DataStore {
  getRooms(): Room[] {
    return readJSON<Room[]>("rooms.json", INITIAL_ROOMS);
  }
  saveRooms(rooms: Room[]): void {
    writeJSON("rooms.json", rooms);
  }

  getGuests(): Guest[] {
    return readJSON<Guest[]>("guests.json", INITIAL_GUESTS);
  }
  saveGuests(guests: Guest[]): void {
    writeJSON("guests.json", guests);
  }

  getBookings(): Booking[] {
    return readJSON<Booking[]>("bookings.json", INITIAL_BOOKINGS);
  }
  saveBookings(bookings: Booking[]): void {
    writeJSON("bookings.json", bookings);
  }

  getMenu(): MenuItem[] {
    return readJSON<MenuItem[]>("menu.json", INITIAL_MENU);
  }
  saveMenu(menu: MenuItem[]): void {
    writeJSON("menu.json", menu);
  }

  getOrders(): DiningOrder[] {
    return readJSON<DiningOrder[]>("orders.json", INITIAL_ORDERS);
  }
  saveOrders(orders: DiningOrder[]): void {
    writeJSON("orders.json", orders);
  }

  getInvoices(): Invoice[] {
    return readJSON<Invoice[]>("invoices.json", INITIAL_INVOICES);
  }
  saveInvoices(invoices: Invoice[]): void {
    writeJSON("invoices.json", invoices);
  }
}

export const store = new DataStore();
