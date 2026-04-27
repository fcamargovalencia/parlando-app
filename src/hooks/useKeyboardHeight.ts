import { useState, useEffect } from 'react';
import { Keyboard, Platform, Dimensions } from 'react-native';

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const isIOS = Platform.OS === 'ios';
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      let h = e.endCoordinates.height ?? 0;
      if (!isIOS) {
        // Android edge-to-edge: e.endCoordinates.height can be short by the
        // nav-bar height, so take the max with the footprint computed from the
        // screen bottom to the keyboard top.
        const screenHeight = Dimensions.get('screen').height;
        const keyboardTop = e.endCoordinates.screenY ?? screenHeight;
        h = Math.max(h, screenHeight - keyboardTop);
      }
      setHeight(h);
    });
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
