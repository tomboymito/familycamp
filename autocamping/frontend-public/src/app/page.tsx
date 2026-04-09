'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Hero from '@/components/sections/Hero';
import About from '@/components/sections/About';
import Features from '@/components/sections/Features';
import Places from '@/components/sections/Places';
import Gallery from '@/components/sections/Gallery';
import Reviews from '@/components/sections/Reviews';
import Map from '@/components/sections/Map';
import Rules from '@/components/sections/Rules';
import Contacts from '@/components/sections/Contacts';
import BookingModal from '@/components/booking/BookingModal';

export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <>
      <Header onBookingOpen={() => setBookingOpen(true)} />
      <main className="pt-16">
        <Hero onBookingOpen={() => setBookingOpen(true)} />
        <About />
        <Features />
        <Places onBookingOpen={() => setBookingOpen(true)} />
        <Gallery />
        <Reviews />
        <Map />
        <Rules />
        <Contacts onBookingOpen={() => setBookingOpen(true)} />
      </main>
      <Footer />
      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}
