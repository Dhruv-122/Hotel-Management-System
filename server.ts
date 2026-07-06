import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { store } from "./server/db";
import { Room, Guest, Booking, MenuItem, DiningOrder, Invoice, RoomStatus, BookingStatus, MenuCategory } from "./src/types";

// Generate clean unique IDs
function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON and urlencoded request bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ==========================================
  // ROOM MANAGEMENT APIS
  // ==========================================

  // Get all rooms
  app.get("/api/rooms", (req, res) => {
    try {
      const rooms = store.getRooms();
      res.json(rooms);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  // Add a new room
  app.post("/api/rooms", (req, res) => {
    try {
      const { roomNumber, type, capacity, price, status } = req.body;

      if (!roomNumber || !type || !capacity || !price) {
        return res.status(400).json({ error: "Missing required room fields" });
      }

      const rooms = store.getRooms();
      const exists = rooms.some(r => r.roomNumber === String(roomNumber).trim());
      if (exists) {
        return res.status(400).json({ error: `Room ${roomNumber} already exists` });
      }

      const newRoom: Room = {
        id: generateId("rm"),
        roomNumber: String(roomNumber).trim(),
        type,
        capacity: Number(capacity),
        price: Number(price),
        status: status || "Available"
      };

      rooms.push(newRoom);
      store.saveRooms(rooms);
      res.status(201).json(newRoom);
    } catch (err) {
      res.status(500).json({ error: "Failed to add room" });
    }
  });

  // Edit an existing room
  app.put("/api/rooms/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { roomNumber, type, capacity, price, status } = req.body;

      const rooms = store.getRooms();
      const index = rooms.findIndex(r => r.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Check unique room number if changed
      if (roomNumber && rooms[index].roomNumber !== String(roomNumber).trim()) {
        const exists = rooms.some(r => r.roomNumber === String(roomNumber).trim() && r.id !== id);
        if (exists) {
          return res.status(400).json({ error: `Room ${roomNumber} already exists` });
        }
        rooms[index].roomNumber = String(roomNumber).trim();
      }

      if (type) rooms[index].type = type;
      if (capacity !== undefined) rooms[index].capacity = Number(capacity);
      if (price !== undefined) rooms[index].price = Number(price);
      if (status) rooms[index].status = status;

      store.saveRooms(rooms);
      res.json(rooms[index]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update room" });
    }
  });

  // Delete a room
  app.delete("/api/rooms/:id", (req, res) => {
    try {
      const { id } = req.params;
      const rooms = store.getRooms();
      const room = rooms.find(r => r.id === id);

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Prevent deletion if room is currently Occupied or has active bookings
      const bookings = store.getBookings();
      const hasActiveBooking = bookings.some(
        b => b.roomId === id && (b.status === "CheckedIn" || b.status === "Confirmed")
      );

      if (hasActiveBooking) {
        return res.status(400).json({
          error: "Cannot delete room with active or upcoming bookings. Please cancel or checkout first."
        });
      }

      const updatedRooms = rooms.filter(r => r.id !== id);
      store.saveRooms(updatedRooms);
      res.json({ message: "Room deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete room" });
    }
  });

  // ==========================================
  // GUEST MANAGEMENT APIS
  // ==========================================

  // Get all guests
  app.get("/api/guests", (req, res) => {
    try {
      const guests = store.getGuests();
      res.json(guests);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch guests" });
    }
  });

  // Add guest
  app.post("/api/guests", (req, res) => {
    try {
      const { name, email, phone, idProof } = req.body;

      if (!name || !email || !phone || !idProof) {
        return res.status(400).json({ error: "All guest fields (name, email, phone, idProof) are required" });
      }

      const guests = store.getGuests();
      const newGuest: Guest = {
        id: generateId("gst"),
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone).trim(),
        idProof: String(idProof).trim(),
        createdAt: new Date().toISOString()
      };

      guests.push(newGuest);
      store.saveGuests(guests);
      res.status(201).json(newGuest);
    } catch (err) {
      res.status(500).json({ error: "Failed to create guest" });
    }
  });

  // Edit guest
  app.put("/api/guests/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, idProof } = req.body;

      const guests = store.getGuests();
      const idx = guests.findIndex(g => g.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Guest not found" });
      }

      if (name) guests[idx].name = name;
      if (email) guests[idx].email = email.trim().toLowerCase();
      if (phone) guests[idx].phone = phone;
      if (idProof) guests[idx].idProof = idProof;

      store.saveGuests(guests);
      res.json(guests[idx]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update guest" });
    }
  });

  // Get guest history (bookings and dining orders)
  app.get("/api/guests/:id/history", (req, res) => {
    try {
      const { id } = req.params;
      const bookings = store.getBookings();
      const rooms = store.getRooms();
      const invoices = store.getInvoices();

      const guestBookings = bookings.filter(b => b.guestId === id);
      
      const history = guestBookings.map(b => {
        const room = rooms.find(r => r.id === b.roomId);
        const invoice = invoices.find(inv => inv.bookingId === b.id);
        return {
          ...b,
          roomNumber: room ? room.roomNumber : "Deleted Room",
          roomType: room ? room.type : "N/A",
          invoice
        };
      });

      res.json(history);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch guest history" });
    }
  });

  // ==========================================
  // BOOKING MANAGEMENT APIS
  // ==========================================

  // Get bookings (expanded with guest & room metadata)
  app.get("/api/bookings", (req, res) => {
    try {
      const bookings = store.getBookings();
      const guests = store.getGuests();
      const rooms = store.getRooms();

      const expandedBookings = bookings.map(b => {
        const guest = guests.find(g => g.id === b.guestId);
        const room = rooms.find(r => r.id === b.roomId);
        return {
          ...b,
          guest,
          room
        };
      });

      // Sort by checkInDate descending
      expandedBookings.sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime());

      res.json(expandedBookings);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Place a booking
  app.post("/api/bookings", (req, res) => {
    try {
      const { guestId, roomId, checkInDate, checkOutDate, totalGuests, specialRequests } = req.body;

      if (!guestId || !roomId || !checkInDate || !checkOutDate || !totalGuests) {
        return res.status(400).json({ error: "Missing required booking fields" });
      }

      // Date validation
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      if (checkIn >= checkOut) {
        return res.status(400).json({ error: "Check-out date must be after check-in date" });
      }

      // Validate room existence and capacity
      const rooms = store.getRooms();
      const room = rooms.find(r => r.id === roomId);
      if (!room) {
        return res.status(404).json({ error: "Selected room not found" });
      }

      if (room.status === "Maintenance") {
        return res.status(400).json({ error: "This room is currently under maintenance" });
      }

      if (Number(totalGuests) > room.capacity) {
        return res.status(400).json({
          error: `Room capacity exceeded. Room ${room.roomNumber} allows up to ${room.capacity} guests.`
        });
      }

      // Overlapping Bookings Check
      const bookings = store.getBookings();
      const isOverlapping = bookings.some(b => {
        // Only active/upcoming reservations block a room
        if (b.roomId !== roomId || b.status === "Cancelled" || b.status === "CheckedOut") {
          return false;
        }
        
        // Check overlap logic
        // (StartA < EndB) && (EndA > StartB)
        return checkInDate < b.checkOutDate && checkOutDate > b.checkInDate;
      });

      if (isOverlapping) {
        return res.status(400).json({
          error: `Room ${room.roomNumber} is already booked or occupied during the selected dates.`
        });
      }

      const newBooking: Booking = {
        id: generateId("bk"),
        guestId,
        roomId,
        checkInDate,
        checkOutDate,
        status: "Confirmed",
        totalGuests: Number(totalGuests),
        specialRequests: specialRequests || "",
        createdAt: new Date().toISOString()
      };

      bookings.push(newBooking);
      store.saveBookings(bookings);

      res.status(201).json(newBooking);
    } catch (err) {
      res.status(500).json({ error: "Failed to place booking" });
    }
  });

  // Check-In Booking
  app.post("/api/bookings/:id/checkin", (req, res) => {
    try {
      const { id } = req.params;
      const bookings = store.getBookings();
      const bookingIdx = bookings.findIndex(b => b.id === id);

      if (bookingIdx === -1) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const booking = bookings[bookingIdx];
      if (booking.status !== "Confirmed") {
        return res.status(400).json({ error: `Cannot check in. Booking status is ${booking.status}` });
      }

      // Set booking status and actual check-in time
      booking.status = "CheckedIn";
      booking.actualCheckIn = new Date().toISOString();

      // Update Room status to Occupied
      const rooms = store.getRooms();
      const roomIdx = rooms.findIndex(r => r.id === booking.roomId);
      if (roomIdx !== -1) {
        rooms[roomIdx].status = "Occupied";
        store.saveRooms(rooms);
      }

      store.saveBookings(bookings);
      res.json(booking);
    } catch (err) {
      res.status(500).json({ error: "Failed to check in guest" });
    }
  });

  // Check-Out and invoice generation
  app.post("/api/bookings/:id/checkout", (req, res) => {
    try {
      const { id } = req.params;
      const { additionalCharges = 0, discountAmount = 0 } = req.body;

      const bookings = store.getBookings();
      const bookingIdx = bookings.findIndex(b => b.id === id);
      if (bookingIdx === -1) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const booking = bookings[bookingIdx];
      if (booking.status !== "CheckedIn") {
        return res.status(400).json({ error: `Cannot check out. Booking status is ${booking.status}` });
      }

      const guests = store.getGuests();
      const guest = guests.find(g => g.id === booking.guestId);
      const rooms = store.getRooms();
      const room = rooms.find(r => r.id === booking.roomId);

      if (!guest || !room) {
        return res.status(400).json({ error: "Associated guest or room details not found" });
      }

      const checkoutTime = new Date().toISOString();
      
      // Update Booking status
      booking.status = "CheckedOut";
      booking.actualCheckOut = checkoutTime;

      // Reset Room status to Available
      room.status = "Available";
      store.saveRooms(rooms);
      store.saveBookings(bookings);

      // Calculations for Invoice
      // 1. Stay duration in days (minimum 1 day)
      const checkInMills = new Date(booking.checkInDate).getTime();
      const checkOutMills = new Date(booking.checkOutDate).getTime();
      const stayDurationDays = Math.max(
        1,
        Math.ceil((checkOutMills - checkInMills) / (1000 * 60 * 60 * 24))
      );

      // 2. Room charges
      const roomCharges = stayDurationDays * room.price;

      // 3. Dining charges (Sum of served orders)
      const orders = store.getOrders();
      const guestOrders = orders.filter(o => o.bookingId === booking.id && o.status === "Served");
      const diningCharges = guestOrders.reduce((sum, ord) => sum + ord.totalAmount, 0);

      // 4. Taxes (GST - 18% in India)
      const taxRate = 0.18;
      const taxableSubtotal = Math.max(0, roomCharges + diningCharges + Number(additionalCharges) - Number(discountAmount));
      const taxAmount = Math.round(taxableSubtotal * taxRate * 100) / 100;

      // 5. Final total
      const totalAmount = taxableSubtotal + taxAmount;

      // Create Invoice
      const invoice: Invoice = {
        id: generateId("inv"),
        bookingId: booking.id,
        guestName: guest.name,
        roomNumber: room.roomNumber,
        roomType: room.type,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        actualCheckInDate: booking.actualCheckIn,
        actualCheckOutDate: checkoutTime,
        durationOfStay: stayDurationDays,
        roomRate: room.price,
        roomCharges,
        diningCharges,
        additionalCharges: Number(additionalCharges),
        taxRate,
        taxAmount,
        totalAmount,
        createdAt: new Date().toISOString()
      };

      const invoices = store.getInvoices();
      invoices.push(invoice);
      store.saveInvoices(invoices);

      res.json({
        booking,
        invoice
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to process check-out" });
    }
  });

  // Get invoices
  app.get("/api/invoices", (req, res) => {
    try {
      const invoices = store.getInvoices();
      res.json(invoices);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // ==========================================
  // DINING SERVICES APIS
  // ==========================================

  // Get food menu items
  app.get("/api/dining/menu", (req, res) => {
    try {
      const menu = store.getMenu();
      res.json(menu);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch dining menu" });
    }
  });

  // Add menu item
  app.post("/api/dining/menu", (req, res) => {
    try {
      const { name, category, price, description, isAvailable } = req.body;

      if (!name || !category || price === undefined) {
        return res.status(400).json({ error: "Missing required menu item fields" });
      }

      const menu = store.getMenu();
      const newItem: MenuItem = {
        id: generateId("mn"),
        name: String(name).trim(),
        category,
        price: Number(price),
        description: description || "",
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
      };

      menu.push(newItem);
      store.saveMenu(menu);
      res.status(201).json(newItem);
    } catch (err) {
      res.status(500).json({ error: "Failed to add menu item" });
    }
  });

  // Update menu item
  app.put("/api/dining/menu/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, category, price, description, isAvailable } = req.body;

      const menu = store.getMenu();
      const index = menu.findIndex(m => m.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Menu item not found" });
      }

      if (name) menu[index].name = name;
      if (category) menu[index].category = category;
      if (price !== undefined) menu[index].price = Number(price);
      if (description !== undefined) menu[index].description = description;
      if (isAvailable !== undefined) menu[index].isAvailable = Boolean(isAvailable);

      store.saveMenu(menu);
      res.json(menu[index]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  // Delete menu item
  app.delete("/api/dining/menu/:id", (req, res) => {
    try {
      const { id } = req.params;
      const menu = store.getMenu();
      const updatedMenu = menu.filter(m => m.id !== id);
      store.saveMenu(updatedMenu);
      res.json({ message: "Menu item deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // Place a dining order
  app.post("/api/dining/orders", (req, res) => {
    try {
      const { bookingId, items } = req.body; // items: Array of { menuItemId, quantity }

      if (!bookingId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Invalid order payload. bookingId and items array are required." });
      }

      // Check if booking is CheckedIn (active)
      const bookings = store.getBookings();
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.status !== "CheckedIn") {
        return res.status(400).json({ error: "Orders can only be placed for guests currently Checked-In." });
      }

      const menu = store.getMenu();
      const resolvedItems = [];
      let totalAmount = 0;

      for (const item of items) {
        const menuItem = menu.find(m => m.id === item.menuItemId);
        if (!menuItem) {
          return res.status(404).json({ error: `Menu item with ID ${item.menuItemId} not found` });
        }
        if (!menuItem.isAvailable) {
          return res.status(400).json({ error: `Menu item '${menuItem.name}' is currently unavailable` });
        }

        const qty = Number(item.quantity) || 1;
        const lineTotal = menuItem.price * qty;
        totalAmount += lineTotal;

        resolvedItems.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: qty,
          price: menuItem.price
        });
      }

      const newOrder: DiningOrder = {
        id: generateId("ord"),
        bookingId,
        items: resolvedItems,
        status: "Pending",
        orderTime: new Date().toISOString(),
        totalAmount
      };

      const orders = store.getOrders();
      orders.push(newOrder);
      store.saveOrders(orders);

      res.status(201).json(newOrder);
    } catch (err) {
      res.status(500).json({ error: "Failed to place dining order" });
    }
  });

  // Get all dining orders (expanded with guest / room info)
  app.get("/api/dining/orders", (req, res) => {
    try {
      const orders = store.getOrders();
      const bookings = store.getBookings();
      const guests = store.getGuests();
      const rooms = store.getRooms();

      const expandedOrders = orders.map(ord => {
        const booking = bookings.find(b => b.id === ord.bookingId);
        const guest = booking ? guests.find(g => g.id === booking.guestId) : null;
        const room = booking ? rooms.find(r => r.id === booking.roomId) : null;

        return {
          ...ord,
          guestName: guest ? guest.name : "N/A",
          roomNumber: room ? room.roomNumber : "N/A"
        };
      });

      // Sort by orderTime descending
      expandedOrders.sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime());

      res.json(expandedOrders);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch dining orders" });
    }
  });

  // Update dining order status (e.g., Served, Cancelled)
  app.put("/api/dining/orders/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // Pending | Served | Cancelled

      if (!status || !["Pending", "Served", "Cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const orders = store.getOrders();
      const index = orders.findIndex(o => o.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Order not found" });
      }

      orders[index].status = status;
      store.saveOrders(orders);
      res.json(orders[index]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // ==========================================
  // DASHBOARD APIS
  // ==========================================

  // Get dashboard counts
  app.get("/api/dashboard", (req, res) => {
    try {
      const rooms = store.getRooms();
      const guests = store.getGuests();
      const bookings = store.getBookings();
      const invoices = store.getInvoices();

      const totalRooms = rooms.length;
      const availableRooms = rooms.filter(r => r.status === "Available").length;
      const occupiedRooms = rooms.filter(r => r.status === "Occupied").length;
      const maintenanceRooms = rooms.filter(r => r.status === "Maintenance").length;

      const totalGuests = guests.length;

      // Active bookings are bookings with status CheckedIn or Confirmed
      const activeBookings = bookings.filter(b => b.status === "CheckedIn" || b.status === "Confirmed").length;

      // Total revenue is the sum of total amount of all invoices
      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

      res.json({
        totalRooms,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        totalGuests,
        activeBookings,
        totalRevenue
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // ==========================================
  // VITE DEVELOPMENT MIDDLEWARE OR PROD ROUTING
  // ==========================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
