"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import DesktopLayout from "@/components/DesktopLayout";
import ConfirmModal from "@/components/ConfirmModal";
import RatingModal from "@/components/RatingModal";
import PassengerSelectionModal, { Passenger } from "@/components/PassengerSelectionModal";
import ActivityMapPreview from "@/components/ActivityMapPreview";
import TripGroupChat from "@/components/TripGroupChat";
import PassengersSection from "@/components/PassengersSection";
import { getToken, Ride, getMyRides, getMyBookings, cancelRide, cancelBooking, getRideHistory, RideHistoryItem, createRating, getCurrentUserId, deleteRide, getPendingBookingsForDriver, acceptBooking, rejectBooking, PendingBooking } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MyRidesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverRides, setDriverRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<Ride[]>([]);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [activeTab, setActiveTab] = useState<'driver' | 'passenger' | 'requests' | 'history'>('driver');
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    type: 'ride' | 'booking';
    rideId: number | null;
    refundPercent?: number;
    departureDate?: string;
  }>({
    isOpen: false,
    type: 'ride',
    rideId: null,
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    rideId: number | null;
  }>({
    isOpen: false,
    rideId: null,
  });
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    bookingId: number | null;
    ratedUserName: string; // Name of the person being rated
    ratedUserAvatar?: string | null; // Avatar of the person being rated
    ratedUserRole: "conductor" | "pasajero";
  }>({
    isOpen: false,
    bookingId: null,
    ratedUserName: "",
    ratedUserAvatar: null,
    ratedUserRole: "conductor",
  });
  const [passengerSelectionModal, setPassengerSelectionModal] = useState<{
    isOpen: boolean;
    rideId: number | null;
    passengers: Passenger[];
  }>({
    isOpen: false,
    rideId: null,
    passengers: [],
  });
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [chatModal, setChatModal] = useState<{
    isOpen: boolean;
    tripId: number | null;
  }>({
    isOpen: false,
    tripId: null,
  });

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
    
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
    
    if (token) {
      fetchMyRides();
      fetchMyBookings();
      fetchRideHistory();
      fetchPendingBookings();
    } else {
      setLoading(false);
    }

    // Check if we need to open a chat from notification
    const openChatParam = searchParams.get("openChat");
    if (openChatParam && currentUserId) {
      const tripId = parseInt(openChatParam, 10);
      if (!isNaN(tripId)) {
        setChatModal({ isOpen: true, tripId });
        // Remove the query parameter from URL
        router.replace("/my-rides", { scroll: false });
      }
    }

    // Set up auto-refresh every 60 seconds to update ride lists
    const refreshInterval = setInterval(() => {
      const currentToken = getToken();
      if (currentToken) {
        fetchMyRides();
        fetchMyBookings();
        fetchRideHistory();
      }
    }, 60000); // Refresh every minute

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const currentToken = getToken();
        if (currentToken) {
          fetchMyRides();
          fetchMyBookings();
          fetchRideHistory();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle opening chat from notification
  useEffect(() => {
    const openChatParam = searchParams.get("openChat");
    if (openChatParam && currentUserId) {
      const tripId = parseInt(openChatParam, 10);
      if (!isNaN(tripId)) {
        setChatModal({ isOpen: true, tripId });
        // Remove the query parameter from URL
        router.replace("/my-rides", { scroll: false });
      }
    }
  }, [searchParams, currentUserId, router]);

  const fetchMyRides = async () => {
    try {
      setLoading(true);
      const rides = await getMyRides();
      setDriverRides(rides);
    } catch (error) {
      console.error("Error fetching my rides:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const bookings = await getMyBookings();
      // Filter out rejected and cancelled bookings from "Mis reservas como pasajero"
      const filteredBookings = bookings.filter((ride) => 
        ride.booking_status !== "REJECTED" && 
        ride.booking_status !== "CANCELLED"
      );
      setBookings(filteredBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchRideHistory = async () => {
    try {
      const history = await getRideHistory();
      setRideHistory(history);
    } catch (error) {
      console.error("Error fetching ride history:", error);
    }
  };

  const fetchPendingBookings = async () => {
    try {
      const pending = await getPendingBookingsForDriver();
      setPendingBookings(pending);
    } catch (error) {
      console.error("Error fetching pending bookings:", error);
    }
  };

  const handleAcceptBooking = async (bookingId: number) => {
    try {
      const result = await acceptBooking(bookingId);
      console.log("Booking accepted:", result);
      await fetchPendingBookings();
      await fetchMyRides(); // Refresh rides to update available seats
      alert("✅ Solicitud aceptada correctamente");
    } catch (error: any) {
      console.error("Error accepting booking:", error);
      const errorMsg = error?.message || "Error al aceptar la solicitud";
      alert(`❌ ${errorMsg}`);
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    try {
      const result = await rejectBooking(bookingId);
      console.log("Booking rejected:", result);
      await fetchPendingBookings();
      alert("✅ Solicitud rechazada");
    } catch (error: any) {
      console.error("Error rejecting booking:", error);
      const errorMsg = error?.message || "Error al rechazar la solicitud";
      alert(`❌ ${errorMsg}`);
    }
  };

  const handleCancelRide = (rideId: number) => {
    setCancelModal({
      isOpen: true,
      type: 'ride',
      rideId: rideId,
    });
  };

  const handleCancelBooking = (rideId: number) => {
    // Find the booking by ride id
    const booking = bookings.find(b => b.id === rideId);
    let refundPercent = 100;
    
    if (booking && booking.departure_date && booking.departure_time) {
      // Parse the departure_date which is in ISO format (2025-12-07T10:30:00.000Z)
      const departureDateTime = new Date(booking.departure_date);
      const now = new Date();
      const hoursUntilDeparture = (departureDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilDeparture >= 24) {
        refundPercent = 100; // 100% refund
      } else if (hoursUntilDeparture > 0) {
        refundPercent = 70;  // 70% refund
      } else {
        refundPercent = 0; // No refund if already passed
      }
    }
    
    setCancelModal({
      isOpen: true,
      type: 'booking',
      rideId: rideId,
      refundPercent,
      departureDate: booking?.departure_date,
    });
  };

  const confirmCancel = async () => {
    if (!cancelModal.rideId) return;

    try {
      if (cancelModal.type === 'ride') {
        await cancelRide(cancelModal.rideId);
        await fetchMyRides();
        await fetchRideHistory(); // Refresh history to show cancelled ride
        setCancelModal({ isOpen: false, type: 'ride', rideId: null });
      } else {
        const result = await cancelBooking(cancelModal.rideId);
        await fetchMyBookings();
        await fetchRideHistory(); // Refresh history in case the ride was cancelled
        setCancelModal({ isOpen: false, type: 'ride', rideId: null });
        
        // Show refund information if available
        if (result && result.refund) {
          const refund = result.refund;
          if (refund.refundAmount > 0) {
            alert(
              `✅ Reserva cancelada con éxito\n\n` +
              `💰 Detalles del reembolso:\n` +
              `• Importe original: €${refund.originalAmount.toFixed(2)}\n` +
              `• Penalización por cancelación (${refund.cancellationPenaltyPercent}%): -€${refund.cancellationPenaltyAmount.toFixed(2)}\n` +
              `• Comisión Stripe: -€${refund.stripeFee.toFixed(2)}\n` +
              `• Reembolso total: €${refund.refundAmount.toFixed(2)}\n\n` +
              `El reembolso se procesará en 5-10 días laborables.`
            );
          } else {
            alert(
              `✅ Reserva cancelada\n\n` +
              `⚠️ No se ha procesado reembolso debido a las comisiones de cancelación y Stripe.`
            );
          }
        } else {
          alert("✅ Reserva cancelada con éxito");
        }
      }
    } catch (error: any) {
      console.error("Error canceling:", error);
      const errorMsg = error?.message || "Error desconocido";
      alert(
        cancelModal.type === 'ride'
          ? `❌ Error al cancelar el viaje: ${errorMsg}`
          : `❌ Error al cancelar la reserva: ${errorMsg}`
      );
    }
  };

  const closeCancelModal = () => {
    setCancelModal({ isOpen: false, type: 'ride', rideId: null });
  };

  const handleDeleteRide = (rideId: number) => {
    setDeleteModal({
      isOpen: true,
      rideId: rideId,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.rideId) return;

    try {
      await deleteRide(deleteModal.rideId);
      await fetchRideHistory(); // Refresh history after deletion
      setDeleteModal({ isOpen: false, rideId: null });
    } catch (error) {
      console.error("Error deleting ride:", error);
      alert("Error al eliminar el viaje. Por favor, intenta de nuevo.");
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, rideId: null });
  };

  const handleRateClick = async (ride: RideHistoryItem) => {
    // For driver rides with multiple passengers, show passenger selection modal
    if (ride.role === "conductor" && ride.passengers && ride.passengers.length > 0) {
      setPassengerSelectionModal({
        isOpen: true,
        rideId: ride.id,
        passengers: ride.passengers,
      });
      return;
    }
    
    // For passenger rides or legacy driver rides (single passenger), use direct rating
    if (!ride.can_rate || !ride.booking_id) return;
    
    // Use the rated user information from the ride (the person being rated)
    const ratedUserName = ride.rated_user_name || ride.driver_name || "Usuario";
    const ratedUserAvatar = ride.rated_user_avatar || null;
    const ratedUserRole = ride.role === "conductor" ? "pasajero" : "conductor";
    
    setRatingModal({
      isOpen: true,
      bookingId: ride.booking_id,
      ratedUserName: ratedUserName,
      ratedUserAvatar: ratedUserAvatar,
      ratedUserRole: ratedUserRole,
    });
  };

  const handlePassengerSelect = (passenger: Passenger) => {
    // Open rating modal for selected passenger
    setRatingModal({
      isOpen: true,
      bookingId: passenger.booking_id,
      ratedUserName: passenger.passenger_name,
      ratedUserAvatar: passenger.passenger_avatar || null,
      ratedUserRole: "pasajero",
    });
    setPassengerSelectionModal({
      isOpen: false,
      rideId: null,
      passengers: [],
    });
  };

  const closePassengerSelectionModal = () => {
    setPassengerSelectionModal({
      isOpen: false,
      rideId: null,
      passengers: [],
    });
  };

  const handleRatingSubmit = async (rating: number, comment?: string) => {
    if (!ratingModal.bookingId) {
      throw new Error("No se pudo identificar la reserva");
    }

    await createRating({
      booking_id: ratingModal.bookingId,
      rating: rating,
      comment: comment,
    });

    // Refresh ride history to update has_rated and can_rate
    await fetchRideHistory();
  };

  const closeRatingModal = () => {
    setRatingModal({
      isOpen: false,
      bookingId: null,
      ratedUserName: "",
      ratedUserAvatar: null,
      ratedUserRole: "conductor",
    });
  };

  const handleProfileClick = () => {
    if (isLoggedIn) {
      router.push("/profile");
    } else {
      router.push("/login");
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (dateString: string) => {
    if (!mounted) {
      // Return a placeholder during SSR to avoid hydration mismatch
      return "";
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          Publicado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          Inactivo
        </span>
      );
    }
  };

  const getRoleBadge = (role: "conductor" | "pasajero") => {
    if (role === "conductor") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
          Conductor
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          Pasajero
        </span>
      );
    }
  };

  const getHistoryStatusBadge = (status?: "cancelled" | "completed" | "rejected") => {
    if (status === "cancelled") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          Cancelado
        </span>
      );
    } else if (status === "rejected") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          Rechazado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          Completado
        </span>
      );
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} h`;
    }
    return `${hours} h ${mins} min`;
  };

  const displayedRides = showInactive 
    ? driverRides 
    : driverRides.filter(ride => ride.is_active);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn && !loading) {
      router.push("/login");
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return (
      <DesktopLayout showSidebar={false}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando tus viajes...</p>
          </div>
        </div>
      </DesktopLayout>
    );
  }

  return (
    <DesktopLayout showSidebar={false}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                  </svg>
                </div>
                <span className="text-2xl font-bold text-gray-800">UniGO</span>
              </div>

              <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.707.707a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                  <span>Inicio</span>
                </Link>
                <button className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 transition-colors font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                  <span>Mis Viajes</span>
                </button>
                <Link href="/my-cards" className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                  <span>Mis Tarjetas</span>
                </Link>
                <button
                  onClick={handleProfileClick}
                  className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors font-medium cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                  <span>Perfil</span>
                </button>
                <Link href="/post-ride" className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center space-x-2 shadow-md">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                  </svg>
                  <span>Publicar Viaje</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Page Header with Tabs */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-6">Mis Viajes</h1>
            
            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('driver')}
                className={`pb-4 px-6 font-semibold text-lg border-b-2 transition-colors ${
                  activeTab === 'driver'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Mis viajes como conductor
              </button>
              <button
                onClick={() => setActiveTab('passenger')}
                className={`pb-4 px-6 font-semibold text-lg border-b-2 transition-colors ${
                  activeTab === 'passenger'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Mis reservas como pasajero
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`pb-4 px-6 font-semibold text-lg border-b-2 transition-colors relative ${
                  activeTab === 'requests'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Solicitudes
                {pendingBookings.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingBookings.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-4 px-6 font-semibold text-lg border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Registro
              </button>
            </div>
          </div>

          {/* Toggle Button (only show for driver tab) */}
          {activeTab === 'driver' && (
            <div className="mb-6">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                {showInactive ? "Mostrar Solo Viajes Activos" : "Mostrar También Viajes Inactivos"}
              </button>
            </div>
          )}

          {/* Content Based on Active Tab */}
          {activeTab === 'driver' && (
            /* My trips as a driver */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              {displayedRides.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 text-lg mb-2">Aún no hay viajes</p>
                  <p className="text-gray-500">¡Comienza compartiendo tu viaje publicando un viaje!</p>
                  <Link href="/post-ride" className="mt-4 inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors">
                    Publica Tu Primer Viaje
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {displayedRides.map((ride) => (
                    <div
                      key={ride.id}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-xl"
                    >
                      <ActivityMapPreview
                        originName={ride.departure_city}
                        destinationName={ride.destination_city}
                        originLat={ride.departure_lat}
                        originLng={ride.departure_lng}
                        destinationLat={ride.destination_lat}
                        destinationLng={ride.destination_lng}
                        className="h-48"
                      />
                      <div className="p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              {getStatusBadge(ride.is_active)}
                            </div>
                            <div className="text-sm text-gray-500 uppercase tracking-[0.3em]">
                              {formatDate(ride.departure_date)} · {ride.departure_time}
                            </div>
                            <h3 className="text-2xl font-semibold text-gray-900">{ride.destination_city}</h3>
                            <p className="text-sm text-gray-500">
                              {ride.departure_city} → {ride.destination_city}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Precio por asiento</p>
                            <p className="text-2xl font-semibold text-gray-900">
                              {ride.price_per_seat.toFixed(2)} €
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-gray-600 md:grid-cols-3">
                          <div>
                            <span className="font-medium text-gray-900">Asientos:</span> {ride.available_seats}/{ride.total_seats || ride.available_seats} disponibles
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Vehículo:</span>{" "}
                            {ride.vehicle_brand || ride.vehicle_color
                              ? [ride.vehicle_brand, ride.vehicle_color].filter(Boolean).join(" ")
                              : "N/A"}
                          </div>
                          {ride.estimated_duration_minutes && (
                            <div>
                              <span className="font-medium text-gray-900">Duración:</span>{" "}
                              {formatDuration(ride.estimated_duration_minutes)}
                            </div>
                          )}
                        </div>

                        {ride.additional_details && (
                          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                            <span className="font-medium text-gray-900">Detalles:</span> {ride.additional_details}
                          </div>
                        )}

                        {ride.is_active && (
                          <div className="mt-6 flex justify-end gap-3">
                            {/* Chat Button - Show if trip has accepted passengers */}
                            {(() => {
                              // Check if there are accepted passengers by comparing seats
                              const totalSeats = ride.total_seats || ride.available_seats;
                              const hasAcceptedPassengers = ride.available_seats < totalSeats;
                              const isDriver = currentUserId === ride.driver_id;
                              
                              if (isDriver && hasAcceptedPassengers) {
                                return (
                                  <button
                                    onClick={() => setChatModal({ isOpen: true, tripId: ride.id })}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors text-sm flex items-center space-x-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <span>Chat del Viaje</span>
                                  </button>
                                );
                              }
                              return null;
                            })()}
                            <button
                              onClick={() => handleCancelRide(ride.id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm"
                            >
                              Cancelar Viaje
                            </button>
                          </div>
                        )}

                        {/* Passengers Section - Only for driver */}
                        {ride.is_active && currentUserId === ride.driver_id && (
                          <PassengersSection
                            rideId={ride.id}
                            onSeatFreed={(newAvailableSeats) => {
                              // Actualizar available_seats en el estado local
                              setDriverRides((prevRides) =>
                                prevRides.map((r) =>
                                  r.id === ride.id
                                    ? { ...r, available_seats: newAvailableSeats }
                                    : r
                                )
                              );
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'passenger' && (
            /* My bookings as a passenger */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-600 text-lg mb-2">Aún no hay reservas</p>
                  <p className="text-gray-500">Reserva asientos en viajes disponibles para verlos aquí</p>
                  <Link href="/" className="mt-4 inline-block text-orange-600 hover:text-orange-700 font-medium">
                    Explorar Viajes Disponibles →
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {bookings.map((ride) => (
                    <div
                      key={ride.id}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-xl"
                    >
                      <ActivityMapPreview
                        originName={ride.departure_city}
                        destinationName={ride.destination_city}
                        originLat={ride.departure_lat}
                        originLng={ride.departure_lng}
                        destinationLat={ride.destination_lat}
                        destinationLng={ride.destination_lng}
                        className="h-48"
                      />
                      <div className="p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              {ride.booking_status === 'pending' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                  Pendiente de confirmación
                                </span>
                              )}
                              {ride.booking_status === 'confirmed' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                  Confirmado
                                </span>
                              )}
                              {ride.booking_status === 'rejected' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                  Rechazado
                                </span>
                              )}
                              {!ride.booking_status && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                  Reservado
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 uppercase tracking-[0.3em]">
                              {formatDate(ride.departure_date)} · {ride.departure_time}
                            </div>
                            <h3 className="text-2xl font-semibold text-gray-900">{ride.destination_city}</h3>
                            <p className="text-sm text-gray-500">
                              {ride.departure_city} → {ride.destination_city}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Precio por asiento</p>
                            <p className="text-2xl font-semibold text-gray-900">
                              {ride.price_per_seat.toFixed(2)} €
                            </p>
                          </div>
                        </div>

                        {/* Driver Info Section */}
                        <div className="mt-6 flex items-center space-x-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex-shrink-0">
                            {ride.driver_avatar ? (
                              <img
                                src={ride.driver_avatar}
                                alt={ride.driver_name}
                                className="h-12 w-12 rounded-full object-cover border-2 border-orange-200"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-200">
                                <svg className="h-6 w-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 font-medium">Conductor</p>
                            <p className="text-base font-semibold text-gray-900">{ride.driver_name}</p>
                          </div>
                        </div>

                        {/* Trip Details */}
                        <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-600 md:grid-cols-3">
                          <div>
                            <span className="font-medium text-gray-900">Asientos reservados:</span> {ride.booking_seats || 1}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Vehículo:</span>{" "}
                            {ride.vehicle_brand || ride.vehicle_color
                              ? [ride.vehicle_brand, ride.vehicle_color].filter(Boolean).join(" ")
                              : "N/A"}
                          </div>
                          {ride.estimated_duration_minutes && (
                            <div>
                              <span className="font-medium text-gray-900">Duración:</span>{" "}
                              {formatDuration(ride.estimated_duration_minutes)}
                            </div>
                          )}
                        </div>

                        {ride.additional_details && (
                          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                            <span className="font-medium text-gray-900">Detalles:</span> {ride.additional_details}
                          </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                          {/* Chat Button - Show only if booking is ACCEPTED */}
                          {ride.booking_status === 'ACCEPTED' && (
                            <button
                              onClick={() => setChatModal({ isOpen: true, tripId: ride.id })}
                              className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors text-sm flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span>Chat del Viaje</span>
                            </button>
                          )}
                          {/* Only show cancel button if booking is pending or accepted */}
                          {(ride.booking_status === 'PENDING' || ride.booking_status === 'ACCEPTED') && (
                            <button
                              onClick={() => handleCancelBooking(ride.id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Cancelar Reserva</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            /* Pending booking requests */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              {pendingBookings.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <p className="text-gray-600 text-lg mb-2">No hay solicitudes pendientes</p>
                  <p className="text-gray-500">Cuando alguien solicite unirse a tus viajes, aparecerán aquí.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Solicitudes de Reserva</h3>
                  {pendingBookings.map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-6 hover:border-orange-300 transition-colors">
                      {/* Ride Info */}
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900">
                              {booking.ride.origin} → {booking.ride.destination}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {new Date(booking.ride.departure_time).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-orange-600">
                              {booking.ride.price_per_seat}€
                            </p>
                            <p className="text-sm text-gray-500">por asiento</p>
                          </div>
                        </div>
                      </div>

                      {/* Passenger Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {booking.passenger.avatar_url ? (
                              <img
                                src={booking.passenger.avatar_url}
                                alt={booking.passenger.full_name}
                                className="w-16 h-16 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-bold">
                                {booking.passenger.full_name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>

                          {/* Passenger Details */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h5 className="font-semibold text-lg text-gray-900">
                                {booking.passenger.full_name}
                              </h5>
                              {booking.passenger.average_rating !== null && (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                  </svg>
                                  <span className="font-medium text-gray-900">
                                    {booking.passenger.average_rating.toFixed(1)}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    ({booking.passenger.rating_count})
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {booking.passenger.university && (
                              <p className="text-sm text-gray-600 mb-1">
                                📚 {booking.passenger.university}
                                {booking.passenger.degree && ` - ${booking.passenger.degree}`}
                                {booking.passenger.course && ` (${booking.passenger.course}º curso)`}
                              </p>
                            )}
                            
                            {booking.passenger.bio && (
                              <p className="text-sm text-gray-600 italic mt-2">
                                "{booking.passenger.bio}"
                              </p>
                            )}
                            
                            <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                              <span>
                                🪑 {booking.seats} {booking.seats === 1 ? 'asiento' : 'asientos'}
                              </span>
                              <span>
                                📅 Solicitado el {new Date(booking.created_at).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => handleAcceptBooking(booking.id)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors text-sm whitespace-nowrap"
                          >
                            ✓ Aceptar
                          </button>
                          <button
                            onClick={() => handleRejectBooking(booking.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm whitespace-nowrap"
                          >
                            ✗ Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            /* Ride History / Registro */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              {rideHistory.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 text-lg mb-2">Aún no hay viajes en el registro</p>
                  <p className="text-gray-500">Los viajes completados aparecerán aquí automáticamente</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {rideHistory.map((ride, index) => (
                    <div
                      key={ride.booking_id ? `${ride.id}-${ride.booking_id}` : `${ride.id}-${index}`}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-xl"
                    >
                      <ActivityMapPreview
                        originName={ride.departure_city}
                        destinationName={ride.destination_city}
                        originLat={ride.departure_lat}
                        originLng={ride.departure_lng}
                        destinationLat={ride.destination_lat}
                        destinationLng={ride.destination_lng}
                        className="h-48"
                      />
                      <div className="p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              {getRoleBadge(ride.role)}
                              {getHistoryStatusBadge(ride.status)}
                            </div>
                            <div className="text-sm text-gray-500 uppercase tracking-[0.3em]">
                              {formatDate(ride.departure_date)} · {ride.departure_time}
                            </div>
                            <h3 className="text-2xl font-semibold text-gray-900">{ride.destination_city}</h3>
                            <p className="text-sm text-gray-500">
                              {ride.departure_city} → {ride.destination_city}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Total</p>
                            <p className="text-2xl font-semibold text-gray-900">
                              {ride.price_per_seat.toFixed(2)} €
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-gray-600 md:grid-cols-3">
                          {ride.role === "pasajero" && (
                            <div>
                              <span className="font-medium text-gray-900">Conductor:</span> {ride.driver_name}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-900">Vehículo:</span>{" "}
                            {ride.vehicle_brand || ride.vehicle_color
                              ? [ride.vehicle_brand, ride.vehicle_color].filter(Boolean).join(" ")
                              : "N/A"}
                          </div>
                          {ride.estimated_duration_minutes && (
                            <div>
                              <span className="font-medium text-gray-900">Duración:</span>{" "}
                              {Math.floor(ride.estimated_duration_minutes / 60)}h {ride.estimated_duration_minutes % 60}min
                            </div>
                          )}
                        </div>

                        {ride.additional_details && (
                          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                            <span className="font-medium text-gray-900">Detalles:</span> {ride.additional_details}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-6 flex justify-end gap-3">
                          {/* Show rating button for drivers if there are pending passengers, or for passengers if can_rate */}
                          {((ride.role === "conductor" && ride.has_pending_ratings) || (ride.role === "pasajero" && ride.can_rate && ride.booking_id)) && (
                            <button
                              onClick={() => handleRateClick(ride)}
                              className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors text-sm"
                            >
                              Valorar
                            </button>
                          )}
                          {/* Delete button - only for own rides as conductor */}
                          {ride.role === "conductor" && (
                            <button
                              onClick={() => handleDeleteRide(ride.id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={cancelModal.isOpen}
        title={
          cancelModal.type === 'ride'
            ? "Cancelar Viaje"
            : "Cancelar Reserva"
        }
        message={
          cancelModal.type === 'ride'
            ? "¿Estás seguro de que quieres cancelar este viaje? Esta acción no se puede deshacer."
            : cancelModal.refundPercent !== undefined
            ? `¿Estás seguro de que quieres cancelar esta reserva?\n\n💰 Reembolso: ${cancelModal.refundPercent}% del importe pagado\n\n${
                cancelModal.refundPercent === 100
                  ? "✅ Cancelas con más de 24 horas de antelación, recibirás el reembolso completo."
                  : "⚠️ Cancelas con menos de 24 horas de antelación, recibirás el 70% del importe."
              }`
            : "¿Estás seguro de que quieres cancelar esta reserva? Los asientos se liberarán automáticamente."
        }
        confirmText="Sí, cancelar"
        cancelText="No, mantener"
        confirmButtonColor="red"
        onConfirm={confirmCancel}
        onCancel={closeCancelModal}
      />

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModal.isOpen}
        ratedUserName={ratingModal.ratedUserName}
        ratedUserAvatar={ratingModal.ratedUserAvatar}
        ratedUserRole={ratingModal.ratedUserRole}
        onClose={closeRatingModal}
        onSubmit={handleRatingSubmit}
      />

      {/* Passenger Selection Modal */}
      <PassengerSelectionModal
        isOpen={passengerSelectionModal.isOpen}
        passengers={passengerSelectionModal.passengers}
        onClose={closePassengerSelectionModal}
        onSelectPassenger={handlePassengerSelect}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Eliminar Viaje"
        message="¿Estás seguro de que quieres eliminar este viaje del registro? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
      />

      {/* Group Chat Modal */}
              {chatModal.isOpen && chatModal.tripId && currentUserId && (
                <TripGroupChat
                  isOpen={chatModal.isOpen}
                  onClose={() => setChatModal({ isOpen: false, tripId: null })}
                  tripId={chatModal.tripId}
                  currentUserId={currentUserId}
                />
              )}

            </DesktopLayout>
          );
        }

