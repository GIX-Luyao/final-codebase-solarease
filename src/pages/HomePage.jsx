import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import Header from '../components/Header';
import Hero from '../components/Hero';
import InputForm from '../components/InputForm';
import CTASection from '../components/CTASection';
import Pagination from '../components/Pagination';
import SuccessfulCases from '../components/SuccessfulCases';
import Footer from '../components/Footer';

export default function HomePage(){
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <Header />
      <Hero />

      <div className="content-wrapper">
        <InputForm
          onNavigateToNegotiation={() => navigate('/roi-calculator')}
          onNavigateToContract={() => navigate('/contract-transparency')}
        />
      </div>

      <div className="content-wrapper">
        <CTASection />
      </div>

      <div className="content-wrapper">
        <Pagination />
      </div>

      <div className="content-wrapper">
        <SuccessfulCases />
      </div>

      <div className="content-wrapper">
        <Footer />
      </div>
    </div>
  );
}
