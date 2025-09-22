// types/google-places.d.ts

declare module 'react-native-places-input' {
  import { ComponentType } from 'react';
  import { StyleProp, ViewStyle, TextInputProps } from 'react-native';

  // Define the structure of the 'place' object that onSelect returns
  type Place = {
    result?: {
      geometry?: {
        location?: {
          lat: number;
          lng: number;
        };
      };
      formatted_address?: string;
      name?: string;
      // Add other properties you might need from the result
    };
  };

  // Define the props for the PlacesInput component
  export interface PlacesInputProps {
    googleApiKey: string;
    onSelect: (place: Place) => void;
    placeHolder?: string;
    queryCountries?: string[];
    stylesContainer?: StyleProp<ViewStyle>;
    stylesInput?: StyleProp<ViewStyle>;
    stylesList?: StyleProp<ViewStyle>;
    stylesItem?: StyleProp<ViewStyle>;
    stylesItemText?: StyleProp<TextStyle>;
    stylesLoader?: StyleProp<ViewStyle>;
  }

  const PlacesInput: ComponentType<PlacesInputProps>;

  export default PlacesInput;
}
