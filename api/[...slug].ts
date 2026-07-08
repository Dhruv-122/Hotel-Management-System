import { promises as fs } from "fs";
import path from "path";
import { Room, Guest, Booking, MenuItem, DiningOrder, Invoice } from "../src/types";
import type { IncomingMessage, ServerResponse } from "http";

const DATA_DIR = path.join(process.cwd(), "data");

const store = {
  rooms: [] as Room[],
  guests: [] as Guest[],
  bookings: [] as Booking[],
  menu: [] as MenuItem[],
  orders: [] as DiningOrder[],
  invoices: [] as Invoice[],
  loaded: false,
};

const DB_FILES = {
  rooms: "rooms.json",
  guests: "guests.json",
  bookings: "bookings.json",
  menu: "menu.json",
  orders: "orders.json",
  invoices: "invoices.json",
};

async function readJSON<T>(file: string, defaultValue: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    return defaultValue;
  }
}

async function loadStore() {
  if (store.loaded) return;

  const [rooms, guests, bookings, menu, orders, invoices] = await Promise.all([
    readJSON<Room[]>(DB_FILES.rooms, []),
    readJSON<Guest[]>(DB_FILES.guests, []),
    readJSON<Booking[]>(DB_FILES.bookings, []),
    readJSON<MenuItem[]>(DB_FILES.menu, []),
    readJSON<DiningOrder[]>(DB_FILES.orders, []),
    readJSON<Invoice[]>(DB_FILES.invoices, []),
  ]);

  store.rooms = rooms;
  store.guests = guests;
  store.bookings = bookings;
  store.menu = menu;
  store.orders = orders;
  store.invoices = invoices;
  store.loaded = true;
}

function sendJSON(res: ServerResponse, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, message: string, status = 500) {
  sendJSON(res, { error: message }, status);
}

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

function parseRequestBody(req: IncomingMessage) {
  return new Promise<any>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf-8");
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function getPathSegments(req: IncomingMessage) {
  const rawUrl = req.url || "";
  const url = new URL(rawUrl, `http://${req.headers.host || "localhost"}`);
  return url.pathname.split("/").filter(Boolean);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await loadStore();
  const method = req.method || "GET";
  const segments = getPathSegments(req);

  if (segments[0] !== "api") {
    return sendError(res, "Not found", 404);
  }

  const resource = segments[1];
  const resourceId = segments[2] || null;
  const action = segments[3] || null;

  try {
    if (resource === "rooms") {
      if (method === "GET" && !resourceId) {
        return sendJSON(res, store.rooms);
      }

      if (method === "POST") {
        const body = await parseRequestBody(req);
        const { roomNumber, type, capacity, price, status } = body;
        if (!roomNumber || !type || !capacity || !price) {
          return sendError(res, "Missing required room fields", 400);
        }

        const exists = store.rooms.some((r) => r.roomNumber === String(roomNumber).trim());
        if (exists) {
          return sendError(res, `Room ${roomNumber} already exists`, 400);
        }

        const newRoom: Room = {
          id: generateId("rm"),
          roomNumber: String(roomNumber).trim(),
          type,
          capacity: Number(capacity),
          price: Number(price),
          status: status || "Available",
        };

        store.rooms.push(newRoom);
        return sendJSON(res, newRoom, 201);
      }

      if (resourceId && method === "PUT") {
        const body = await parseRequestBody(req);
        const room = store.rooms.find((r) => r.id === resourceId);
        if (!room) return sendError(res, "Room not found", 404);

        if (body.roomNumber && room.roomNumber !== String(body.roomNumber).trim()) {
          const exists = store.rooms.some((r) => r.roomNumber === String(body.roomNumber).trim() && r.id !== resourceId);
          if (exists) return sendError(res, `Room ${body.roomNumber} already exists`, 400);
          room.roomNumber = String(body.roomNumber).trim();
        }
        if (body.type) room.type = body.type;
        if (body.capacity !== undefined) room.capacity = Number(body.capacity);
        if (body.price !== undefined) room.price = Number(body.price);
        if (body.status) room.status = body.status;

        return sendJSON(res, room);
      }

      if (resourceId && method === "DELETE") {
        const roomIndex = store.rooms.findIndex((r) => r.id === resourceId);
        if (roomIndex === -1) return sendError(res, "Room not found", 404);

        const hasActiveBooking = store.bookings.some(
          (b) => b.roomId === resourceId && (b.status === "CheckedIn" || b.status === "Confirmed")
        );
        if (hasActiveBooking) {
          return sendError(res, "Cannot delete room with active or upcoming bookings. Please cancel or checkout first.", 400);
        }

        store.rooms.splice(roomIndex, 1);
        return sendJSON(res, { message: "Room deleted successfully" });
      }
    }

    if (resource === "guests") {
      if (method === "GET" && !resourceId) {
        return sendJSON(res, store.guests);
      }

      if (method === "POST") {
        const body = await parseRequestBody(req);
        const { name, email, phone, idProof } = body;
        if (!name || !email || !phone || !idProof) {
          return sendError(res, "All guest fields (name, email, phone, idProof) are required", 400);
        }

        const newGuest: Guest = {
          id: generateId("gst"),
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          phone: String(phone).trim(),
          idProof: String(idProof).trim(),
          createdAt: new Date().toISOString(),
        };

        store.guests.push(newGuest);
        return sendJSON(res, newGuest, 201);
      }

      if (resourceId && action === "history" && method === "GET") {
        const bookings = store.bookings.filter((b) => b.guestId === resourceId);
        const rooms = store.rooms;
        const invoices = store.invoices;
        const history = bookings.map((b) => {
          const room = rooms.find((r) => r.id === b.roomId);
          const invoice = invoices.find((inv) => inv.bookingId === b.id);
          return {
            ...b,
            roomNumber: room ? room.roomNumber : "Deleted Room",
            roomType: room ? room.type : "N/A",
            invoice,
          };
        });
        return sendJSON(res, history);
      }

      if (resourceId && method === "PUT") {
        const body = await parseRequestBody(req);
        const guest = store.guests.find((g) => g.id === resourceId);
        if (!guest) return sendError(res, "Guest not found", 404);

        if (body.name) guest.name = body.name;
        if (body.email) guest.email = String(body.email).trim().toLowerCase();
        if (body.phone) guest.phone = body.phone;
        if (body.idProof) guest.idProof = body.idProof;
        return sendJSON(res, guest);
      }
    }

    if (resource === "bookings") {
      if (method === "GET" && !resourceId) {
        const expandedBookings = store.bookings.map((b) => {
          const guest = store.guests.find((g) => g.id === b.guestId) || null;
          const room = store.rooms.find((r) => r.id === b.roomId) || null;
          return { ...b, guest, room };
        });
        expandedBookings.sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime());
        return sendJSON(res, expandedBookings);
      }

      if (method === "POST") {
        const body = await parseRequestBody(req);
        const { guestId, roomId, checkInDate, checkOutDate, totalGuests, specialRequests } = body;
        if (!guestId || !roomId || !checkInDate || !checkOutDate || !totalGuests) {
          return sendError(res, "Missing required booking fields", 400);
        }

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        if (checkIn >= checkOut) return sendError(res, "Check-out date must be after check-in date", 400);

        const room = store.rooms.find((r) => r.id === roomId);
        if (!room) return sendError(res, "Selected room not found", 404);
        if (room.status === "Maintenance") return sendError(res, "This room is currently under maintenance", 400);
        if (Number(totalGuests) > room.capacity) {
          return sendError(res, `Room capacity exceeded. Room ${room.roomNumber} allows up to ${room.capacity} guests.`, 400);
        }

        const isOverlapping = store.bookings.some((b) => {
          if (b.roomId !== roomId || b.status === "Cancelled" || b.status === "CheckedOut") return false;
          return checkInDate < b.checkOutDate && checkOutDate > b.checkInDate;
        });
        if (isOverlapping) {
          return sendError(res, `Room ${room.roomNumber} is already booked or occupied during the selected dates.`, 400);
        }

        const booking: Booking = {
          id: generateId("bk"),
          guestId,
          roomId,
          checkInDate,
          checkOutDate,
          status: "Confirmed",
          totalGuests: Number(totalGuests),
          specialRequests: specialRequests || "",
          createdAt: new Date().toISOString(),
        };
        store.bookings.push(booking);
        return sendJSON(res, booking, 201);
      }

      if (resourceId && action === "checkin" && method === "POST") {
        const booking = store.bookings.find((b) => b.id === resourceId);
        if (!booking) return sendError(res, "Booking not found", 404);
        if (booking.status !== "Confirmed") return sendError(res, `Cannot check in. Booking status is ${booking.status}", 400);

        booking.status = "CheckedIn";
        booking.actualCheckIn = new Date().toISOString();
        const room = store.rooms.find((r) => r.id === booking.roomId);
        if (room) room.status = "Occupied";
        return sendJSON(res, booking);
      }

      if (resourceId && action === "checkout" && method === "POST") {
        const body = await parseRequestBody(req);
        const booking = store.bookings.find((b) => b.id === resourceId);
        if (!booking) return sendError(res, "Booking not found", 404);
        if (booking.status !== "CheckedIn") return sendError(res, `Cannot check out. Booking status is ${booking.status}", 400);

        const room = store.rooms.find((r) => r.id === booking.roomId);
        const guest = store.guests.find((g) => g.id === booking.guestId);
        if (!guest || !room) return sendError(res, "Associated guest or room details not found", 400);

        booking.status = "CheckedOut";
        booking.actualCheckOut = new Date().toISOString();
        if (room) room.status = "Available";

        const checkInMills = new Date(booking.checkInDate).getTime();
        const checkOutMills = new Date(booking.checkOutDate).getTime();
        const stayDurationDays = Math.max(1, Math.ceil((checkOutMills - checkInMills) / (1000 * 60 * 60 * 24)));
        const roomCharges = stayDurationDays * room.price;
        const guestOrders = store.orders.filter((o) => o.bookingId === booking.id && o.status === "Served");
        const diningCharges = guestOrders.reduce((sum, ord) => sum + ord.totalAmount, 0);
        const additionalCharges = Number(body.additionalCharges || 0);
        const discountAmount = Number(body.discountAmount || 0);
        const taxableSubtotal = Math.max(0, roomCharges + diningCharges + additionalCharges - discountAmount);
        const taxAmount = Math.round(taxableSubtotal * 0.18 * 100) / 100;
        const totalAmount = taxableSubtotal + taxAmount;

        const invoice: Invoice = {
          id: generateId("inv"),
          bookingId: booking.id,
          guestName: guest.name,
          roomNumber: room.roomNumber,
          roomType: room.type,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          actualCheckInDate: booking.actualCheckIn,
          actualCheckOutDate: booking.actualCheckOut,
          durationOfStay: stayDurationDays,
          roomRate: room.price,
          roomCharges,
          diningCharges,
          additionalCharges,
          taxRate: 0.18,
          taxAmount,
          totalAmount,
          createdAt: new Date().toISOString(),
        };

        store.invoices.push(invoice);
        return sendJSON(res, { booking, invoice });
      }
    }

    if (resource === "invoices" && method === "GET") {
      return sendJSON(res, store.invoices);
    }

    if (resource === "dining") {
      if (resourceId === "menu") {
        if (method === "GET") {
          return sendJSON(res, store.menu);
        }
        if (method === "POST") {
          const body = await parseRequestBody(req);
          const { name, category, price, description, isAvailable } = body;
          if (!name || !category || price === undefined) {
            return sendError(res, "Missing required menu item fields", 400);
          }
          const newItem: MenuItem = {
            id: generateId("mn"),
            name: String(name).trim(),
            category,
            price: Number(price),
            description: description || "",
            isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
          };
          store.menu.push(newItem);
          return sendJSON(res, newItem, 201);
        }
        if (resource[2] && method === "PUT") {
          // unreachable via current parsing logic
        }
      }
      if (resourceId === "menu" && segments[3] && method === "PUT") {
        const itemId = segments[3];
        const body = await parseRequestBody(req);
        const menuItem = store.menu.find((m) => m.id === itemId);
        if (!menuItem) return sendError(res, "Menu item not found", 404);
        if (body.name) menuItem.name = body.name;
        if (body.category) menuItem.category = body.category;
        if (body.price !== undefined) menuItem.price = Number(body.price);
        if (body.description !== undefined) menuItem.description = body.description;
        if (body.isAvailable !== undefined) menuItem.isAvailable = Boolean(body.isAvailable);
        return sendJSON(res, menuItem);
      }
      if (resourceId === "menu" && segments[3] && method === "DELETE") {
        const itemId = segments[3];
        store.menu = store.menu.filter((m) => m.id !== itemId);
        return sendJSON(res, { message: "Menu item deleted successfully" });
      }

      if (resourceId === "orders" && !segments[3] && method === "GET") {
        const expandedOrders = store.orders.map((ord) => {
          const booking = store.bookings.find((b) => b.id === ord.bookingId);
          const guest = booking ? store.guests.find((g) => g.id === booking.guestId) : null;
          const room = booking ? store.rooms.find((r) => r.id === booking.roomId) : null;
          return {
            ...ord,
            guestName: guest ? guest.name : "N/A",
            roomNumber: room ? room.roomNumber : "N/A",
          };
        });
        expandedOrders.sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime());
        return sendJSON(res, expandedOrders);
      }
      if (resourceId === "orders" && !segments[3] && method === "POST") {
        const body = await parseRequestBody(req);
        const { bookingId, items } = body;
        if (!bookingId || !items || !Array.isArray(items) || items.length === 0) {
          return sendError(res, "Invalid order payload. bookingId and items array are required.", 400);
        }
        const booking = store.bookings.find((b) => b.id === bookingId);
        if (!booking) return sendError(res, "Booking not found", 404);
        if (booking.status !== "CheckedIn") return sendError(res, "Orders can only be placed for guests currently Checked-In.", 400);
        const resolvedItems = [] as DiningOrder["items"];
        let totalAmount = 0;
        for (const item of items) {
          const menuItem = store.menu.find((m) => m.id === item.menuItemId);
          if (!menuItem) return sendError(res, `Menu item with ID ${item.menuItemId} not found`, 404);
          if (!menuItem.isAvailable) return sendError(res, `Menu item '${menuItem.name}' is currently unavailable`, 400);
          const qty = Number(item.quantity) || 1;
          const lineTotal = menuItem.price * qty;
          totalAmount += lineTotal;
          resolvedItems.push({ menuItemId: menuItem.id, name: menuItem.name, quantity: qty, price: menuItem.price });
        }
        const newOrder: DiningOrder = {
          id: generateId("ord"),
          bookingId,
          items: resolvedItems,
          status: "Pending",
          orderTime: new Date().toISOString(),
          totalAmount,
        };
        store.orders.push(newOrder);
        return sendJSON(res, newOrder, 201);
      }
      if (resourceId === "orders" && segments[3] === "status" && method === "PUT") {
        const orderId = segments[2];
        const body = await parseRequestBody(req);
        const statusValue = body.status;
        if (!statusValue || !["Pending", "Served", "Cancelled"].includes(statusValue)) {
          return sendError(res, "Invalid status value", 400);
        }
        const order = store.orders.find((o) => o.id === orderId);
        if (!order) return sendError(res, "Order not found", 404);
        order.status = statusValue;
        return sendJSON(res, order);
      }
    }

    if (resource === "dashboard" && method === "GET") {
      const totalRooms = store.rooms.length;
      const availableRooms = store.rooms.filter((r) => r.status === "Available").length;
      const occupiedRooms = store.rooms.filter((r) => r.status === "Occupied").length;
      const maintenanceRooms = store.rooms.filter((r) => r.status === "Maintenance").length;
      const totalGuests = store.guests.length;
      const activeBookings = store.bookings.filter((b) => b.status === "CheckedIn" || b.status === "Confirmed").length;
      const totalRevenue = store.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      return sendJSON(res, {
        totalRooms,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        totalGuests,
        activeBookings,
        totalRevenue,
      });
    }

    return sendError(res, "Not found", 404);
  } catch (err) {
    console.error(err);
    return sendError(res, "Internal server error", 500);
  }
}
