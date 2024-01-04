import React, {useEffect} from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
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
import Preview from './Preview';
import BouncyCheckbox from 'react-native-bouncy-checkbox';

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

type Grid = {
  title: string;
  uri: string;
};
function App(): React.JSX.Element {
  const [useLastTimestamp, setUseLastTimestamp] = React.useState(false);
  const [gridData, setGridData] = React.useState<Grid[]>([]);
  const [albums, setAlbums] = React.useState<string[]>([]);
  const [filename, setFilename] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  /**
   ** Add a new method that shows all albums with the latest media
   ** as thumbnails and ability to select which one to sync
   ** Adjustable time range (or no time at all)
   ** Add splash screen and icon
   */

  async function showAlbums() {
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
      return;
    }

    const ll: Grid[] = [];
    const list = await CameraRoll.getAlbums({
      assetType: 'All',
      albumType: 'All',
    });
    for (const item of list) {
      const content = await CameraRoll.getPhotos({
        first: 1,
        groupTypes: 'Album',
        groupName: item.title,
      });
      ll.push({
        title: item.title,
        uri: content.edges[0].node.image.uri,
      });
    }
    setGridData(ll);
  }

  function updateAlbums(item: string, isSelected: boolean) {
    if (isSelected) {
      setAlbums([...albums, item]);
    } else {
      setAlbums(albums.filter(album => album !== item));
    }
  }

  useEffect(() => {
    // AsyncStorage.setItem('timestamp', '1704152568492');
    console.log('albums updated', albums);
  }, [albums]);

  useEffect(() => {
    showAlbums();
  }, []);

  async function listAlbums() {
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
      return;
    }
    let err = null;
    setUploading(true);

    let lastTime = await AsyncStorage.getItem('timestamp');
    console.log(lastTime);
    if (!lastTime) {
      lastTime = '1704152568492'; // Tuesday, January 2, 2024 1:42:48.492 AM GMT+02:00
    }
    for (const name of albums) {
      const content = await CameraRoll.getPhotos({
        first: 100,
        groupTypes: 'Album',
        groupName: name,
        // fromTime: 1703548800000,
        // fromTime: Date.now() - 5 * 60 * 60 * 1000,
        fromTime: useLastTimestamp ? parseInt(lastTime, 10) : undefined,
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
    if (!err && useLastTimestamp) {
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            ...styles.sectionContainer,
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          {error && <Text style={styles.error}>{JSON.stringify(error)}</Text>}
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            {gridData.map((grid, index) => (
              <View key={index} style={{width: '50%'}}>
                <Preview {...grid} updateFunc={updateAlbums} />
              </View>
            ))}
          </View>
          <BouncyCheckbox
            style={{margin: 10}}
            text="Use Last timestamp"
            textStyle={{color: 'black', textDecorationLine: 'none'}}
            onPress={(isChecked: boolean) => setUseLastTimestamp(isChecked)}
          />
          {/* <Button title="Show" onPress={showAlbums} /> */}
          {uploading && <Text>{filename}</Text>}
          <Button title="Sync" onPress={listAlbums} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    height: '100%',
    justifyContent: 'center',
    padding: 8,
  },
  error: {
    color: 'red',
  },
});

export default App;
