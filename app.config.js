// app.config.js

// Load environment variables from .env file
require('dotenv').config();

export default {
  "expo": {
    "name": "bolt-expo-nativewind",
    "slug": "bolt-expo-nativewind",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": ["expo-router", "expo-font", "expo-web-browser"],
    "experiments": {
      "typedRoutes": true
    },
    "android": {
      "package": "com.intechart.bizperda", 
      "config": {
        "googleMaps": {
          // --- THIS IS THE FIX ---
          // Use process.env to access the variable
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_API_KEY
        }
      }
    },
    "extra": {
      // --- THIS IS THE FIX ---
      // Use process.env here as well
      "eas": {
        "projectId": "c1a46817-e1a7-42ff-8c0b-02573ac830e7"
      },
      "googleApiKey": process.env.EXPO_PUBLIC_GOOGLE_API_KEY
    }
  }
};
