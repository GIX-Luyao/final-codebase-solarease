import React from 'react';
import './HomePage.css';
import Header from '../components/Header';
import Hero from '../components/Hero';
import InputForm from '../components/InputForm';
import Pagination from '../components/Pagination';
import Footer from '../components/Footer';

export default function HomePage(){
  return (
    <div className="home-page">
      {/* Chrome Toolbar / Header */}
      <Header />

      {/* Hero / Button frame */}
      <Hero />

      {/* Input form container */}
      <InputForm />

      {/* Pagination / Regional Impact Map */}
      <Pagination />

      {/* Footer */}
      <Footer />
    </div>
  )
}
