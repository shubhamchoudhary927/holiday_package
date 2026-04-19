"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const Button = (props: any) => <button {...props} />;
const Card = (props: any) => <div {...props} />;
const CardContent = (props: any) => <div {...props} />;
const toast = console.log;

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}

export default function CheckoutPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    // यहां आपका पैकेज डेटा होगा
    const createPaymentIntent = async () => {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: params.id,
          travelDate: searchParams.get("date"),
          people: parseInt(searchParams.get("people") || "1"),
          userId: "user-id-here", // लॉगिन यूजर का आईडी
        }),
      });

      const data = await response.json();
      setClientSecret(data.clientSecret);
    };

    createPaymentIntent();
  }, [params.id, searchParams]);

  if (!clientSecret) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <Card>
        <CardContent className="p-6">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}