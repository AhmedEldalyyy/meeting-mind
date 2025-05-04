"use client";

import React from 'react';

export default function FontTest() {
  return (
    <div className="p-10 space-y-6">
      <h1 className="text-4xl font-bold font-display">This is using Space Grotesk (Display)</h1>
      <p className="text-xl font-sans">This paragraph is using Inter (Sans)</p>
      
      <div className="space-y-4 mt-8">
        <h2 className="text-2xl font-display">Display Font Sizes</h2>
        <p className="text-sm font-display">Small Display</p>
        <p className="text-base font-display">Base Display</p>
        <p className="text-lg font-display">Large Display</p>
        <p className="text-xl font-display">XL Display</p>
        <p className="text-2xl font-display">2XL Display</p>
        <p className="text-3xl font-display">3XL Display</p>
      </div>
      
      <div className="space-y-4 mt-8">
        <h2 className="text-2xl font-sans">Sans Font Sizes</h2>
        <p className="text-sm font-sans">Small Sans</p>
        <p className="text-base font-sans">Base Sans</p>
        <p className="text-lg font-sans">Large Sans</p>
        <p className="text-xl font-sans">XL Sans</p>
        <p className="text-2xl font-sans">2XL Sans</p>
        <p className="text-3xl font-sans">3XL Sans</p>
      </div>
    </div>
  );
} 