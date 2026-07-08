import React, { useEffect, useState } from "react";
import { Room, RoomType, RoomStatus } from "../types";
import { Plus, Edit2, Trash2, ShieldAlert, KeyRound, DollarSign, Users, Eye } from "lucide-react";
import { z } from "zod";

const roomSchema = z.object({
  roomNumber: z.string().trim().min(1, "Room number is required").max(10, "Room number must be 10 characters or less"),
  type: z.enum(["Single", "Double", "Deluxe", "Suite"]),
  capacity: z.number().min(1, "Capacity must be at least 1").max(10, "Capacity cannot exceed 10"),
  price: z.number().min(1, "Price must be greater than 0"),
  status: z.enum(["Available", "Occupied", "Maintenance"]),
});

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [roomNumber, setRoomNumber] = useState("");
  const [type, setType] = useState<RoomType>("Single");
  const [capacity, setCapacity] = useState<number>(1);
  const [price, setPrice] = useState<number>(1200);
  const [status, setStatus] = useState<RoomStatus>("Available");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      } else {
        // Fallback to static data when the backend API is not deployed or unavailable.
        const fallbackRes = await fetch("/data/rooms.json");
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setRooms(fallbackData);
          setError("Unable to reach API backend; loaded offline room data.");
        } else {
          setError("Failed to fetch rooms list");
        }
      }
    } catch (err) {
      try {
        const fallbackRes = await fetch("/data/rooms.json");
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setRooms(fallbackData);
          setError("Unable to reach API backend; loaded offline room data.");
        } else {
          setError("Network error fetching rooms");
        }
      } catch (fallbackErr) {
        setError("Network error fetching rooms");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setRoomNumber("");
    setType("Single");
    setCapacity(1);
    setPrice(1200);
    setStatus("Available");
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (room: Room) => {
    setIsEditing(true);
    setCurrentId(room.id);
    setRoomNumber(room.roomNumber);
    setType(room.type);
    setCapacity(room.capacity);
    setPrice(room.price);
    setStatus(room.status);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleTypeChange = (selectedType: RoomType) => {
    setType(selectedType);
    // Auto-update sensible defaults for capacity and pricing based on room type
    if (selectedType === "Single") {
      setCapacity(1);
      setPrice(1200);
    } else if (selectedType === "Double") {
      setCapacity(2);
      setPrice(2000);
    } else if (selectedType === "Deluxe") {
      setCapacity(2);
      setPrice(3500);
    } else if (selectedType === "Suite") {
      setCapacity(4);
      setPrice(6000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = roomSchema.safeParse({
      roomNumber: roomNumber.trim(),
      type,
      capacity: Number(capacity),
      price: Number(price),
      status,
    });

    if (!validation.success) {
       const errorMsg = validation.error.issues.map(err => err.message).join(", ");
       setError(errorMsg);
       return;
     }

    const payload = validation.data;

    try {
      let res;
      if (isEditing && currentId) {
        res = await fetch(`/api/rooms/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setSuccess(isEditing ? "Room updated successfully!" : "Room added successfully!");
        fetchRooms();
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1000);
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      setError("Connection failure to server");
    }
  };

  const handleDelete = async (id: string, rNum: string) => {
    if (!window.confirm(`Are you sure you want to delete Room ${rNum}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Room ${rNum} deleted successfully`);
        fetchRooms();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || `Failed to delete Room ${rNum}`);
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      setError("Network error deleting room");
    }
  };

  // Filter logic
  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const matchesType = typeFilter === "All" || r.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="rooms-view">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Room Directory</h2>
          <p className="text-slate-500 text-sm">Add configurations, adjust rates, and track live occupancy</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="add-room-btn"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New Room
        </button>
      </div>

      {/* Global Alerts */}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}
      {error && !isModalOpen && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Filters and Search toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Search Rooms</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Room Number or Type..."
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
          />
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 bg-white font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Type Filter</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 bg-white font-medium"
          >
            <option value="All">All Types</option>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <KeyRound className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No rooms found</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting the filters or add a new room configuration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              {/* Top Banner indicating Status */}
              <div
                className={`h-2 ${
                  room.status === "Available"
                    ? "bg-emerald-500"
                    : room.status === "Occupied"
                    ? "bg-teal-600"
                    : "bg-amber-500"
                }`}
              ></div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                      Room {room.roomNumber}
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 mt-0.5">{room.type}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      room.status === "Available"
                        ? "bg-emerald-50 text-emerald-700"
                        : room.status === "Occupied"
                        ? "bg-teal-50 text-teal-800"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-slate-50 my-4 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">Capacity</span>
                      <span className="text-sm font-bold text-slate-700">{room.capacity} Guest{room.capacity > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">Price/Night</span>
                      <span className="text-sm font-bold text-slate-700">₹{room.price}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleOpenEditModal(room)}
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-xl transition-colors"
                    title="Edit Room"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(room.id, room.roomNumber)}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-colors"
                    title="Delete Room"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{isEditing ? "Modify Room Configuration" : "Add Room Configuration"}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-teal-200 hover:text-white transition-colors text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Room Number *
                </label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 101, 203"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Room Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as RoomType)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 bg-white font-medium"
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Max Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Price/Night (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Availability Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RoomStatus)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 bg-white font-medium"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {isEditing ? "Save Changes" : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
