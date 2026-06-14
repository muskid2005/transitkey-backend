import { supabase } from "../lib/supabase.js";


export const createBooking = async (req, res) => {
  try {
    const { user_id, user_role } = req.user; 
    const { route_id, seat_quantity, scheduled_date, scheduled_time } = req.body; 

    if (user_role !== "user") {
      return res.status(403).json({ message: "Only regular users can book passenger seats." });
    }

    if (!route_id || !seat_quantity || seat_quantity < 1) {
      return res.status(400).json({ message: "Invalid route_id or seat quantity requested." });
    }

    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("park_id, standard_fare, capacity")
      .eq("id", route_id)
      .single();

    if (routeError || !route) {
      return res.status(404).json({ message: "Requested route does not exist in database." });
    }

    const routeCapacity = route.capacity || 14;
    const totalCost = route.standard_fare * seat_quantity;

    if (seat_quantity > routeCapacity) {
      return res.status(400).json({ 
        message: `Your booking request of ${seat_quantity} seats exceeds the maximum bus capacity of ${routeCapacity}.` 
      });
    }

    if (scheduled_date || scheduled_time) {
      const { data: futureBooking, error: futureBookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user_id,
          trip_id: null, 
          route_id: route_id,
          seat_number: seat_quantity,
          passenger_status: "booked",
          scheduled_date: scheduled_date || new Date().toISOString().split('T')[0], 
          scheduled_time: scheduled_time 
        })
        .select()
        .single();

      if (futureBookingError) return res.status(500).json({ error: futureBookingError.message });

      return res.status(201).json({
        message: `Future ride reserved for ${scheduled_date || 'today'} at ${scheduled_time}. Bus assignment activates 5 minutes before departure.`,
        booking_details: futureBooking,
        total_fare: totalCost
      });
    }


    const { data: park, error: parkError } = await supabase
      .from("parks")
      .select("park_operator_id")
      .eq("id", route.park_id)
      .single();

    if (parkError) return res.status(500).json({ error: parkError.message });
    const assignedOperatorId = park?.park_operator_id;

    let { data: activeTrips, error: tripFindError } = await supabase
      .from("trips")
      .select("id, available_seats")
      .eq("route_id", route_id)
      .eq("status", "at park")
      .order("created_at", { ascending: true }); 
    if (tripFindError) return res.status(500).json({ error: tripFindError.message });

    let matchingTrip = activeTrips?.find(trip => trip.available_seats >= seat_quantity);

    let targetTripId;
    let isNewTripSpun = false;

    if (matchingTrip) {

      targetTripId = matchingTrip.id;

      const { error: deductError } = await supabase
        .from("trips")
        .update({ 
          available_seats: matchingTrip.available_seats - seat_quantity, 
          updated_at: new Date() 
        })
        .eq("id", targetTripId);

      if (deductError) return res.status(500).json({ error: deductError.message });
    } else {
      isNewTripSpun = true;
      
      const { data: newTrip, error: tripCreateError } = await supabase
        .from("trips")
        .insert({
          park_id: route.park_id,
          route_id: route_id,
          fare: route.standard_fare,
          available_seats: routeCapacity - seat_quantity,
          status: "at park",
          park_operator_id: assignedOperatorId 
        })
        .select()
        .single();

      if (tripCreateError) return res.status(500).json({ error: tripCreateError.message });
      targetTripId = newTrip.id;
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        trip_id: targetTripId,
        user_id: user_id,
        route_id: route_id,
        seat_number: seat_quantity, 
        passenger_status: "booked"
      })
      .select()
      .single();

    if (bookingError) return res.status(500).json({ error: bookingError.message });

    return res.status(201).json({
      message: isNewTripSpun 
        ? "Initialized a fresh on-demand trip to keep your party together!" 
        : "Joined the current loading trip successfully!",
      booking_details: booking,
      total_fare: totalCost
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


export const getMyBooking = async (req, res) => {
  try {
    const { user_id, user_role } = req.user;

    if (user_role !== "user") {
      return res.status(403).json({ message: "Access restricted to user accounts." });
    }

    const { data: booking, error: error } = await supabase
      .from("bookings")
      .select(`
        id,
        seat_number,
        passenger_status,
        created_at,
        trips (
          id,
          fare,
          status,
          routes (
            id,
            destination,
            parks (
              park_location
            )
          )
        )
      `)
      .eq("user_id", user_id)
      .not("passenger_status", "eq", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!booking) {
      return res.status(404).json({ message: "You have no active itinerary bookings right now." });
    }

    const routeData = booking.trips?.routes;
    const parkOrigin = routeData?.parks;
    
    const formattedBooking = {
      booking_id: booking.id,
      seats_booked: booking.seat_number,
      status: booking.passenger_status,
      trip_status: booking.trips?.status,
      fare_paid: booking.trips?.fare,
      origin: parkOrigin?.park_location || "Unknown Park",
      destination: routeData?.destination || "Unknown Destination",
      booked_at: booking.created_at
    };

    return res.status(200).json({ booking: formattedBooking });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


export const cancelBooking = async (req, res) => {
  try {
    const { user_id, user_role } = req.user;

    if (user_role !== "user") {
      return res.status(403).json({ message: "Only users can cancel their bookings." });
    }

    const { data: booking, error: findError } = await supabase
      .from("bookings")
      .select("id, trip_id, seat_number, passenger_status")
      .eq("user_id", user_id)
      .eq("passenger_status", "booked")
      .maybeSingle();

    if (findError) return res.status(500).json({ error: findError.message });
    if (!booking) return res.status(404).json({ message: "No modifiable active booking found." });

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("available_seats, status")
      .eq("id", booking.trip_id)
      .single();

    if (trip && trip.status === "at park") {
      await supabase
        .from("trips")
        .update({ available_seats: trip.available_seats + booking.seat_number, updated_at: new Date() })
        .eq("id", booking.trip_id);
    }

    const { data: cancelledData, error: cancelError } = await supabase
      .from("bookings")
      .update({ passenger_status: "stopped midway", updated_at: new Date() })
      .eq("id", booking.id)
      .select()
      .single();

    if (cancelError) return res.status(500).json({ error: cancelError.message });

    return res.status(200).json({
      message: "Booking cancelled successfully. Seats refunded to loading bay.",
      cancelledData
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
