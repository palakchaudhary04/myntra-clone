const { Expo } = require('expo-server-sdk');
let expo = new Expo();

const sendNotification = async (userToken, title, message, data = {}) => {
  if (!Expo.isExpoPushToken(userToken)) return;

  const messages = [{
    to: userToken,
    sound: 'default',
    title: title,
    body: message,
    data: data, // Example: { url: '/orders' }
  }];

  await expo.sendPushNotificationsAsync(messages);
};

module.exports = sendNotification;