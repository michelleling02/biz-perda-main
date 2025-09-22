// components/CustomMarker.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

// SVG code for the default (red) marker
const markerDefaultXml = `
<svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 52C20 52 35 36 35 20C35 9 28.5 1 20 1C11.5 1 5 9 5 20C5 36 20 52 20 52Z" fill="#FF6361" stroke="white" stroke-width="2"/>
  <circle cx="20" cy="20" r="10" fill="white"/>
</svg>
`;

// SVG code for the selected (purple ) marker
const markerSelectedXml = `
<svg width="48" height="62" viewBox="0 0 48 62" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 62C24 62 42 43 42 24C42 11 34.5 1 24 1C13.5 1 6 11 6 24C6 43 24 62 24 62Z" fill="#58508D" stroke="white" stroke-width="2"/>
  <circle cx="24" cy="24" r="12" fill="white"/>
</svg>
`;

interface CustomMarkerProps {
  isSelected: boolean;
}

export const CustomMarker: React.FC<CustomMarkerProps> = ({ isSelected } ) => {
  const xml = isSelected ? markerSelectedXml : markerDefaultXml;
  return <SvgXml xml={xml} />;
};
