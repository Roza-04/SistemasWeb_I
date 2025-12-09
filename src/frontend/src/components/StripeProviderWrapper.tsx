"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ReactNode } from "react";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripe() {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    return null;
  }

  if (!stripePromise) {
    // Next.js uses process.env with NEXT_PUBLIC_ prefix
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
    
    if (stripeKey) {
      console.log('[Stripe] Initializing with publishable key:', stripeKey.substring(0, 20) + '...');
      stripePromise = loadStripe(stripeKey);
    } else {
      console.warn('[Stripe] No publishable key found. Set NEXT_PUBLIC_STRIPE_PUBLIC_KEY in .env');
    }
  }
  return stripePromise;
}

interface StripeProviderWrapperProps {
  children: ReactNode;
}

export default function StripeProviderWrapper({ children }: StripeProviderWrapperProps) {
  const stripePromise = getStripe();

  // If Stripe is not configured, just render children without provider
  if (!stripePromise) {
    console.warn('[Stripe] Provider not initialized - Stripe elements will not be available');
    return <>{children}</>;
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}

