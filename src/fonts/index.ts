import * as Font from 'expo-font';

export async function loadFonts() {
  await Font.loadAsync({
    'Roboto-Regular': require('../../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Bold': require('../../assets/fonts/Roboto-Bold.ttf'),
    'Roboto-Medium': require('../../assets/fonts/Roboto-Medium.ttf'),
    'Roboto-Light': require('../../assets/fonts/Roboto-Light.ttf'),
  });
}
