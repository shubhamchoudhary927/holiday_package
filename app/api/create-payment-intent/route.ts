import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function POST(request: Request) {
  try {
    const { packageId, travelDate, people, userId } = await request.json();

    // पैकेज की जानकारी लें
    const package_ = await prisma.package.findUnique({
      where: { id: packageId }
    });

    if (!package_) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    const totalAmount = package_.price * people;

    // Stripe Payment Intent बनाएं
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // पैसे को cent में बदलें
      currency: "inr",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        packageId,
        userId: userId || "guest",
        travelDate,
        people: people.toString(),
      },
    });

    // बुकिंग टेम्परेरी सेव करें
    const booking = await prisma.booking.create({
      data: {
        userId: userId || "guest", // गेस्ट यूजर के लिए
        packageId,
        travelDate: new Date(travelDate),
        people,
        totalAmount,
        status: "pending",
        paymentIntentId: paymentIntent.id,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      bookingId: booking.id,
    });
  } catch (error) {
    console.error("Payment intent error:", error);
    return NextResponse.json(
      { error: "Error creating payment intent" },
      { status: 500 }
    );
  }
}