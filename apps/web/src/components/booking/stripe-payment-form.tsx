"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { Button } from "@/components/ui/button";

interface StripePaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
}

export function StripePaymentForm({ clientSecret, onSuccess }: StripePaymentFormProps) {
  const stripePromise = getStripe();
  if (!stripePromise) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerForm onSuccess={onSuccess} />
    </Elements>
  );
}

function InnerForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (confirmError) {
      setError(confirmError.message ?? "Payment failed");
      setIsSubmitting(false);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={!stripe}>
        Pay now
      </Button>
    </form>
  );
}
