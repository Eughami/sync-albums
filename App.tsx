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
import Preview from './Preview';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import DatePicker from 'react-native-date-picker';

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
  const [gridData, setGridData] = React.useState<Grid[]>([]);
  const [albums, setAlbums] = React.useState<string[]>([]);
  const [filename, setFilename] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const isDarkMode = useColorScheme() === 'dark';
  const [date, setDate] = React.useState(new Date());
  const [open, setOpen] = React.useState(false);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.lighter : Colors.lighter,
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
    setGridData(ll.filter(item => !item.title.includes('WhatsApp')));
  }

  function updateAlbums(item: string, isSelected: boolean) {
    if (isSelected) {
      const found = albums.find(album => album === item);
      if (found) return;
      setAlbums([...albums, item]);
    } else {
      setAlbums(albums.filter(album => album !== item));
    }
  }

  useEffect(() => {
    console.log('albums updated', albums);
  }, [albums]);

  useEffect(() => {
    AsyncStorage.getItem('timestamp').then(c => {
      if (c) {
        setDate(new Date(parseInt(c, 10)));
      }
    });
    // AsyncStorage.removeItem('timestamp');
    showAlbums();
  }, []);

  async function listAlbums() {
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
      return;
    }
    let err = null;
    setUploading(true);

    let lastTime = await AsyncStorage.getItem('timestamp');
    console.log({lastTime});

    for (const name of albums) {
      const content = await CameraRoll.getPhotos({
        first: 500,
        groupTypes: 'Album',
        groupName: name,
        fromTime: date.getTime(),
      });
      console.log('found ' + content.edges.length + ' items in ' + name);
      if (content.edges.length > 0) {
        let curent = 0;
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
          try {
            console.log(
              `${curent + 1}/${
                content.edges.length
              } uploading... ${image.node.image.uri.split('/').pop()}`,
            );
            await axios({
              method: 'post',
              url: 'http://192.168.1.12:8000/upload',
              data: formdata,
              headers: {
                Accept: 'application/json',
                'Content-Type': 'multipart/form-data',
              },
            });
            console.log(
              `Succesfully uploaded ${image.node.image.uri.split('/').pop()}`,
            );
          } catch (error: any) {
            console.log(
              'something went wrong ',
              error?.response?.data || error,
            );
          }
          // await new Promise(resolve => setTimeout(resolve, 1000));
          curent++;
        }
      }
    }
    setError(err);
    if (!err) {
      await AsyncStorage.setItem('timestamp', date.getTime().toString());
    }
    setUploading(false);
    setFilename('');
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        // backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            ...styles.sectionContainer,
            // backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: 150,
              justifyContent: 'space-between',
            }}>
            <Button title="Change date" onPress={() => setOpen(true)} />
            <Text style={{marginLeft: 10}}>
              {date.toLocaleDateString('en-GB')}
            </Text>
          </View>
          <DatePicker
            modal
            open={open}
            date={date}
            onConfirm={date => {
              setOpen(false);
              setDate(date);
            }}
            onCancel={() => {
              setOpen(false);
            }}
            mode="date"
          />
          <BouncyCheckbox
            style={{margin: 10}}
            text="Select All"
            textStyle={{color: 'black', textDecorationLine: 'none'}}
            onPress={(isChecked: boolean) => {
              if (isChecked) {
                setAlbums(gridData.map(item => item.title));
              } else {
                setAlbums([]);
              }
            }}
          />
          {error && <Text style={styles.error}>{JSON.stringify(error)}</Text>}
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            {gridData.map((grid, index) => (
              <View key={index} style={{width: '50%'}}>
                <Preview {...grid} updateFunc={updateAlbums} />
              </View>
            ))}
          </View>

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
