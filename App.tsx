import React from 'react';
import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from 'react-native/Libraries/NewAppScreen';

import {PermissionsAndroid, Platform} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import axios from 'axios';
import {BASE_URL} from '@env';

async function hasAndroidPermission() {
  const getCheckPermissionPromise = () => {
    if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
      return Promise.all([
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ),
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ),
      ]).then(
        ([hasReadMediaImagesPermission, hasReadMediaVideoPermission]) =>
          hasReadMediaImagesPermission && hasReadMediaVideoPermission,
      );
    } else {
      return PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
    }
  };

  const hasPermission = await getCheckPermissionPromise();
  if (hasPermission) {
    return true;
  }
  const getRequestPermissionPromise = () => {
    if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
      return PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      ]).then(
        statuses =>
          statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] ===
            PermissionsAndroid.RESULTS.GRANTED,
      );
    } else {
      return PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ).then(status => status === PermissionsAndroid.RESULTS.GRANTED);
    }
  };

  return await getRequestPermissionPromise();
}

function App(): React.JSX.Element {
  const [filename, setFilename] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  async function listAlbums() {
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
      return;
    }
    let err = null;
    setUploading(true);
    const albums = await CameraRoll.getAlbums({
      assetType: 'All',
      albumType: 'All',
    });

    let albumsNames = albums.map(album => album.title);
    let lastTime = await AsyncStorage.getItem('timestamp');
    console.log(lastTime);
    if (!lastTime) {
      lastTime = '1703196000000'; // December 22, 2023 00:00:00  GMT+02:00
    }
    albumsNames = albumsNames.filter(name =>
      [
        'Twitter',
        'Pictures',
        'PS App',
        // 'Screenshots',
        // 'WhatsApp Video',
        // 'WhatsApp Images',
        'Exercices',
        'Messenger',
        // 'WhatsApp Animated Gifs',
        'Snapchat',
        'Instander',
        // 'twitter',
        'Reddit',
        // 'WhatsApp Documents',
        'Camera',
        'Download',
        'God of War',
        'Massages',
        'Food',
      ].includes(name),
    );

    for (const name of albumsNames) {
      const content = await CameraRoll.getPhotos({
        first: 100,
        groupTypes: 'Album',
        groupName: name,
        // fromTime: 1703548800000,
        // fromTime: Date.now() - 5 * 60 * 60 * 1000,
        fromTime: parseInt(lastTime, 10),
      });
      if (content.edges.length > 0) {
        for (const image of content.edges) {
          const formdata = new FormData();
          setFilename(image.node.image.uri.split('/').pop() ?? '');
          formdata.append('files', {
            name: `${name}&&${
              image.node.timestamp * 1000
            }&&${image.node.image.uri.split('/').pop()}`,
            type: image.node.type,
            uri: image.node.image.uri,
          });
          await axios({
            method: 'post',
            url: `${BASE_URL}/upload`,
            data: formdata,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'multipart/form-data',
            },
          })
            .then(res => console.log(res.data))
            .catch(e => {
              err = e.message;
              console.log(e?.response?.data);
            });
        }
      }
    }
    setError(err);
    if (!err) {
      await AsyncStorage.setItem('timestamp', Date.now().toString());
    }
    setUploading(false);
    setFilename('');
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />

      <View
        style={{
          ...styles.sectionContainer,
          backgroundColor: isDarkMode ? Colors.black : Colors.white,
        }}>
        <Text>URL: {BASE_URL}</Text>
        {uploading && <Text>{filename}</Text>}
        {error && <Text style={styles.error}>{JSON.stringify(error)}</Text>}
        <Button title="Sync" onPress={listAlbums} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    height: '100%',
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: 'red',
  },
});

export default App;
