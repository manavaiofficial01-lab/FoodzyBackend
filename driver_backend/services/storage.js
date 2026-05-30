import AsyncStorage from '@react-native-async-storage/async-storage';


// SAVE TOKEN
export const saveToken = async (token) => {
  try {

    await AsyncStorage.setItem(
      'driverToken',
      token
    );

  } catch (error) {
    console.log(error);
  }
};


// GET TOKEN
export const getToken = async () => {
  try {

    return await AsyncStorage.getItem(
      'driverToken'
    );

  } catch (error) {
    console.log(error);
  }
};


// REMOVE TOKEN
export const removeToken = async () => {
  try {

    await AsyncStorage.removeItem(
      'driverToken'
    );

  } catch (error) {
    console.log(error);
  }
};