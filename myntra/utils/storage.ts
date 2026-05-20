import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  id:    'user_id',
  name:  'user_name',
  email: 'user_email',
  token: 'auth_token',
};

export async function saveUserData(
  id: string, name: string, email: string, token?: string
) {
  await AsyncStorage.multiSet([
    [KEYS.id,    id],
    [KEYS.name,  name],
    [KEYS.email, email],
    [KEYS.token, token || ''],
  ]);
}

export async function getUserData() {
  const pairs = await AsyncStorage.multiGet([KEYS.id, KEYS.name, KEYS.email, KEYS.token]);
  return {
    _id:   pairs[0][1] || '',
    name:  pairs[1][1] || '',
    email: pairs[2][1] || '',
    token: pairs[3][1] || '',
  };
}

export async function clearUserData() {
  await AsyncStorage.multiRemove([KEYS.id, KEYS.name, KEYS.email, KEYS.token]);
}