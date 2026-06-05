import { supabase } from "../lib/supabase.js";

const DEFAULT_BUS_CAPACITY = 14;

export const bookSeat = async (req, res) => {
  try {
    const { route_id, seat_number } = req.body;
    const passengerId = req.user.user_id;

    const seatsRequested = parseInt(seat_number, 10);

    if (!route_id || !seatsRequested || seatsRequested < 1) {
      return res
        .status(400)
        .json({
          message: "Route ID and a valid number of seats are required.",
        });
    }

    let tripId;
    let targetTrip;

    const { data: existingTrip, error: tripFindError } = await supabase
      .from("trips")
      .select("*")
      .eq("route_id", route_id)
      .eq("status", "available")
      .gt("available_seats", 0)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (tripFindError)
      return res.status(500).json({ error: tripFindError.message });

    if (existingTrip) {
      tripId = existingTrip.id;
      targetTrip = existingTrip;
    } else {
      const { data: routeData, error: routeError } = await supabase
        .from("routes")
        .select("park_id, standard_fare")
        .eq("id", route_id)
        .maybeSingle();

      if (routeError)
        return res.status(500).json({ error: routeError.message });
      if (!routeData)
        return res
          .status(404)
          .json({ message: "Selected travel route does not exist." });

      const { data: parkData } = await supabase
        .from("parks")
        .select("park_operator_id")
        .eq("id", routeData.park_id)
        .maybeSingle();

      const { data: newTrip, error: createTripError } = await supabase
        .from("trips")
        .insert([
          {
            park_operator_id: parkData?.park_operator_id,
            park_id: routeData.park_id,
            route_id: route_id,
            vehicle_id: null,
            driver_id: null,
            fare: routeData.standard_fare,
            departure_time: new Date(
              Date.now() + 2 * 60 * 60 * 1000,
            ).toISOString(),
            available_seats: DEFAULT_BUS_CAPACITY,
            status: "at park",
          },
        ])
        .select()
        .single();

      if (createTripError)
        return res.status(500).json({ error: createTripError.message });

      tripId = newTrip.id;
      targetTrip = newTrip;
    }

    if (targetTrip.available_seats < seatsRequested) {
      return res.status(400).json({
        message: `Inadequate seats available. Only ${targetTrip.available_seats} seats are left on this trip.`,
      });
    }

    const { data: bookingData, error: insertBookingError } = await supabase
      .from("bookings")
      .insert([
        {
          trip_id: tripId,
          user_id: passengerId,
          seat_number: seatsRequested,
          passenger_status: "booked",
        },
      ])
      .select()
      .single();

    if (insertBookingError)
      return res.status(500).json({ error: insertBookingError.message });

    const updatedSeats = targetTrip.available_seats - seatsRequested;
    const finalStatus = updatedSeats === 0 ? "in transit" : targetTrip.status;

    await supabase
      .from("trips")
      .update({ available_seats: updatedSeats, status: finalStatus })
      .eq("id", tripId);

    return res.status(201).json({
      message: `${seatsRequested} seat(s) booked successfully!`,
      booking: bookingData,
      trip_id: tripId,
      seats_left: updatedSeats,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { booking_id } = req.body;
    const passengerId = req.user.user_id;

    if (!booking_id) {
      return res.status(400).json({ message: "Booking ID is required." });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .eq("user_id", passengerId)
      .maybeSingle();

    if (bookingError)
      return res.status(500).json({ error: bookingError.message });
    if (!booking)
      return res
        .status(404)
        .json({ message: "Booking record not found or unauthorized." });

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("status, available_seats")
      .eq("id", booking.trip_id)
      .maybeSingle();

    if (tripError) return res.status(500).json({ error: tripError.message });
    if (!trip)
      return res
        .status(404)
        .json({ message: "Associated trip no longer exists." });

    if (trip.status === "in transit" || trip.status === "completed") {
      return res
        .status(400)
        .json({
          message: "Cannot cancel ticket. The vehicle is already en route.",
        });
    }

    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .eq("id", booking_id);

    if (deleteError)
      return res.status(500).json({ error: deleteError.message });

    const restoredSeats = trip.available_seats + booking.seat_number;

    await supabase
      .from("trips")
      .update({ available_seats: restoredSeats })
      .eq("id", booking.trip_id);

    return res.status(200).json({
      message: "Booking canceled successfully. Your seats have been restored.",
      trip_id: booking.trip_id,
      seats_now_available: restoredSeats,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
