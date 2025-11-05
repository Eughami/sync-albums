import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Image,
  useColorScheme,
} from 'react-native';
import BouncyCheckbox from 'react-native-bouncy-checkbox';

type Ppros = {
  title: string;
  uri: string;
  updateFunc: (n: string, b: boolean) => void;
};
function Preview(item: Ppros) {
  const {title, uri, updateFunc} = item;
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <View style={[styles.root]}>
      <View style={[styles.container, styles[colorScheme]]}>
        <Pressable
          onPress={() => {
            // Select/unselect the item
            console.log('Pressed', title);
          }}
          style={({pressed}) => pressed && {opacity: 0.5}}>
          <Image
            style={styles.image}
            source={{
              uri,
            }}
          />
          {/* <View style={styles.textContainer}>
            <Text numberOfLines={1} style={styles.text}>
              {title}
            </Text>
          </View> */}
        </Pressable>
      </View>
      <BouncyCheckbox
        style={{marginTop: 10}}
        text={title}
        textStyle={{color: 'black', textDecorationLine: 'none'}}
        onPress={(isChecked: boolean) => updateFunc(title, isChecked)}
      />
    </View>
  );
}

export default Preview;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    margin: 15,
  },
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 15,
    width: '100%',
    height: 200,
  },
  dark: {
    // ADD custom shadow effect for darkMode
    borderWidth: 0.5,
    borderColor: '#6d6969',
  },
  light: {
    elevation: 4, // Android shadow
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4, // iOS shadow
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  textContainer: {
    flex: 1,
    backgroundColor: 'black',
    opacity: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    height: 40,
    width: '100%',
    bottom: 0,
  },

  text: {
    paddingHorizontal: 10,
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  ribbon: {
    position: 'absolute',
    top: 10, // Adjust the top position as per your requirement
    left: -25, // Adjust the left position as per your requirement
    paddingHorizontal: 10,
    paddingVertical: 5,
    transform: [{rotate: '-45deg'}],
  },
  ribbonText: {
    color: 'white', // Customize the ribbon text color
    fontSize: 12,
    paddingHorizontal: 10, // Customize the ribbon text size
    // marginBottom: 5,
    // fontWeight: 'bold',
  },
  price: {
    position: 'absolute',
    // top: 10, // Adjust the top position as per your requirement
    right: 10, // Adjust the left position as per your requirement
    paddingHorizontal: 10,
    paddingVertical: 5,
    // transform: [{ rotate: '45deg' }],
  },
  priceText: {
    color: 'white', // Customize the ribbon text color
    fontSize: 14, // Customize the ribbon text size
    fontWeight: 'bold',
  },
});
