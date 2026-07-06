export type RoomStatus = "Available" | "Occupied" | "Maintenance";
export type RoomType = "Single" | "Double" | "Deluxe" | "Suite";

export interface Room {
  id: string;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  price: number;
  status: RoomStatus;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  idProof: string;
  createdAt: string;
}

export type BookingStatus = "Confirmed" | "CheckedIn" | "CheckedOut" | "Cancelled";

export interface Booking {
  id: string;
  guestId: string;
  roomId: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  actualCheckIn?: string; // ISO string
  actualCheckOut?: string; // ISO string
  status: BookingStatus;
  totalGuests: number;
  specialRequests?: string;
  createdAt: string;
}

export type MenuCategory = "Breakfast" | "Lunch" | "Dinner" | "Beverage" | "Dessert";

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  description: string;
  isAvailable: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface DiningOrder {
  id: string;
  bookingId: string;
  items: OrderItem[];
  status: "Pending" | "Served" | "Cancelled";
  orderTime: string; // ISO string
  totalAmount: number;
}

export interface Invoice {
  id: string;
  bookingId: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckInDate?: string;
  actualCheckOutDate?: string;
  durationOfStay: number; // in days
  roomRate: number;
  roomCharges: number;
  diningCharges: number;
  additionalCharges: number; // service charge, laundry, etc.
  taxRate: number; // e.g., 0.18 for 18% GST
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
}

export interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  totalGuests: number;
  activeBookings: number; // Bookings with status CheckedIn or Confirmed (upcoming/current)
  totalRevenue: number;
}
