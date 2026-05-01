const appJson = require("./app.json");

const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY || "";
const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY || "";

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...(appJson.expo.ios || {}),
      config: {
        ...((appJson.expo.ios && appJson.expo.ios.config) || {}),
        googleMapsApiKey: iosGoogleMapsApiKey,
      },
    },
    android: {
      ...(appJson.expo.android || {}),
      config: {
        ...((appJson.expo.android && appJson.expo.android.config) || {}),
        googleMaps: {
          apiKey: androidGoogleMapsApiKey,
        },
      },
    },
    plugins: [...(appJson.expo.plugins || [])],
  },
};
