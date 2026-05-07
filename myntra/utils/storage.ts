import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store only works on native (iOS/Android).
// On web (localhost / Expo Web), we fall back to localStorage.

const setItem = async (key: string, value: string) => {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const deleteItem = async (key: string) => {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const saveUserData = async (
  _id: string,
  fullName: string,
  email: string
) => {
  await setItem("userid", _id);
  await setItem("userName", fullName);
  await setItem("userEmail", email);
};

export const getUserData = async () => {
  const _id = await getItem("userid");
  const name = await getItem("userName");
  const email = await getItem("userEmail");
  return { _id, name, email };
};

export const clearUserData = async () => {
  await deleteItem("userid");
  await deleteItem("userName");
  await deleteItem("userEmail");
};