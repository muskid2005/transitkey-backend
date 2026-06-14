import cron from "node-cron";
import { supabase } from "../lib/supabase.js";

export const initBackgroundTasks = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const currentTime = new Date();
      const fiveMinutesFromNow = new Date(currentTime.getTime() + 5 * 60000);
      
      const targetDateStr = fiveMinutesFromNow.toISOString().split('T')[0];
      const targetTimeStr = fiveMinutesFromNow.toTimeString().split(' ')[0].substring(0, 5);

      console.log(`[CRON] Checking for scheduled bookings departing at: ${targetDateStr} ${targetTimeStr}`);

      const { data: bookings, error: fetchError } = await supabase
        .from("bookings")
        .select("id, seat_number, user_id, route_id")
        .eq("scheduled_date", targetDateStr)
        .eq("scheduled_time", `${targetTimeStr}:00`) 
        .is("trip_id", null);

      if (fetchError) throw fetchError;
      if (!bookings || bookings.length === 0) return;

      console.log(`[CRON] Found ${bookings.length} upcoming reservations to process.`);

      for (const booking of bookings) {
        const { data: route } = await supabase
          .from("routes")
          .select("park_id, standard_fare, capacity, parks(park_operator_id)")
          .eq("id", booking.route_id)
          .single();

        if (!route) continue;

        const routeCapacity = route.capacity || 14;
        const assignedOperatorId = route.parks?.park_operator_id;

        let { data: activeTrips } = await supabase
          .from("trips")
          .select("id, available_seats")
          .eq("route_id", booking.route_id)
          .eq("status", "at park")
          .order("created_at", { ascending: true });

        let matchingTrip = activeTrips?.find(trip => trip.available_seats >= booking.seat_number);

        let targetTripId;

        if (matchingTrip) {
          targetTripId = matchingTrip.id;
          await supabase
            .from("trips")
            .update({ available_seats: matchingTrip.available_seats - booking.seat_number })
            .eq("id", targetTripId);
        } else {
          const { data: newTrip } = await supabase
            .from("trips")
            .insert({
              park_id: route.park_id,
              route_id: booking.route_id,
              fare: route.standard_fare,
              available_seats: routeCapacity - booking.seat_number,
              status: "at park",
              park_operator_id: assignedOperatorId
            })
            .select().single();

          if (newTrip) targetTripId = newTrip.id;
        }

        if (targetTripId) {
          await supabase
            .from("bookings")
            .update({ trip_id: targetTripId, updated_at: new Date() })
            .eq("id", booking.id);
            
          console.log(`[CRON] Successfully assigned Booking ${booking.id} to Trip ${targetTripId}`);
        }
      }
    } catch (err) {
      console.error("[CRON ERROR]:", err.message);
    }
  });

  console.log("Background Cron Engine fully initialized and monitoring bookings.");
};